export class Transaction {
    #surface;
    #options;
    #dirty = new Set();
    #state = 'new';
    #selectionBefore = null;
    #selectionAfter = null;

    constructor(surface, options = {}) {
        this.#surface = surface;
        this.#options = Object.freeze({...options});
    }

    get surface() { return this.#surface; }
    get options() { return this.#options; }
    get state() { return this.#state; }
    get dirty() { return [...this.#dirty]; }
    get selectionBefore() { return this.#selectionBefore; }
    get selectionAfter() { return this.#selectionAfter; }

    touch(node) {
        if (node !== this.#surface.element && !this.#surface.element.contains(node)) {
            throw new RangeError('Dirty nodes must belong to the transaction surface');
        }
        this.#dirty.add(node);
        return this;
    }

    run(change) {
        if (this.#state !== 'new') throw new DOMException('A transaction can run only once', 'InvalidStateError');
        this.#surface.restore();
        this.#selectionBefore = this.#surface.capture() || this.#surface.selection;
        if (!this.#surface.emit('u2-rte-beforechange', {transaction: this}, {cancelable: true})) {
            this.#state = 'canceled';
            return;
        }
        this.#state = 'running';
        try {
            const result = change(this);
            if (result?.then) throw new TypeError('Editor transactions must be synchronous');
            this.#selectionAfter = this.#surface.capture();
            if (!this.#selectionAfter && this.#selectionBefore?.restore()) {
                this.#selectionAfter = this.#surface.capture();
            }
            this.#state = 'committed';
            this.#surface.emit('u2-rte-change', {transaction: this});
            return result;
        } catch (error) {
            this.#state = 'failed';
            this.#surface.emit('u2-rte-error', {transaction: this, error});
            throw error;
        }
    }
}
