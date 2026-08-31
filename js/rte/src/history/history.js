import {SelectionSnapshot} from '../selection/snapshot.js';

// Snapshot history for one surface. RTE leaves ordinary typing and deletion to
// the browser, so history cannot be an operation log: it observes every mutation
// regardless of its origin and stores the resulting content as a cloned fragment
// with a path-addressed selection that survives content replacement.
//
// Transactions provide the grouping boundaries. Ordinary input coalesces into
// one entry per interval; commands, paste, and drop each become one entry.
export class History {
    #surface;
    #entries = [];
    #index = -1;
    #limit;
    #coalesce;
    #observer;
    #timer = null;
    #dirty = false;
    #applying = false;
    #controller;
    #commands;

    constructor(surface, {limit = 100, coalesce = 400} = {}) {
        if (surface?.element?.nodeType !== Node.ELEMENT_NODE || typeof surface?.transact !== 'function') {
            throw new TypeError('History requires an editor surface');
        }
        if (!Number.isInteger(limit) || limit < 2) throw new RangeError('History limit must be an integer of at least 2');
        if (!Number.isFinite(coalesce) || coalesce < 0) {
            throw new RangeError('History coalescing must be a non-negative interval');
        }
        this.#surface = surface;
        this.#limit = limit;
        this.#coalesce = coalesce;
        this.#commands = Object.freeze({
            undo: step('historyUndo', 'ctrl+z', () => this.canUndo, () => this.undo()),
            redo: step('historyRedo', 'ctrl+y ctrl+shift+z', () => this.canRedo, () => this.redo()),
        });
        const root = surface.element;
        const view = root.ownerDocument.defaultView;
        this.#observer = new view.MutationObserver(this.#mutate);
        this.#observer.observe(root, {subtree: true, childList: true, attributes: true, characterData: true});
        this.#controller = new view.AbortController();
        const listen = {signal: this.#controller.signal};
        surface.addEventListener('u2-rte-beforechange', this.#boundary, listen);
        surface.addEventListener('u2-rte-change', this.#boundary, listen);
        surface.addEventListener('u2-rte-selectionchange', this.#selectionChange, listen);
        surface.addEventListener('u2-rte-deactivate', this.#deactivate, listen);
        surface.addEventListener('u2-rte-disconnect', this.#disconnect, listen);
        this.#push(this.#capture());
    }

    get surface() { return this.#surface; }
    get commands() { return this.#commands; }
    get length() { return this.#entries.length; }
    get index() { return this.#index; }
    get connected() { return !this.#controller.signal.aborted; }
    get canUndo() { return this.#index > 0 || this.#pull(); }
    get canRedo() { return this.#index < this.#entries.length - 1 && !this.#pull(); }

    undo() {
        return this.#go(-1);
    }

    redo() {
        return this.#go(1);
    }

    // Commits the current content as one entry. Unchanged content adds nothing,
    // so callers may flush at any boundary without producing duplicates.
    record() {
        if (this.#applying || !this.#surface.connected) return false;
        const dirty = this.#pull();
        this.#cancel();
        if (!dirty) return false;
        this.#dirty = false;
        this.#push(this.#capture());
        return true;
    }

    clear() {
        this.#cancel();
        this.#observer.takeRecords();
        this.#dirty = false;
        this.#entries = [];
        this.#index = -1;
        this.#push(this.#capture());
        return this;
    }

    dispose() {
        if (!this.connected) return;
        this.#cancel();
        this.#observer.disconnect();
        this.#controller.abort();
        this.#entries = [];
        this.#index = -1;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #go(step) {
        if (!this.#surface.connected) return false;
        // Uncommitted input becomes its own entry first, so undo leaves the
        // state the user actually sees instead of skipping past it.
        this.record();
        const next = this.#index + step;
        const entry = this.#entries[next];
        if (!entry) return false;
        this.#apply(entry);
        this.#index = next;
        this.#emit();
        return true;
    }

    #capture() {
        const element = this.#surface.element;
        const fragment = element.ownerDocument.createDocumentFragment();
        for (const node of element.childNodes) fragment.append(node.cloneNode(true));
        return {fragment, selection: this.#selection()};
    }

    #apply(entry) {
        this.#applying = true;
        try {
            const clone = entry.fragment.cloneNode(true);
            this.#surface.element.replaceChildren(...clone.childNodes);
            this.#restore(entry.selection);
        } finally {
            // Restoring is not an edit: its own records never enter history.
            this.#observer.takeRecords();
            this.#dirty = false;
            this.#applying = false;
        }
        this.#surface.capture();
    }

    #push(entry) {
        this.#entries.splice(this.#index + 1);
        this.#entries.push(entry);
        if (this.#entries.length > this.#limit) this.#entries.shift();
        this.#index = this.#entries.length - 1;
        this.#emit();
    }

    #selection() {
        const root = this.#surface.element;
        const snapshot = SelectionSnapshot.capture(this.#surface.core.selection, root) || this.#surface.selection;
        if (!snapshot?.valid()) return null;
        const range = snapshot.range();
        const start = address(root, range.startContainer, range.startOffset);
        if (!start) return null;
        const end = range.collapsed ? start : address(root, range.endContainer, range.endOffset);
        return end ? {start, end, backward: snapshot.backward} : null;
    }

    #restore(saved) {
        const root = this.#surface.element;
        const start = saved && locate(root, saved.start);
        const end = saved && locate(root, saved.end);
        if (!start || !end) return false;
        const range = root.ownerDocument.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return new SelectionSnapshot(root, range, saved.backward).restore(this.#surface.core.selection);
    }

    #pull() {
        if (this.#edited(this.#observer.takeRecords())) this.#mark();
        return this.#dirty;
    }

    // The host element belongs to the application, not to the edited content:
    // an entry restores children only, so its own attributes must not record.
    #edited(records) {
        const root = this.#surface.element;
        return records.some(record => record.type !== 'attributes' || record.target !== root);
    }

    // Continuous input keeps one open interval instead of restarting it, so a
    // long paragraph still becomes several undo steps.
    #mark() {
        this.#dirty = true;
        if (this.#timer === null) this.#timer = setTimeout(this.#flush, this.#coalesce);
    }

    #cancel() {
        if (this.#timer === null) return;
        clearTimeout(this.#timer);
        this.#timer = null;
    }

    #emit() {
        this.#surface.emit('u2-rte-history', {history: this});
    }

    #flush = () => {
        this.#timer = null;
        this.record();
    };

    #mutate = records => {
        if (!this.#applying && this.#edited(records)) this.#mark();
    };

    // A transaction that is not ordinary input is its own undo step: the state
    // before it and the state after it each become one entry.
    #boundary = event => {
        if (!this.#applying && !coalesced(event)) this.record();
    };

    // An entry captured before the surface had a selection adopts the first one
    // it sees, so undoing back to it restores a caret too.
    #selectionChange = () => {
        if (this.#applying || this.#dirty) return;
        const entry = this.#entries[this.#index];
        if (entry && !entry.selection) entry.selection = this.#selection();
    };

    #deactivate = () => {
        this.record();
    };

    #disconnect = () => {
        this.dispose();
    };
}

// Like every other command, a history step acts only where the surface owns the
// selection. An editor the user has left must not change under a shortcut, and
// a toolbar that still holds a saved selection passes it as the edit range.
function step(inputType, shortcut, available, run) {
    return {
        inputTypes: [inputType],
        shortcut,
        transaction: false,
        enabled: edit => !!edit.range && available(),
        run,
    };
}

function coalesced(event) {
    return event.detail.transaction?.options.trigger === 'input';
}

// A selection address survives content replacement because it names positions
// by child index instead of by node identity.
function address(root, node, offset) {
    const path = [];
    for (let current = node; current !== root; current = current.parentNode) {
        const parent = current?.parentNode;
        if (!parent) return null;
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    }
    return {path, offset};
}

function locate(root, {path, offset}) {
    let node = root;
    for (const index of path) {
        node = node.childNodes[index];
        if (!node) return null;
    }
    const length = typeof node.length === 'number' ? node.length : node.childNodes.length;
    return {node, offset: Math.min(offset, length)};
}
