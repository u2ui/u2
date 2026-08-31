// One shadow root per editor for everything the editor draws: its toolbar, its
// contextual handles, its forms and dialogs.
//
// An editor is chrome inside someone else's document. Sharing one encapsulated
// root means the page's own CSS cannot reach any of it, none of its styles can
// leak out, and the application sees a single element rather than one per piece
// of UI. Each piece still owns its own stylesheet; the root only holds them.
export class Chrome {
    #host;
    #root;
    #styles = new Set();
    #connected = true;

    constructor(root, {name = 'chrome'} = {}) {
        const isDocument = root?.nodeType === Node.DOCUMENT_NODE;
        const isShadow = root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
        if (!isDocument && !isShadow) throw new TypeError('Editor chrome requires a document or shadow root');
        const document = isDocument ? root : root.ownerDocument;
        this.#host = document.createElement('div');
        this.#host.dataset.u2RteChrome = name;
        this.#root = this.#host.attachShadow({mode: 'open'});
        const style = document.createElement('style');
        // The host is inert ground: only what a piece of UI places inside it
        // takes the pointer.
        style.textContent = ':host { all: initial; pointer-events: none; position: fixed; inset: 0; }';
        this.#root.append(style);
        (isDocument ? document.body || document.documentElement : root).append(this.#host);
        if (typeof this.#host.showPopover === 'function') {
            this.#host.popover = 'manual';
            this.#host.showPopover();
        }
    }

    get element() { return this.#host; }
    get root() { return this.#root; }
    get connected() { return this.#connected; }

    // Registers one stylesheet under a key, once, however often it is offered.
    style(key, css) {
        if (this.#styles.has(key)) return this;
        this.#styles.add(key);
        const style = this.#host.ownerDocument.createElement('style');
        style.dataset.u2RteStyle = key;
        style.textContent = css;
        this.#root.append(style);
        return this;
    }

    dispose() {
        if (!this.#connected) return;
        this.#host.remove();
        // Emptying the root as well: a detached shadow tree still answers
        // queries, and a disposed editor must have nothing left to find.
        this.#root.replaceChildren();
        this.#styles.clear();
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }
}
