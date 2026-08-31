import {Source} from '../source/source.js';

const STYLE = `
[data-u2-rte-source] {
    block-size: min(70vh, 40rem);
    border: 1px solid;
    inline-size: min(90vw, 60rem);
    max-block-size: none;
    max-inline-size: none;
    padding: 0;
}
[data-u2-rte-source] form {
    block-size: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    margin: 0;
    padding: .5rem;
}
[data-u2-rte-source] u2-code {
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: monospace;
    min-block-size: 0;
    overflow: auto;
}
[data-u2-rte-source] textarea {
    box-sizing: border-box;
    flex: 1;
    font-family: monospace;
    inline-size: 100%;
    resize: none;
    white-space: pre;
}
[data-u2-rte-source] menu {
    display: flex;
    gap: .5rem;
    justify-content: flex-end;
    margin: 0;
    padding: 0;
}
`;

// Optional source view. One dialog per editor is shared by every surface: it is
// modal, so only one can be open, and its lifetime belongs to the editor rather
// than to a surface that may be replaced while it is open.
//
// The text area is always wrapped in `<u2-code>`. Where that element is defined
// it takes the textarea over and highlights it; where it is not, the textarea
// renders on its own. Highlighting is therefore an enhancement, never a
// dependency. `highlight` is an optional loader called before the first open.
export function sourceView({highlight = null, ...options} = {}) {
    if (highlight !== null && typeof highlight !== 'function') {
        throw new TypeError('A source highlighter must be a loader function');
    }
    const editors = new WeakMap();
    return Object.freeze({
        name: 'source',
        setup({editor, root}) {
            const state = {
                root,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                options,
                highlight,
                loaded: null,
                dialog: null,
                style: null,
                pending: null,
            };
            editors.set(editor, state);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                state.dialog?.remove();
                state.style?.remove();
                editors.delete(editor);
                connected = false;
            }};
        },
        commands({editor, surface}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The source extension is not set up', 'InvalidStateError');
            return {source: {
                // Editing happens in the dialog, so opening it changes nothing
                // and the write it may cause runs as its own transaction.
                transaction: false,
                enabled: edit => !!edit.range,
                run: () => open(state, surface),
            }};
        },
        toolbar: Object.freeze([Object.freeze({command: 'source', label: 'HTML source', text: '</>'})]),
    });
}

// A loader is awaited so the first open is already highlighted; without one the
// dialog opens synchronously.
function open(state, surface) {
    if (!state.highlight) return show(state, surface);
    state.loaded ??= Promise.resolve().then(state.highlight).catch(() => null);
    return state.loaded.then(() => show(state, surface));
}

function show(state, surface) {
    const view = new Source(surface, state.options);
    const dialog = build(state);
    const code = dialog.querySelector('u2-code');
    const area = dialog.querySelector('textarea');
    const {html, start, end} = view.read();
    // The light textarea always carries the value: a late upgrade reads it, and
    // an upgraded element writes every edit back into it.
    area.value = html;
    const input = upgraded(code) ? code : area;
    // The value has to be set before focus; an upgraded element defers a write
    // to a focused field.
    if (input === code) code.value = html;
    state.pending = {view, surface, code, area};
    dialog.showModal();
    input.focus();
    input.setSelectionRange(start ?? 0, end ?? start ?? 0);
    // A long document opens scrolled to the selection instead of at the top.
    const lines = html.slice(0, start ?? 0).split('\n').length - 1;
    const height = parseFloat(state.document.defaultView.getComputedStyle(area).lineHeight);
    if (lines && height) (input === code ? code : area).scrollTop = lines * height;
    return view;
}

function upgraded(element) {
    return typeof element.value === 'string' && typeof element.setSelectionRange === 'function';
}

function build(state) {
    if (state.dialog) return state.dialog;
    const container = state.root.nodeType === Node.DOCUMENT_NODE
        ? state.document.body || state.document.documentElement
        : state.root;
    const style = state.document.createElement('style');
    style.dataset.u2RteSourceStyle = '';
    style.textContent = STYLE;
    const dialog = state.document.createElement('dialog');
    dialog.dataset.u2RteSource = '';
    dialog.setAttribute('aria-label', 'HTML source');
    const form = state.document.createElement('form');
    form.method = 'dialog';
    const area = state.document.createElement('textarea');
    area.spellcheck = false;
    area.setAttribute('aria-label', 'HTML source');
    const code = state.document.createElement('u2-code');
    code.setAttribute('editable', '');
    code.setAttribute('language', 'html');
    code.append(area);
    const menu = state.document.createElement('menu');
    for (const [value, label] of [['cancel', 'Cancel'], ['apply', 'Apply']]) {
        const button = state.document.createElement('button');
        button.type = 'submit';
        button.value = value;
        button.textContent = label;
        menu.append(button);
    }
    form.append(code, menu);
    dialog.append(form);
    dialog.addEventListener('close', () => apply(state, dialog.returnValue));
    container.append(style, dialog);
    state.style = style;
    state.dialog = dialog;
    return dialog;
}

function apply(state, result) {
    const pending = state.pending;
    state.pending = null;
    if (!pending?.surface.connected) return;
    // Focus returns before writing so the surface owns the selection the
    // resulting transaction captures.
    pending.surface.element.focus();
    if (result !== 'apply') {
        // Closing without applying leaves the surface exactly as it was,
        // including the caret the view was opened on.
        pending.surface.restore();
        return;
    }
    pending.view.write(upgraded(pending.code) ? pending.code.value : pending.area.value);
}
