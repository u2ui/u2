import {Edit} from './edit.js';
import {applyMark, removeMark, toggleMark} from './mark.js';
import {isPlainTextHost} from '../selection/ownership/ownership.js';
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
    }

    get surface() { return this.#surface; }
    get insertText() { return this.#insertText; }

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
                else this.#entries.set(key, {active, apply, remove, adapter, mark});
                return active;
            },
        };
    }

    clear() {
        this.#selection = null;
        this.#entries.clear();
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
        return edit?.surface === this.#surface && !isPlainTextHost(this.#surface.element);
    }

    #assert(edit) {
        if (!this.#owns(edit)) throw new RangeError('Pending marks belong to one rich-text surface');
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
    for (let element = parentElement(edit.range.start.node); element && element !== edit.element; element = element.parentElement) {
        if (element.hasAttribute('contenteditable') || edit.model.atomic(element)) return false;
    }
    if (removing) return true;
    const node = edit.range.start.node;
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    return edit.model.allows(parent, adapter.render(mark, edit.document));
}

function parentElement(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
