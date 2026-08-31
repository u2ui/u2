import {linkHtml} from '../mark/standard.js';
import {place} from '../ui/place.js';
import {valueMark} from '../command/mark.js';

const STYLE = `
[data-u2-rte-link] {
    background: Canvas;
    border: 1px solid color-mix(in srgb, CanvasText 40%, transparent);
    color: CanvasText;
    display: flex;
    flex-direction: column;
    font: inherit;
    gap: .2rem;
    inset: auto;
    margin: 0;
    padding: .3rem;
    pointer-events: auto;
    position: fixed;
}
[data-u2-rte-link][hidden] { display: none; }
[data-u2-rte-link] label {
    display: flex;
    gap: .4rem;
    justify-content: space-between;
}
[data-u2-rte-link] input[type=text] { min-inline-size: 14rem; }
[data-u2-rte-link] ul {
    background: Canvas;
    border: 1px solid color-mix(in srgb, CanvasText 40%, transparent);
    cursor: default;
    list-style: none;
    margin: 0;
    max-block-size: 40vh;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0;
}
[data-u2-rte-link] li { padding: .1rem .3rem; }
[data-u2-rte-link] li[aria-selected=true] { background: Highlight; color: HighlightText; }
`;

const LABELS = {href: 'Address', target: 'New tab', title: 'Title', rel: 'Rel'};

// Optional contextual link editor.
//
// The command is an ordinary value mark, so creating, changing, and removing a
// link is one path that any other UI can drive; this module only supplies one.
// Which protocols and attributes are acceptable is the sanitizer's policy, not
// this form's: it writes what the link adapter understands and nothing else.
//
// What an address means, though, is the application's: `normalize` gets the
// finished value whenever a field is left, and may complete a bare domain, turn
// an address into a scheme of its own, or decide `rel` and `target` from it.
// `suggest` is asked what a new link should point at, given the text it is being
// put on, and `complete` what addresses go with what is being typed. All three
// default to leaving everything alone.
export function linkEditor({
    fields = ['href', 'target', 'title'],
    normalize = value => value,
    suggest = null,
    complete = null,
} = {}) {
    if (!Array.isArray(fields) || !fields.length || fields.some(name => !LABELS[name])) {
        throw new TypeError(`A link editor field must be one of ${Object.keys(LABELS).join(', ')}`);
    }
    if (typeof normalize !== 'function') throw new TypeError('A link normalizer must be a function');
    for (const [property, value] of Object.entries({suggest, complete})) {
        if (value !== null && typeof value !== 'function') throw new TypeError(`A link ${property} must be a function`);
    }
    const editors = new WeakMap();
    return Object.freeze({
        name: 'link',
        setup({editor, root, chrome}) {
            const state = {
                root,
                chrome,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                fields: [...fields],
                normalize,
                suggest,
                complete,
                completing: null,
                views: new Map(),
                form: null,
                active: null,
                writing: false,
            };
            editors.set(editor, state);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                state.form?.remove();
                editors.delete(editor);
                connected = false;
            }};
        },
        commands({editor, surface, commands}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The link extension is not set up', 'InvalidStateError');
            const view = {surface, commands};
            state.views.set(surface, view);
            const link = valueMark(linkHtml);
            return {
                link,
                // Opening the form changes nothing, so it needs no transaction.
                // Creating a link needs text; editing one works at a caret.
                editLink: {
                    shortcut: 'ctrl+k',
                    transaction: false,
                    enabled: edit => !!edit.range && (!edit.range.collapsed || !!link.state(edit)),
                    state: edit => link.state(edit) !== null,
                    run: () => open(state, view),
                },
                // Without a value the same command removes what is there.
                unlink: {
                    enabled: edit => link.state(edit) !== null,
                    run: edit => link.run(edit),
                },
            };
        },
        attach({editor, surface}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The link extension is not set up', 'InvalidStateError');
            const controller = new state.document.defaultView.AbortController();
            const listen = {signal: controller.signal};
            surface.addEventListener('u2-rte-selectionchange', () => reposition(state, surface), listen);
            surface.addEventListener('u2-rte-deactivate', () => close(state, surface), listen);
            return {dispose() {
                controller.abort();
                close(state, surface);
                state.views.delete(surface);
            }};
        },
        toolbar: Object.freeze([
            Object.freeze({command: 'editLink', name: 'link', label: 'Link', text: '↗', state: true, shortcut: 'ctrl+k'}),
            Object.freeze({command: 'unlink', name: 'unlink', label: 'Remove link', text: '⊗'}),
        ]),
    });
}

export const link = linkEditor();

function open(state, view) {
    const form = build(state);
    const surface = view.surface;
    const active = {view, surface, element: marked(surface, at(surface)), selection: surface.selection};
    state.active = active;
    const value = view.commands.state('link');
    fill(state, value && value !== 'mixed' ? value : null);
    show(form, true);
    place(form, surface, {align: 'start', prefer: 'below'});
    form.querySelector('[name=href]')?.focus();
    if (!active.element && state.suggest) propose(state, active);
    return form;
}

