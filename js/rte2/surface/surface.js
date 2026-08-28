import {config} from '../config/config.js';
import {SelectionSnapshot} from '../selection/snapshot.js';
import {Transaction} from '../transaction/transaction.js';

export class Surface extends EventTarget {
    #core;
    #element;
    #options;
    #selection = null;
    #transaction = null;
    #active = false;
    #connected = true;

    constructor(core, element, options = {}) {
        super();
        this.#core = core;
        this.#element = element;
        this.#options = Object.freeze({...options});
    }

    get core() { return this.#core; }
    get element() { return this.#element; }
    get options() { return this.#options; }
    get config() { return config(this.#element); }
    get selection() { return this.#selection; }
    get transaction() { return this.#transaction; }
    get active() { return this.#active; }
    get connected() { return this.#connected; }

    capture(selection = this.#core.selection) {
        const snapshot = SelectionSnapshot.capture(selection, this.#element);
        if (!snapshot) return null;
        if (this.#selection?.equals(snapshot)) return this.#selection;
        this.#selection = snapshot;
        this.emit('u2-rte-selectionchange', {selection: snapshot});
        return snapshot;
    }

    restore() {
        return this.#selection?.restore(this.#core.selection) || false;
    }

    transact(change, options) {
        if (!this.#connected) throw new DOMException('The surface is disconnected', 'InvalidStateError');
        if (this.#transaction) return change(this.#transaction);
        const transaction = new Transaction(this, options);
        this.#transaction = transaction;
        try {
            return transaction.run(change);
        } finally {
            this.#transaction = null;
        }
    }

    activate(active = true) {
        if (this.#active === active) return this;
        this.#active = active;
        this.emit(active ? 'u2-rte-activate' : 'u2-rte-deactivate');
        return this;
    }

    // The DOM host is notified first: modules listening on the surface act on
    // an event, so observers would otherwise see the consequence before it.
    emit(type, detail = {}, options = {}) {
        const init = {detail: {surface: this, ...detail}, cancelable: options.cancelable};
        const Event = this.#element.ownerDocument.defaultView.CustomEvent;
        const dom = this.#element.dispatchEvent(new Event(type, {...init, bubbles: true, composed: true}));
        const local = this.dispatchEvent(new Event(type, init));
        return local && dom;
    }

    destroy() {
        return this.#core.delete(this);
    }

    disconnect() {
        if (!this.#connected) return;
        this.activate(false);
        this.#connected = false;
        this.#selection = null;
        this.emit('u2-rte-disconnect');
    }
}
