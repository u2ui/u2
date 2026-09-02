const NAME = 'u2-rte-selection';
// System colours, so what stands in for the selection looks like one. In a
// layer, so a page that wants its own answer simply writes an ordinary rule.
const STYLE = `@layer u2-rte {
::highlight(${NAME}) { background-color: Highlight; color: HighlightText; }
}`;

// A browser paints a selection only where the focus is, so the moment a form of
// the editor's own takes the caret, the text it is about to change stops looking
// selected. The surface's saved selection is drawn in its place: the range the
// commands act on is the range the eye follows.
//
// It is the editor's, not one form's: a link address, an image's name and
// anything else that takes focus all leave the same gap behind them.
export class SelectionHighlight {
    #core;
    #document;
    #style = null;
    #controller;
    #connected = true;

    constructor(core) {
        if (!core?.root || typeof core?.addEventListener !== 'function') {
            throw new TypeError('A selection highlight requires an editor core');
        }
        const root = core.root;
        this.#core = core;
        this.#document = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument;
        this.#controller = new this.#document.defaultView.AbortController();
        const listen = {capture: true, signal: this.#controller.signal};
        // Surface events bubble out composed, so one listener covers every
        // surface the core owns, whichever of them is being edited.
        for (const type of ['focusin', 'focusout', 'u2-rte-selectionchange', 'u2-rte-change']) {
            root.addEventListener(type, this.#update, listen);
        }
        core.addEventListener('u2-rte-activechange', this.#update, {signal: this.#controller.signal});
        this.#update();
    }

    get connected() { return this.#connected; }

    refresh() {
        const surface = this.#core.active;
        const selection = surface?.selection;
        const highlights = this.#document.defaultView.CSS?.highlights;
        if (!highlights) return false;
        // Not while the text itself has the focus: the browser is already
        // painting that selection, and painting it twice can only disagree.
        // `activeElement` of the core's own root: in a shadow tree the document
        // reports the host, which says nothing about what is focused inside it.
        if (!selection || selection.collapsed || surface.element.contains(this.#core.root.activeElement)) {
            highlights.delete(NAME);
            return false;
        }
        this.#ensure();
        highlights.set(NAME, new this.#document.defaultView.Highlight(selection.range()));
        return true;
    }

    dispose() {
        if (!this.#connected) return;
        this.#controller.abort();
        this.#document.defaultView.CSS?.highlights?.delete(NAME);
        this.#style?.remove();
        this.#style = null;
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    // The rule belongs to the tree that holds the text, not to the editor's own
    // shadow root: a highlight is painted on the range's own nodes.
    #ensure() {
        if (this.#style) return;
        const root = this.#core.root;
        const style = this.#document.createElement('style');
        style.dataset.u2RteHighlight = '';
        style.textContent = STYLE;
        (root.nodeType === Node.DOCUMENT_NODE ? this.#document.head || this.#document.documentElement : root).append(style);
        this.#style = style;
    }

    #update = () => this.refresh();
}
