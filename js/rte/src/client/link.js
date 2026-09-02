import {inlineUi} from '../config/config.js';
import {linkHtml} from '../mark/standard.js';
import {caretAfter} from '../ui/caret.js';
import {place} from '../ui/place.js';
import {valueMark} from '../command/mark.js';

const STYLE = `
#link {
    display: flex;
    flex-direction: column;
    gap: .23em;
    padding: .34em;

    label { align-items: center; display: flex; gap: .57em; justify-content: space-between; }
    input[type=text] {
        background: transparent;
        border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
        border-radius: .34em;
        field-sizing: content;
        min-inline-size: 16em;
        max-inline-size: clamp(16em, 50vw, 32em);
        padding: .17em .34em;
        flex-grow: 1;
    }
    ul {
        border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
        border-radius: .34em;
        cursor: default;
        list-style: none;
        margin: 0;
        max-block-size: 40vh;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 0;
    }
    li { border-radius: .23em; padding: .17em .34em; }
    #link-open { color: inherit; padding: 0 .17em; pointer-events: auto; text-decoration: none; }
    li[aria-selected=true] { background: Highlight; color: HighlightText; }
}
`;

const LABELS = {href: 'Address', target: 'New tab', title: 'Title', rel: 'Rel'};

// Optional contextual link editor.
//
// The form is where the caret is: it appears on its own when the caret is in a
// link and goes when the caret leaves, the way the table and image handles do. It
// therefore never takes the focus by appearing — someone is typing — and the
// toolbar control is left with the one thing that is a decision: turning a
// selection into a link. Removing one is emptying its address.
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
                dirty: false,
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
                // Neither creating nor reaching the form changes the document, so
                // this needs no transaction. Creating needs text; at a link the
                // form is already there and only wants the keyboard.
                editLink: {
                    shortcut: 'ctrl+k',
                    transaction: false,
                    enabled: edit => !!edit.range && (!edit.range.collapsed || link.state(edit) !== null),
                    state: edit => link.state(edit) !== null,
                    run: edit => link.state(edit) !== null ? reach(state) : create(state, view),
                },
            };
        },
        attach({editor, surface}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The link extension is not set up', 'InvalidStateError');
            const controller = new state.document.defaultView.AbortController();
            const listen = {signal: controller.signal};
            surface.addEventListener('u2-rte-selectionchange', () => follow(state, surface), listen);
            surface.addEventListener('u2-rte-change', () => follow(state, surface), listen);
            surface.addEventListener('u2-rte-deactivate', () => close(state, surface), listen);
            return {dispose() {
                controller.abort();
                close(state, surface);
                state.views.delete(surface);
            }};
        },
        toolbar: Object.freeze([
            Object.freeze({command: 'editLink', name: 'link', label: 'Link', text: '↗', state: true, shortcut: 'ctrl+k'}),
        ]),
    });
}

export const link = linkEditor();

// An edit the form has not applied yet, applied now. Marking a link selects it,
// which is right while someone is typing in the form and wrong once they have
// moved on — so whatever the selection has become is put back afterwards.
function settle(state) {
    const active = state.active;
    if (!state.dirty || state.closing || !active?.surface.connected) return null;
    const selection = active.surface.core.selection;
    const keep = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    state.closing = true;
    try { commit(state); } finally { state.closing = false; }
    if (!keep) return null;
    selection.removeAllRanges();
    selection.addRange(keep);
    if (active.surface.element.contains(keep.startContainer)) active.surface.capture();
    return null;
}

// The form for one link, or for a selection about to become one. Appearing is not
// a reason to take the focus: only asking for it is.
function show(state, view, element, focus = false) {
    settle(state);
    const form = build(state);
    const surface = view.surface;
    // What this form edits, once: an existing link is its own contents, a new one
    // is the selection it was started on. Writing to "wherever the caret is" would
    // put the address somewhere else the moment the caret moved.
    state.active = {view, surface, element, selection: surface.selection, creating: !element,
        range: element ? contents(element) : surface.selection?.range() || null};
    state.dirty = false;
    const value = view.commands.state('link');
    fill(state, value && value !== 'mixed' ? value : null);
    form.hidden = false;
    position(state);
    if (focus) form.querySelector('[name=href]')?.focus();
    return form;
}

// Turning a selection into a link: the form opens empty, with the keyboard in it.
function create(state, view) {
    const active = state.active;
    if (active?.creating && active.surface === view.surface) return reach(state);
    show(state, view, null, true);
    if (state.suggest) propose(state, state.active);
    return state.form;
}

// The form is already showing; the keyboard wants to be in it.
function reach(state) {
    const field = state.form?.querySelector('[name=href]');
    field?.focus();
    field?.select();
    return state.form || null;
}

