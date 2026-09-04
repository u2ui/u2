import {enabled} from '../config/config.js';
import {interactiveAround} from '../browser/interactive.js';
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
    #unfocused = false;
    #press = null;
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
        root.addEventListener('focusout', this.#focusOut, listen);
        // A press answers for every focus until it is over: one drag can hand the
        // focus back more than once. A key taking over ends it too, so what is
        // left of a release that never arrived cannot answer for the keyboard.
        root.addEventListener('pointerdown', this.#pointerDown, listen);
        for (const type of ['pointerup', 'pointercancel', 'keydown']) {
            root.addEventListener(type, this.#pointerDone, listen);
        }
        root.addEventListener('click', this.#click, listen);
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
        // A selection is not a session: once the focus has left the editor, only
        // focus brings it back. Engines leave a selection inside an editable that
        // nobody focused — clicking beside one does that — and a toolbar over a
        // caret the keyboard cannot reach is worse than no toolbar. What the
        // surface captured, it keeps either way.
        if (this.#unfocused && this.#active !== surface) return null;
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
        const path = event.composedPath();
        if (path.some(node => this.#retained.has(node))) {
            this.#unfocused = false;
            return;
        }
        const editable = path.find(node =>
            node?.nodeType === Node.ELEMENT_NODE && isEditingBoundary(node)
        );
        // Focus that went somewhere else entirely ends the session: retained UI
        // is already excluded above, so what is left is not the editor's, and
        // everything drawn for it has to go with it.
        if (!editable || !isEditableHost(editable)) {
            this.#unfocused = true;
            this.activate(null);
            return;
        }
        let surface = this.#elements.get(editable);
        if (!surface && this.#options.auto && enabled(editable)) surface = this.add(editable);
        // An engine gives the focus to the nearest editable when a press lands
        // beside one: an inline host collects its whole line. A press that did
        // not land in this surface is nobody starting to edit it, and the caret
        // it would leave behind is one no one asked for.
        //
        // Taking it back is the one thing here that reaches into the document:
        // the element really is focused for a moment, so the page sees a
        // focus/blur pair it did not ask for, and anything listening for either
        // on that element — a host's own handler, a css `:focus` rule — sees it
        // too. Leaving it focused instead is worse: a caret that types into a
        // surface with no session behind it.
        if (surface && this.#press && !this.#press.path.includes(surface.element)) {
            this.#unfocused = true;
            this.activate(null);
            // Handing the focus back once per press. An engine that answers a
            // blur by focusing again — the selection is still in there, after
            // all — would otherwise trade focus with the editor for as long as
            // the button is down, and the session stays refused either way.
            if (!this.#press.handed) {
                this.#press.handed = true;
                editable.blur();
            }
            return;
        }
        this.#unfocused = !surface;
        this.activate(surface || null);
    };

    // Focus falling back to the document is the one way a session ends without
    // a focus event to end it: nothing is focused, so nothing announces it.
    // A related target inside a surface or in retained UI is `#focus`'s to
    // decide — deactivating here would end a session that is only moving.
    #focusOut = event => {
        if (this.#owns(event.relatedTarget)) return;
        this.#unfocused = true;
        this.activate(null);
    };

    // The editor's world: one of its surfaces, or UI it retains.
    #owns(node) {
        return !!node && (this.retains(node) || this.#elements.has(editingHost(node)));
    }

    #pointerDown = event => {
        const path = event.composedPath();
        // A press in retained ui is the editor's own: its controls hand the focus back to the
        // surface they act on, and refusing that session would take the toolbar away mid-command.
        this.#press = path.some(node => this.#retained.has(node)) ? null : {path, handed: false};
        const editing = this.#editing(path[0]);
        // The right button opens a menu about what is selected; moving the
        // selection to what it was aimed at is what makes the menu useless.
        if (event.button === 2 && editing) event.preventDefault();
        // The drag has to be off before this very press is acted on, which is
        // what a capturing listener is early enough for. It stays off: a link
        // wrapping editable content is not one anybody drags on purpose.
        const around = interactiveAround(editing);
        if (around) around.draggable = false;
    };

    // The press belonged to the text, and so does its release.
    #click = event => {
        if (interactiveAround(this.#editing(event.composedPath()[0]))) event.preventDefault();
    };

    // The editing host a node sits in, if this core is the editor of it.
    #editing(node) {
        const host = editingHost(node);
        if (!host) return null;
        return this.#elements.has(host) || this.#options.auto && enabled(host) ? host : null;
    }

    #pointerDone = () => {
        this.#press = null;
    };

    #selectionChange = () => {
        this.sync();
    };

    #emit(type, detail = {}) {
        const Event = this.#document.defaultView.CustomEvent;
        return this.dispatchEvent(new Event(type, {detail: {core: this, ...detail}}));
    }
}
