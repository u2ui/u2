import {Source} from '../source/source.js';

const STYLE = `
#ai {
    block-size: min(80vh, 50em);
    border: 1px solid;
    inline-size: min(95vw, 80em);
    max-block-size: none;
    max-inline-size: none;
    overflow: hidden; /* only the text boxes scroll, never the dialog itself */
    padding: 0;
    pointer-events: auto;

    & form {
        block-size: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: .57em;
        margin: 0;
        padding: .57em;
    }
    & .prompt {
        display: flex;
        gap: .57em;

        & input { flex: 1; min-inline-size: 0 }
    }
    & .panes {
        display: flex;
        flex: 1;
        flex-wrap: wrap;
        gap: .57em;
        min-block-size: 0;
        overflow: auto; /* wrapped panes stack: that column scrolls, the dialog stays put */
    }
    & .pane {
        display: flex;
        flex: 1 1 20em;
        flex-direction: column;
        min-block-size: 8em;

        & > b { flex: 0 0 auto }
        & > div { border: 1px solid; flex: 1; min-block-size: 0; overflow: auto; padding: .57em }
    }
    /* Added and removed read faster as colour than as underline and strike, and mixing into the
       page's own background keeps them legible in a light and a dark chrome alike. */
    & ins { background: color-mix(in srgb, green 30%, transparent); text-decoration: none }
    & del { background: color-mix(in srgb, red 25%, transparent) }
    & menu {
        display: flex;
        gap: .57em;
        justify-content: flex-end;
        margin: 0;
        padding: 0;
    }
}
`;

// Optional assistant view: a prompt over the surface's content, the answer beside the original, and
// an apply that writes it back through the source path — so an answer is external input like any
// other and meets the sanitizer.
//
// What answers, in which language, at which cost is application policy, so `request` is required and
// carries no default. `diff` is an enhancement: given one, the dialog shows a third pane comparing
// the original with the answer, which is otherwise left out rather than pulled in.
export function aiView({request, diff = null, prompts = [], label = 'Assistant', ...options} = {}) {
    if (typeof request !== 'function') throw new TypeError('An assistant view requires a request function');
    if (diff !== null && typeof diff !== 'function') throw new TypeError('An assistant diff must be a function');
    if (!Array.isArray(prompts) || prompts.some(prompt => typeof prompt !== 'string')) {
        throw new TypeError('Assistant prompts must be an array of strings');
    }
    if (typeof label !== 'string' || !label.trim()) throw new TypeError('An assistant label must be a non-empty string');
    const suggestions = Object.freeze([...prompts]);
    const editors = new WeakMap();
    return Object.freeze({
        name: 'ai',
        setup({editor, root, chrome}) {
            const state = {
                chrome,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                options,
                request,
                diff,
                suggestions,
                label: label.trim(),
                dialog: null,
                pending: null,
            };
            editors.set(editor, state);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                state.dialog?.remove();
                editors.delete(editor);
                connected = false;
            }};
        },
        commands({editor, surface}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The assistant extension is not set up', 'InvalidStateError');
            return {ai: {
                shortcut: 'ctrl+m',
                // The dialog edits nothing by itself; applying runs as its own transaction.
                transaction: false,
                enabled: edit => !!edit.range,
                run: () => show(state, surface),
            }};
        },
        toolbar: Object.freeze([Object.freeze({command: 'ai', label, text: '✨', shortcut: 'ctrl+m'})]),
    });
}

function show(state, surface) {
    const view = new Source(surface, state.options);
    const dialog = build(state);
    const {html} = view.read();
    const parts = state.parts;
    parts.original.innerHTML = html;
    parts.answer.innerHTML = '';
    if (parts.diff) parts.diff.innerHTML = '';
    parts.apply.disabled = true;
    parts.prompt.value = '';
    state.pending = {view, surface, html, run: 0};
    dialog.showModal();
    parts.prompt.focus();
    return view;
}


// Every request carries the run it belongs to: an answer that arrives after the next prompt, or
// after the dialog was closed, has nothing left to fill in.
async function ask(state) {
    const pending = state.pending;
    const parts = state.parts;
    if (!pending) return;
    const run = ++pending.run;
    const prompt = parts.prompt.value.trim();
    if (!prompt) return;
    parts.busy.disabled = true;
    parts.apply.disabled = true;
    try {
        // The surface comes along, not a digest of it: what the field allows (`config`) decides what
        // an answer may use, and what else it says about itself is the application's to read.
        const answer = await state.request({prompt, html: pending.html, surface: pending.surface});
        if (state.pending !== pending || pending.run !== run) return;
        parts.answer.innerHTML = String(answer ?? '');
        parts.apply.disabled = false;
        await update(state, pending, run);
    } catch (error) {
        if (state.pending === pending && pending.run === run) parts.answer.textContent = String(error?.message ?? error);
    } finally {
        if (state.pending === pending && pending.run === run) parts.busy.disabled = false;
    }
}

async function update(state, pending, run) {
    if (!state.diff || !state.parts.diff) return;
    const marked = await state.diff(pending.html, state.parts.answer.innerHTML);
    if (state.pending === pending && pending.run === run) state.parts.diff.innerHTML = String(marked ?? '');
}

function build(state) {
    if (state.dialog) return state.dialog;
    const create = (tag, properties) => Object.assign(state.document.createElement(tag), properties);
    const dialog = state.chrome.part('ai', STYLE, 'dialog');
    dialog.setAttribute('aria-label', state.label);
    const form = create('form', {method: 'dialog'});

    const prompt = create('input', {name: 'prompt', autocomplete: 'off'});
    prompt.setAttribute('aria-label', state.label);
    const busy = create('fieldset', {className: 'prompt'});
    busy.append(prompt, create('button', {type: 'button', textContent: 'Prompt', onclick: () => ask(state)}));
    if (state.suggestions.length) {
        const list = create('datalist', {id: 'ai-prompts'});
        for (const value of state.suggestions) list.append(create('option', {value}));
        prompt.setAttribute('list', list.id);
        busy.append(list);
    }
    // Enter in the field asks rather than submitting the dialog, which would close it unanswered.
    prompt.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        ask(state);
    });

    const panes = create('div', {className: 'panes'});
    const pane = name => {
        const box = create('div', {className: 'pane'});
        const body = create('div', {});
        box.append(create('b', {textContent: name}), body);
        panes.append(box);
        return body;
    };
    const original = pane('Original');
    const answer = pane('Answer');
    answer.contentEditable = 'true';
    const diff = state.diff ? pane('Changes') : null;
    answer.addEventListener('input', () => {
        const pending = state.pending;
        if (pending) update(state, pending, pending.run);
    });

    const menu = state.document.createElement('menu');
    const apply = create('button', {type: 'submit', value: 'apply', textContent: 'Apply'});
    menu.append(create('button', {type: 'submit', value: 'cancel', textContent: 'Cancel'}), apply);

    form.append(busy, panes, menu);
    dialog.append(form);
    dialog.addEventListener('close', () => finish(state, dialog.returnValue));
    state.chrome.root.append(dialog);
    state.dialog = dialog;
    state.parts = {prompt, busy, original, answer, diff, apply};
    return dialog;
}

function finish(state, result) {
    const pending = state.pending;
    state.pending = null;
    if (!pending?.surface.connected) return;
    // Focus returns before writing, so the surface owns the selection the transaction captures.
    pending.surface.element.focus();
    if (result !== 'apply') {
        pending.surface.restore();
        return;
    }
    pending.view.write(state.parts.answer.innerHTML);
}
