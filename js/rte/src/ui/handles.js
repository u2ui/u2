export const handleStyle = `
.handles > .frame {
    border: 1px solid Highlight;
    box-sizing: border-box;
    display: none;
    pointer-events: none;
    position: fixed;
}
.handles[framed] > .frame { display: block; }
.handles > button {
    align-items: center;
    background: Canvas;
    border: 1px solid color-mix(in srgb, CanvasText 45%, transparent);
    border-radius: 50%;
    block-size: var(--u2-handle-size, 1.43em);
    color: CanvasText;
    display: flex;
    font-size: .7em;
    inline-size: var(--u2-handle-size, 1.43em);
    justify-content: center;
    padding: 0;
    pointer-events: auto;
    position: fixed;
    /* Trimming the font's leading centres the glyph itself rather than its
       metric box, which is what makes a bare + or × sit straight. */
    text-box: trim-both cap alphabetic;
}
.handles > button:hover:not(:disabled) { background: color-mix(in srgb, Highlight 20%, Canvas); }
.handles > button:disabled { opacity: .45; }
`;

// A set of buttons placed around something, with an optional frame drawn behind
// them. It owns no editor concept: a caller says where each handle goes and what
// pressing one means, which is what lets anything with a rectangle use it.
//
// Given a shadow root it places itself inside it and registers its stylesheet
// there. Given a document it makes a shadow root of its own, so it works just as
// well outside an editor.
export class Handles {
    #host;
    #root;
    #frame;
    #buttons = new Map();
    #action;
    #owned = null;
    #connected = true;

    constructor(root, {handles, action = null, press = null, name = 'handles'} = {}) {
        const isDocument = root?.nodeType === Node.DOCUMENT_NODE;
        const isShadow = root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
        if (!isDocument && !isShadow) throw new TypeError('Handles require a document or shadow root');
        if (!Array.isArray(handles) || !handles.length) throw new TypeError('Handles require descriptors');
        for (const [label, value] of [['action', action], ['press', press]]) {
            if (value !== null && typeof value !== 'function') throw new TypeError(`A handle ${label} must be a function`);
        }
        const document = isDocument ? root : root.ownerDocument;
        this.#action = action;
        this.#host = document.createElement('div');
        this.#host.id = name;
        this.#host.className = 'handles';
        this.#host.hidden = true;
        this.#host.setAttribute('aria-hidden', 'true');
        this.#frame = document.createElement('div');
        this.#frame.className = 'frame';
        this.#host.append(this.#frame);
        for (const handle of handles) {
            if (typeof handle?.name !== 'string' || !handle.name.trim()) throw new TypeError('A handle requires a name');
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.handle = handle.name;
            button.tabIndex = -1;
            button.title = handle.label || handle.name;
            button.setAttribute('aria-label', handle.label || handle.name);
            button.textContent = handle.text ?? '';
            if (handle.cursor) button.style.cursor = handle.cursor;
            this.#buttons.set(handle.name, button);
            this.#host.append(button);
        }
        // Listening on the containing root rather than the host: an event that
        // is not composed never leaves the shadow tree it happened in.
        this.#root = isShadow ? root : ownRoot(this.#host, document);
        this.#root.addEventListener('pointerdown', event => {
            const button = named(event, this.#host);
            if (!button || button.disabled) return;
            // Pointing at editor chrome must never move the selection it acts on.
            event.preventDefault();
            press?.(button.dataset.handle, event);
        });
        this.#root.addEventListener('click', event => {
            const button = named(event, this.#host);
            if (button && !button.disabled) this.#action?.(button.dataset.handle, event);
        });
        if (isShadow) {
            if (!root.getElementById('handles-style')) {
                const style = document.createElement('style');
                style.id = 'handles-style';
                style.textContent = handleStyle;
                root.append(style);
            }
            root.append(this.#host);
        } else {
            this.#owned = this.#host.parentNode;
        }
    }

    get element() { return this.#host; }

    button(name) {
        return this.#buttons.get(name) || null;
    }
    get names() { return [...this.#buttons.keys()]; }
    get visible() { return !this.#host.hidden; }
    get connected() { return this.#connected; }

    show(visible = true) {
        this.#host.hidden = !visible;
        return this;
    }

    // A handle is placed by its centre, in viewport coordinates.
    place(name, x, y) {
        const button = this.#buttons.get(name);
        if (!button) throw new RangeError(`Unknown handle: ${name}`);
        const size = button.offsetWidth || 20;
        button.style.left = `${x - size / 2}px`;
        button.style.top = `${y - size / 2}px`;
        return this;
    }

    disable(name, disabled = true) {
        const button = this.#buttons.get(name);
        if (!button) throw new RangeError(`Unknown handle: ${name}`);
        button.disabled = !!disabled;
        return this;
    }

    // `null` hides the frame; a rectangle draws it in viewport coordinates.
    frame(rect) {
        this.#host.toggleAttribute('framed', !!rect);
        if (!rect) return this;
        this.#frame.style.left = `${rect.left}px`;
        this.#frame.style.top = `${rect.top}px`;
        this.#frame.style.width = `${rect.width}px`;
        this.#frame.style.height = `${rect.height}px`;
        return this;
    }

    dispose() {
        if (!this.#connected) return;
        (this.#owned?.host || this.#host).remove();
        this.#buttons.clear();
        this.#connected = false;
    }

    [Symbol.dispose]() {
        this.dispose();
    }
}

function named(event, host) {
    const button = event.composedPath()[0]?.closest?.('button[data-handle]');
    return button && host.contains(button) ? button : null;
}

// Standalone use: the handles bring their own encapsulated root.
function ownRoot(host, document) {
    const outer = document.createElement('div');
    outer.dataset.u2RteChrome = 'handles';
    const root = outer.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = ':host { all: initial; pointer-events: none; position: fixed; inset: 0; }\n' + handleStyle;
    root.append(style, host);
    (document.body || document.documentElement).append(outer);
    if (typeof outer.showPopover === 'function') {
        outer.popover = 'manual';
        outer.showPopover();
    }
    return root;
}
