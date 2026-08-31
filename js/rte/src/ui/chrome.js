// One shadow root per editor for everything the editor draws: its toolbar, its
// contextual handles, its forms and dialogs.
//
// An editor is chrome inside someone else's document. Sharing one encapsulated
// root means the page's own CSS cannot reach any of it, none of its styles can
// leak out, and the application sees a single element rather than one per piece
// of UI. Each piece owns its own layout; what they share is one skin, `.panel`,
// because to the eye the editor's chrome is one thing and not five.
export class Chrome {
    #host;
    #root;
    #home;
    #context;
    #document;
    #target = null;
    #styles = new Set();
    #controller;
    #observer;
    #drawing;
    #connected = true;

    constructor(root, {name = 'chrome'} = {}) {
        const isDocument = root?.nodeType === Node.DOCUMENT_NODE;
        const isShadow = root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
        if (!isDocument && !isShadow) throw new TypeError('Editor chrome requires a document or shadow root');
        const document = isDocument ? root : root.ownerDocument;
        this.#context = root;
        this.#document = document;
        this.#host = document.createElement('div');
        this.#host.dataset.u2RteChrome = name;
        this.#host.contentEditable = 'false';
        this.#root = this.#host.attachShadow({mode: 'open'});
        const style = document.createElement('style');
        // The host is inert ground: only what a piece of UI places inside it
        // takes the pointer.
        //
        // Important, because a normal declaration in a shadow tree loses to the
        // outer document for the host element: a page rule as ordinary as
        // `[popover] { border: solid }` would otherwise draw a frame around the
        // whole editor. Important declarations reverse that order, so this is
        // what makes the host unreachable rather than merely encapsulated.
        style.textContent = `
:host {
    all: initial !important;
    /* The chrome's own text size lives here, and everything inside measures
       itself in em against it — one knob, no arithmetic. Page-relative units
       would instead let a site's root font resize the editor's furniture by
       accident. Important like the rest of the reset, because a rule in the
       outer document outranks one from this shadow tree; the size stays settable
       all the same, because "all" does not touch custom properties and the host
       inherits them from the page. */
    font: var(--u2-rte-ui-size, 14px)/1.2 system-ui, sans-serif !important;
    inset: 0 !important;
    pointer-events: none !important;
    position: fixed !important;
}
/* A part states its own display, and an id beats any rule that would hide it —
   so hiding says so outright, once, for everything drawn in here. */
[hidden] { display: none !important; }
.panel {
    backdrop-filter: blur(.57em);
    background: color-mix(in srgb, Canvas 92%, transparent);
    border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
    border-radius: .51em;
    box-shadow: 0 .34em 1.14em #0006;
    color: CanvasText;
    inset: auto;
    margin: 0;
    padding: .23em;
    pointer-events: auto;
    position: fixed;
    z-index: 2147483647;

    button, input, select { color: inherit; font: inherit; }
    button, select { background: transparent; border: 0; }
    :disabled { opacity: .4; }
}`;
        this.#root.append(style);
        this.#home = isDocument ? document.body || document.documentElement : root;
        this.#home.append(this.#host);
        if (typeof this.#host.showPopover === 'function') {
            this.#host.popover = 'manual';
            this.#host.showPopover();
        }
        this.#controller = new document.defaultView.AbortController();
        const listen = {capture: true, signal: this.#controller.signal};
        for (const type of ['toggle', 'fullscreenchange']) {
            document.addEventListener(type, this.#topLayerChange, listen);
            if (!isDocument) root.addEventListener(type, this.#topLayerChange, listen);
        }
        // Dialogs expose their open state synchronously as an attribute, but
        // current engines do not all dispatch their newer toggle event yet.
        this.#observer = new document.defaultView.MutationObserver(this.#topLayerChange);
        // Whatever the editor draws is the most recent thing the user triggered,
        // so it belongs in front of anything the page put in the top layer before.
        this.#drawing = new document.defaultView.MutationObserver(records => {
            if (records.some(record => !record.target.hidden)) this.raise();
        });
        this.#drawing.observe(this.#root, {subtree: true, attributes: true, attributeFilter: ['hidden']});
    }

    get element() { return this.#host; }
    get root() { return this.#root; }
    get target() { return this.#target; }
    get connected() { return this.#connected; }

    // Follows the target only across native top-layer boundaries. In ordinary
    // content the chrome stays in its original document or shadow root.
    follow(target = null) {
        if (target !== null && target?.nodeType !== Node.ELEMENT_NODE) {
            throw new TypeError('Editor chrome can follow only an element or null');
        }
        if (target && (target.ownerDocument !== this.#document || target.getRootNode() !== this.#context)) {
            throw new RangeError('Editor chrome target must belong to its root');
        }
        this.#target = target;
        this.#observer.disconnect();
        for (let element = target; element?.nodeType === Node.ELEMENT_NODE; element = composedParent(element)) {
            this.#observer.observe(element, {attributes: true, attributeFilter: ['open']});
        }
        this.#place();
        return this;
    }

    // Registers one stylesheet under a key, once, however often it is offered.
    style(key, css) {
        if (!this.#connected || this.#styles.has(key)) return this;
        this.#styles.add(key);
        const style = this.#document.createElement('style');
        style.id = `${key}-style`;
        style.textContent = css;
        this.#root.append(style);
        return this;
    }

    // One node and one stylesheet under one name. The key is the element's id, so
    // a piece of chrome writes `#link input` and is never named twice; inside an
    // encapsulated root shared by nothing else, that is as unique as it gets.
    part(key, css = '', tag = 'div') {
        if (this.#root.getElementById(key)) throw new RangeError(`Editor chrome already draws: ${key}`);
        const element = this.#document.createElement(tag);
        element.id = key;
        if (css) this.style(key, css);
        this.#root.append(element);
        return element;
    }

    dispose() {
        if (!this.#connected) return;
        this.#controller.abort();
        this.#observer.disconnect();
        this.#drawing.disconnect();
        this.#host.remove();
        // Emptying the root as well: a detached shadow tree still answers
        // queries, and a disposed editor must have nothing left to find.
        this.#root.replaceChildren();
        this.#styles.clear();
        this.#target = null;
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }

    // Back to the front of the top layer, which is ordered by when each member
    // was shown. Two manual popovers that never close — an editor's chrome and a
    // host application's own menu — would otherwise keep the order they happened
    // to be created in, whatever is being used right now.
    raise() {
        if (!this.#connected || typeof this.#host.showPopover !== 'function') return false;
        if (!this.#host.matches(':popover-open')) return this.#place();
        this.#host.hidePopover();
        this.#host.showPopover();
        return true;
    }

    #place() {
        if (!this.#connected) return false;
        const parent = topLayer(this.#target) || this.#home;
        if (parent === this.#host.parentNode) {
            if (typeof this.#host.showPopover === 'function' && !this.#host.matches(':popover-open')) {
                this.#host.showPopover();
            }
            return false;
        }
        if (this.#host.matches(':popover-open')) this.#host.hidePopover();
        parent.append(this.#host);
        if (typeof this.#host.showPopover === 'function') this.#host.showPopover();
        return true;
    }

    #topLayerChange = () => this.#place();
}

// The closest boundary is the one that owns the target's current top-layer
// context. Walking through shadow hosts keeps the rule identical for document
// and ShadowRoot editors.
export function topLayer(target) {
    for (let element = target; element?.nodeType === Node.ELEMENT_NODE; element = composedParent(element)) {
        for (const selector of [':fullscreen', ':modal', ':popover-open']) {
            try {
                if (element.matches(selector)) return element;
            } catch {
                // Unsupported top-layer states simply cannot be active.
            }
        }
    }
    return null;
}

function composedParent(element) {
    return element.parentElement || element.getRootNode()?.host || null;
}