// A new link may be asked what it should point at. The answer can take a round
// trip, so it counts only while the form is still open on the same link and the
// address is still the empty one it was asked about.
async function propose(state, active) {
    const suggested = await state.suggest(target(active.surface)?.toString() || '', active.surface);
    if (state.active !== active || read(state)) return null;
    if (!suggested?.href) return null;
    fill(state, suggested);
    return write(state, suggested);
}

// Addresses that go with what is being typed. One question is in flight at a time
// and a late answer to an older word is dropped, so what the list offers always
// belongs to what the field says.
//
// The list is the form's own rather than a native datalist: an entry may bring
// markup — a title over its path, a thumbnail — which a datalist cannot show. That
// markup comes from the application but is written with `setHTML()`, so the
// platform sanitizes it like any other imported html.
function offer(state, text) {
    const list = state.form?.querySelector('ul');
    if (!list) return null;
    clearTimeout(state.completing);
    if (!text.trim()) return options(state, []);
    state.completing = setTimeout(async () => {
        const found = await state.complete(text, state.active?.surface) || [];
        if (state.form.querySelector('[name=href]').value !== text) return;
        options(state, found);
    }, 150);
    return null;
}

function options(state, entries) {
    const list = state.form.querySelector('ul');
    list.replaceChildren(...entries.map(entry => {
        const option = state.document.createElement('li');
        option.role = 'option';
        option.dataset.value = entry.value ?? entry;
        const markup = typeof entry === 'object' ? entry.html : null;
        if (markup && option.setHTML) option.setHTML(markup);
        else option.textContent = entry.label ?? entry.value ?? entry;
        return option;
    }));
    list.hidden = !entries.length;
    state.form.querySelector('[name=href]').ariaExpanded = String(!list.hidden);
    return mark(state, list.firstElementChild);
}

// One entry is current, and the field says which: a list nobody can point at with
// the keyboard is only half a control.
function mark(state, option) {
    const list = state.form.querySelector('ul');
    for (const item of list.children) item.ariaSelected = String(item === option);
    state.form.querySelector('[name=href]').setAttribute('aria-activedescendant', option ? id(option) : '');
    option?.scrollIntoView({block: 'nearest'});
    return option || null;
}

function id(option) {
    option.id ||= `u2-rte-link-option-${[...option.parentNode.children].indexOf(option)}`;
    return option.id;
}

function chosen(state) {
    return state.form?.querySelector('li[aria-selected=true]') || null;
}

// Taking an entry is typing it: the field says what was chosen and the link
// follows, exactly as if it had been typed out.
function take(state, option) {
    if (!option) return null;
    const field = state.form.querySelector('[name=href]');
    field.value = option.dataset.value;
    options(state, []);
    field.focus();
    return commit(state, field);
}

function completions(state, form) {
    const list = state.document.createElement('ul');
    list.role = 'listbox';
    list.hidden = true;
    list.id = 'u2-rte-link-completions';
    list.addEventListener('mousedown', event => event.preventDefault()); // keep the field's focus
    list.addEventListener('click', event => take(state, event.target.closest('li')));
    list.addEventListener('mouseover', event => {
        const option = event.target.closest('li');
        if (option) mark(state, option);
    });
    const field = form.querySelector('[name=href]');
    field.role = 'combobox';
    field.ariaExpanded = 'false';
    field.ariaAutoComplete = 'list';
    field.setAttribute('aria-controls', list.id);
    return list;
}

// While the list is open it owns the keys that move and choose in it.
function listKey(state, event) {
    const list = state.form.querySelector('ul');
    if (!list || list.hidden) return false;
    const current = chosen(state);
    const step = {ArrowDown: 'nextElementSibling', ArrowUp: 'previousElementSibling'}[event.key];
    if (step) {
        mark(state, current?.[step] || (event.key === 'ArrowDown' ? list.firstElementChild : list.lastElementChild));
        return true;
    }
    if (event.key === 'Enter' && current) return !!take(state, current);
    if (event.key === 'Escape') return !!options(state, []) || true;
    return false;
}

// What the fields say, as the application reads it. This happens once, when the
// form is done: normalizing while a field is being typed into would rewrite
// half-typed addresses under the caret, and the form cannot wait for a field to be
// left either — marking the link takes the focus away and gives it back on every
// keystroke, so "left behind" is not a thing here.
function commit(state, field = null) {
    const typed = read(state);
    const value = state.normalize(typed, state.active?.surface) ?? null;
    if (value !== typed) fill(state, value);
    return write(state, value, field);
}