// A new link may be asked what it should point at. The answer can take a round
// trip, so it counts only while the form is still open on the same link and the
// address is still the empty one it was asked about.
//
// It is offered, not applied: writing it would mark the link, and marking moves
// the selection into it and the focus after that — throwing whoever asked for a
// link straight back into the text. It stands in the field, selected so one
// keystroke replaces it, and becomes the link when the form is done.
async function propose(state, active) {
    const suggested = await state.suggest(target(active.surface)?.toString() || '', active.surface);
    if (state.active !== active || read(state)) return null;
    if (!suggested?.href) return null;
    fill(state, suggested);
    state.dirty = true;
    state.form.querySelector('[name=href]').select();
    return suggested;
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
    list.id = 'link-completions';
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
    // Once: a second run would mark the link again and leave it selected, over
    // whatever caret the first one settled on.
    state.dirty = false;
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
    const range = active.element ? contents(active.element) : active.range;
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
    // What the form edits from here on is whatever the run left behind: the link
    // it made, or — when emptying the address took one away — the text that is
    // left, so the same words can be linked again.
    active.element = marked(active.surface, at(active.surface));
    active.range = active.element ? contents(active.element)
        : active.surface.selection?.range() || active.range;
    active.selection = active.surface.selection;
    if (!active.element && value) return close(state);
    position(state);
    return active.element;
}

// What is left behind decides where the caret goes: the link that was made, or
// the text that is left when emptying the address took one away.
function leave(state) {
    const active = state.active;
    const element = active?.element;
    if (active?.creating) close(state);
    else if (state.dirty) commit(state);
    if (!active?.surface.connected) return null;
    caretAfter(active.surface, state.active?.element || element);
    return null;
}

function close(state, surface = null) {
    if (!state.active || surface && state.active.surface !== surface) return;
    settle(state);
    clearTimeout(state.completing);
    if (state.form?.querySelector('ul')) options(state, []);
    state.active = null;
    if (state.form) state.form.hidden = true;
    return null;
}

// Where the caret is decides: in a link the form is there, outside it is not. The
// one state that is not a place is creating — that selection is not a link yet,
// and the form holds until it is or the selection moves on.
function follow(state, surface) {
    const active = state.active;
    if (state.writing || active && active.surface !== surface) return;
    if (!surface.connected || !inlineUi(surface.config, 'link')) return close(state, surface);
    const element = marked(surface, at(surface));
    if (element) {
        if (active?.element === element) return position(state);
        return show(state, view(state, surface), element);
    }
    if (active?.creating && surface.selection === active.selection) return position(state);
    return close(state, surface);
}

function view(state, surface) {
    return state.views.get(surface);
}

// Close to what it edits: the link itself once there is one, the selection while
// there is not.
function position(state) {
    const active = state.active;
    if (!active || !state.form) return false;
    return place(state.form, active.surface, {
        align: 'start',
        prefer: 'below',
        gap: 4,
        on: active.element?.getBoundingClientRect() || null,
    });
}

// The node the surface's saved selection starts in.
function at(surface) {
    return surface.selection?.range().startContainer || null;
}

// The contents of one element, as a range.
function contents(element) {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    return range;
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
    const form = state.chrome.part('link', STYLE, 'form');
    form.className = 'panel';
    form.noValidate = true;
    form.hidden = true;
    form.setAttribute('aria-label', 'Link');
    for (const name of state.fields) form.append(field(state.document, name));
    if (state.complete) form.append(completions(state, form));
    // No Apply and no Remove: what the fields say is what the link is, as it is
    // typed, and an emptied address says there is no link.
    form.addEventListener('input', event => {
        state.dirty = true;
        if (state.complete && event.target.name === 'href') offer(state, event.target.value);
        write(state, read(state), event.target);
        openable(state);
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        leave(state);
    });
    // Two text fields block implicit submission, so the form owns its own keys.
    // With every edit already applied, Enter has nothing left to confirm and
    // Escape nothing to undo: both hand the caret back to the text.
    form.addEventListener('keydown', event => {
        if (state.complete && listKey(state, event)) return event.preventDefault();
        if (event.key !== 'Escape' && event.key !== 'Enter') return;
        event.preventDefault();
        leave(state);
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
    // A way to see where the address actually goes, without leaving the editor.
    if (name === 'href') label.append(opener(document));
    return label;
}

function opener(document) {
    const open = document.createElement('a');
    open.id = 'link-open';
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = '↗';
    open.title = 'Open in a new tab';
    open.hidden = true;
    return open;
}

// Whatever the field is given — a suggestion, the link the caret walked into, a
// normalized address — is asked about too. An address is an identifier; the list
// is where it says what it stands for.
function fill(state, value) {
    for (const name of state.fields) {
        const input = state.form.querySelector(`[name=${name}]`);
        if (input.type === 'checkbox') input.checked = value?.target === '_blank';
        else input.value = value?.[name] || '';
    }
    if (state.complete) offer(state, value?.href || '');
    return openable(state);
}

// The address, as somewhere the browser can actually go. An application scheme —
// a cms page id, a record reference — is a link the editor understands and the
// browser does not, so there is nothing to offer for it.
const NAVIGABLE = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function openable(state) {
    const open = state.form?.querySelector('#link-open');
    if (!open) return null;
    const typed = state.form.querySelector('[name=href]').value.trim();
    let href = null;
    try {
        if (typed) href = NAVIGABLE.has(new URL(typed, state.document.baseURI).protocol) ? typed : null;
    } catch { /* half an address is not one yet */ }
    open.hidden = !href;
    if (href) open.href = href;
    return href;
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


