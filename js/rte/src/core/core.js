import {enabled} from '../config/config.js';
import {editingHost, isEditableHost, isEditingBoundary} from '../selection/ownership/ownership.js';
import {Surface} from '../surface/surface.js';

export class Rte extends EventTarget {
    #root;
    #document;
    #options;
    #surfaces = new Set();
    #elements = new WeakMap();
    #retained = new Set();
    #active = null;
    #controller;

    constructor(root = document, options = {}) {
        super();
        const isDocument = root?.nodeType === Node.DOCUMENT_NODE;
        const isShadow = root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE && root.host;
        if (!isDocument && !isShadow) throw new TypeError('RTE root must be a Document or ShadowRoot');
        this.#root = root;
        this.#document = isDocument ? root : root.ownerDocument;
        this.#options = Object.freeze({auto: options.auto !== false});
        this.#controller = new this.#document.defaultView.AbortController();
        const listen = {capture: true, signal: this.#controller.signal};
        root.addEventListener('focus', this.#focus, listen);
        root.addEventListener('focusin', this.#focus, listen);
        this.#document.addEventListener('selectionchange', this.#selectionChange, {signal: this.#controller.signal});
    }

    get root() { return this.#root; }
    get options() { return this.#options; }
    get active() { return this.#active; }
    get surfaces() { return [...this.#surfaces]; }
    get selection() { return this.#root.getSelection?.() || this.#document.getSelection(); }

    // Retained UI may receive focus without deactivating the current surface.
    // When it temporarily has to live inside a top-layer editing host, content
    // readers also use this boundary to leave it out of the document.
    retain(element) {
        if (element?.nodeType !== Node.ELEMENT_NODE) throw new TypeError('Retained UI must be an element');
        if (element.ownerDocument !== this.#document) throw new RangeError('Retained UI must belong to the core document');
        this.#retained.add(element);
        return element;
    }

    release(element) {
        return this.#retained.delete(element);
    }

    retains(node) {
        for (let current = node; current;) {
            if (this.#retained.has(current)) return true;
            const root = current.getRootNode?.();
            current = current.parentNode || root?.host || null;
        }
        return false;
    }

    add(element, options) {
        if (!isEditableHost(element)) {
            throw new TypeError('RTE surfaces must be explicit contenteditable elements');
        }
        if (element.getRootNode() !== this.#root) throw new RangeError('RTE surface must belong to the core root');
        const current = this.#elements.get(element);
        if (current) return current;
        const surface = new Surface(this, element, options);
        this.#elements.set(element, surface);
        this.#surfaces.add(surface);
        this.#emit('u2-rte-add', {surface});
        return surface;
    }

    get(element) {
        return this.#elements.get(element) || null;
    }

    delete(target) {
        const surface = target instanceof Surface ? target : this.#elements.get(target);
        if (!surface || !this.#surfaces.has(surface)) return false;
        if (this.#active === surface) this.activate(null);
        this.#surfaces.delete(surface);
        this.#elements.delete(surface.element);
        surface.disconnect();
        this.#emit('u2-rte-delete', {surface});
        return true;
    }

    activate(surface) {
        if (surface && !this.#surfaces.has(surface)) throw new RangeError('Active surface must belong to this core');
        if (surface === this.#active) return surface;
        this.#active?.activate(false);
        this.#active = surface;
        surface?.activate();
        this.#emit('u2-rte-activechange', {surface});
        return surface;
    }

    sync() {
        const selection = this.selection;
        const editable = editingHost(selection?.anchorNode);
        if (!editable) return null;
        const surface = this.#elements.get(editable);
        if (!surface || !selection.focusNode || !surface.element.contains(selection.focusNode)) {
            this.activate(null);
            return null;
        }
        if (!surface.capture(selection)) {
            this.activate(null);
            return null;
        }
        this.activate(surface);
        return surface;
    }

    dispose() {
        if (this.#controller.signal.aborted) return;
        this.#controller.abort();
        for (const surface of [...this.#surfaces]) this.delete(surface);
        this.#retained.clear();
        this.#emit('u2-rte-dispose');
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    #focus = event => {
        if (event.composedPath().some(node => this.#retained.has(node))) return;
        const editable = event.composedPath().find(node =>
            node?.nodeType === Node.ELEMENT_NODE && isEditingBoundary(node)
        );
        // Focus that went somewhere else entirely ends the session: retained UI
        // is already excluded above, so what is left is not the editor's, and
        // everything drawn for it has to go with it.
        if (!editable) {
            this.activate(null);
            return;
        }
        if (!isEditableHost(editable)) {
            this.activate(null);
            return;
        }
        let surface = this.#elements.get(editable);
        if (!surface && this.#options.auto && enabled(editable)) surface = this.add(editable);
        this.activate(surface || null);
    };

    #selectionChange = () => {
        this.sync();
    };

    #emit(type, detail = {}) {
        const Event = this.#document.defaultView.CustomEvent;
        return this.dispatchEvent(new Event(type, {detail: {core: this, ...detail}}));
    }
}
