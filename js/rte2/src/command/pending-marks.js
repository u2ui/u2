import {Edit} from './edit.js';
import {applyMark, removeMark, toggleMark} from './mark.js';
import {editingHost, elementOf, isEditingBoundary, isPlainTextHost} from '../selection/ownership/ownership.js';
import {Mark} from '../mark/mark.js';
import {Point} from '../selection/point/point.js';

// Pending mark overrides for one surface. They remain valid only while the
// surface keeps the same captured selection, so moving the caret invalidates
// them without another selection listener.
export class PendingMarks {
    #surface;
    #selection = null;
    #entries = new Map();
    #insertText;
    #composition = null;
    #controller;

    constructor(surface) {
        if (surface?.element?.nodeType !== Node.ELEMENT_NODE || typeof surface?.capture !== 'function') {
            throw new TypeError('Pending marks require an editor surface');
        }
        this.#surface = surface;
        this.#insertText = {
            inputTypes: ['insertText'],
            enabled: edit => this.#current(edit) && typeof edit.data === 'string' && !!edit.data,
            run: edit => this.#insert(edit),
        };
        const root = surface.element;
        this.#controller = new root.ownerDocument.defaultView.AbortController();
        const listen = {signal: this.#controller.signal};
        root.addEventListener('compositionstart', this.#compositionStart, listen);
        root.addEventListener('compositionend', this.#compositionEnd, listen);
        surface.addEventListener('u2-rte-disconnect', () => this.dispose(), listen);
    }

    get surface() { return this.#surface; }
    get insertText() { return this.#insertText; }
    get connected() { return !this.#controller.signal.aborted; }

    toggle(adapter, value) {
        const hasValue = arguments.length > 1;
        const toggle = hasValue ? toggleMark(adapter, value) : toggleMark(adapter);
        const apply = hasValue ? applyMark(adapter, value) : applyMark(adapter);
        const remove = hasValue ? removeMark(adapter, value) : removeMark(adapter);
        const mark = value instanceof Mark ? value : adapter.type.create(hasValue ? value : true);
        const key = {};
        return {
            enabled: edit => this.#owns(edit) && (!!edit.range && (edit.range.collapsed
                ? markable(edit, adapter, mark, toggle.state(edit) === true)
                : toggle.enabled(edit))),
            state: edit => this.#entry(edit, key)?.active ?? toggle.state(edit),
            run: edit => {
                this.#assert(edit);
                if (!edit.range?.collapsed) {
                    this.clear();
                    return toggle.run(edit);
                }
                if (!markable(edit, adapter, mark, toggle.state(edit) === true)) return;
                const base = toggle.state(edit);
                const active = (this.#entry(edit, key)?.active ?? base) !== true;
                this.#prepare(edit);
                if (active === base) this.#entries.delete(key);
                else this.#entries.set(key, {active, apply, remove, adapter, mark, model: edit.model});
                return active;
            },
        };
    }

    clear() {
        this.#selection = null;
        this.#entries.clear();
        this.#composition = null;
    }

    dispose() {
        if (!this.connected) return;
        this.#controller.abort();
        this.clear();
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #insert(edit) {
        this.#assert(edit);
        const entries = [...this.#entries.values()];
        const text = insert(edit, edit.data);
        this.clear();
        for (const entry of entries) {
            const current = new Edit(this.#surface, edit.transaction, {
                model: edit.model,
                inputType: edit.inputType,
                data: edit.data,
            });
            (entry.active ? entry.apply : entry.remove).run(current);
        }
        const selection = this.#surface.core.selection;
        const range = selection.getRangeAt(0);
        edit.select(Point.fromRange(range, 'end'));
        return text;
    }

    #prepare(edit) {
        if (this.#selection !== this.#surface.selection) this.#entries.clear();
        this.#selection = this.#surface.selection;
    }

    #current(edit) {
        return this.#owns(edit)
            && edit.range?.collapsed
            && [...this.#entries.values()].every(entry => markable(edit, entry.adapter, entry.mark, !entry.active))
            && this.#selection === this.#surface.selection
            && this.#entries.size > 0;
    }

    #entry(edit, key) {
        return this.#current(edit) ? this.#entries.get(key) : null;
    }

    #owns(edit) {
        return this.connected && edit?.surface === this.#surface && !isPlainTextHost(this.#surface.element);
    }

    #assert(edit) {
        if (!this.#owns(edit)) throw new RangeError('Pending marks belong to one rich-text surface');
    }

    #compositionStart = event => {
        if (!this.#ownsEvent(event)) return;
        const edit = new Edit(this.#surface);
        const entries = [...this.#entries.values()];
        if (!edit.range?.collapsed || this.#selection !== this.#surface.selection || !entries.length) return;
        this.#composition = {
            start: edit.range.start.withAffinity('backward'),
            entries,
        };
    };

    #compositionEnd = event => {
        if (!this.#ownsEvent(event) || !this.#composition) return;
        const {start, entries} = this.#composition;
        this.#composition = null;
        const current = new Edit(this.#surface).range;
        if (!current?.collapsed || !start.within(this.#surface.element)) {
            this.clear();
            return;
        }
        const end = current.end.withAffinity('forward');
        if (start.compare(end) === 0) {
            this.#selection = this.#surface.capture();
            return;
        }
        if (start.compare(end) > 0) {
            this.clear();
            return;
        }
        const range = start.range();
        range.setEnd(end.node, end.offset);
        if (!range.toString()) {
            this.clear();
            return;
        }
        this.clear();
        this.#surface.transact(transaction => {
            let active = range;
            for (const entry of entries) {
                const edit = new Edit(this.#surface, transaction, {
                    model: entry.model,
                    range: active,
                    inputType: 'insertCompositionText',
                    data: typeof event.data === 'string' ? event.data : null,
                });
                (entry.active ? entry.apply : entry.remove).run(edit);
                active = this.#surface.core.selection.getRangeAt(0).cloneRange();
            }
            const edit = new Edit(this.#surface, transaction, {range: active});
            edit.select(edit.range.end);
        }, {trigger: 'input', inputType: 'insertCompositionText', composition: true});
    };

    #ownsEvent(event) {
        const target = event.composedPath()[0];
        return target === this.#surface.element || editingHost(target) === this.#surface.element;
    }
}

function insert(edit, data) {
    const start = edit.range.start.withAffinity('backward');
    const end = edit.range.end.withAffinity('forward');
    edit.map.add(start).add(end);
    const node = start.node;
    let text;
    if (node.nodeType === Node.TEXT_NODE) {
        text = node;
        edit.map.insertText(node, start.offset, data);
    } else {
        text = edit.document.createTextNode(data);
        edit.map.insert(node, start.offset, text);
    }
    edit.transaction.touch(text.parentNode);
    edit.select(edit.map.get(start), edit.map.get(end));
    return text;
}

function markable(edit, adapter, mark, removing) {
    if (!edit.range?.collapsed) return false;
    for (let element = elementOf(edit.range.start.node); element && element !== edit.element; element = element.parentElement) {
        if (isEditingBoundary(element) || edit.model.atomic(element)) return false;
    }
    if (removing) return true;
    const node = edit.range.start.node;
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    return edit.model.allows(parent, adapter.render(mark, edit.document));
}