// Every edit is applied as it is made. Marking the run as ongoing input keeps
// history from recording a step per keystroke.
function write(state, value, field = null) {
    const active = state.active;
    if (!active?.surface.connected) return null;
    const range = target(active.surface);
    if (!range) return close(state);
    // Marking the link moves the document selection into it, and an engine
    // follows that with focus. Whoever is being typed into gets it back, caret
    // and all, or the next character would land in the editor.
    const caret = field && typeof field.selectionStart === 'number'
        ? [field.selectionStart, field.selectionEnd]
        : null;
    state.writing = true;
    try {
        active.view.commands.run('link', {value, range, trigger: 'input'});
    } finally {
        state.writing = false;
    }
    if (field) {
        field.focus();
        if (caret) field.setSelectionRange(...caret);
    }
    // What the form edits from here on is whatever the run left behind.
    active.element = marked(active.surface, at(active.surface));
    active.selection = active.surface.selection;
    if (!active.element && value) return close(state);
    place(state.form, active.surface, {align: 'start', prefer: 'below'});
    return active.element;
}

// Leaving puts the caret back where the form was opened on.
function cancel(state) {
    const active = state.active;
    close(state);
    if (!active?.surface.connected) return;
    active.surface.element.focus();
    active.surface.restore();
}

function close(state, surface = null) {
    if (!state.active || surface && state.active.surface !== surface) return;
    if (!state.closing) {
        state.closing = true;
        try { commit(state); } finally { state.closing = false; }
    }
    clearTimeout(state.completing);
    if (state.form?.querySelector('ul')) options(state, []);
    state.active = null;
    if (state.form) show(state.form, false);
    return null;
}

// The form belongs to the link it was opened on, not to wherever the caret goes
// next: a selection that leaves it closes the form rather than dragging it along.
function reposition(state, surface) {
    const active = state.active;
    if (active?.surface !== surface || state.writing) return;
    if (!surface.connected) return close(state, surface);
    const held = active.element
        ? marked(surface, at(surface)) === active.element
        : surface.selection === active.selection;
    if (!held) return close(state, surface);
    place(state.form, surface, {align: 'start', prefer: 'below'});
}

// The node the surface's saved selection starts in.
function at(surface) {
    return surface.selection?.range().startContainer || null;
}

// A caret inside a link edits the whole link; a selection marks exactly itself.
function target(surface) {
    const range = surface.selection?.range();
    if (!range || !range.collapsed) return range || null;
    const element = marked(surface, range.startContainer);
    if (!element) return range;
    const whole = surface.element.ownerDocument.createRange();
    whole.selectNodeContents(element);
    return whole;
}

function marked(surface, node) {
    let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    for (; element && element !== surface.element; element = element.parentElement) {
        if (linkHtml.parse(element)) return element;
    }
    return null;
}

function build(state) {
    if (state.form) return state.form;
    state.chrome.style('link', STYLE);
    const form = state.document.createElement('form');
    form.dataset.u2RteLink = '';
    form.noValidate = true;
    form.hidden = true;
    form.setAttribute('aria-label', 'Link');
    for (const name of state.fields) form.append(field(state.document, name));
    if (state.complete) form.append(completions(state, form));
    // No Apply and no Remove: what the fields say is what the link is, as it is
    // typed, and an emptied address says there is no link.
    form.addEventListener('input', event => {
        if (state.complete && event.target.name === 'href') offer(state, event.target.value);
        write(state, read(state), event.target);
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        cancel(state);
    });
    // A manual popover is not dismissed by the browser, so the form closes on
    // its own keys. Two text fields block implicit submission anyway, and with
    // every edit already applied Enter has nothing left to confirm and Escape
    // nothing to undo: both leave and put the caret back.
    form.addEventListener('keydown', event => {
        if (state.complete && listKey(state, event)) return event.preventDefault();
        if (event.key !== 'Escape' && event.key !== 'Enter') return;
        event.preventDefault();
        cancel(state);
    });
    state.chrome.root.append(form);
    state.form = form;
    return form;
}

// The address is a plain text field on purpose. Native url validation rejects
// relative paths, fragments, and application schemes, and would silently block
// the form; which protocols are acceptable is the sanitizer's decision.
function field(document, name) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.name = name;
    input.type = name === 'target' ? 'checkbox' : 'text';
    if (name === 'href') {
        input.inputMode = 'url';
        input.autocomplete = 'url';
        input.spellcheck = false;
    }
    label.append(LABELS[name], input);
    return label;
}

function fill(state, value) {
    for (const name of state.fields) {
        const input = state.form.querySelector(`[name=${name}]`);
        if (input.type === 'checkbox') input.checked = value?.target === '_blank';
        else input.value = value?.[name] || '';
    }
}

function read(state) {
    const value = {};
    for (const name of state.fields) {
        const input = state.form.querySelector(`[name=${name}]`);
        if (input.type === 'checkbox') {
            if (input.checked) value.target = '_blank';
        } else if (input.value.trim()) {
            value[name] = input.value.trim();
        }
    }
    return value.href ? value : null;
}

function show(form, visible) {
    form.hidden = !visible;
}

