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
`;

const LABELS = {href: 'Address', target: 'New tab', title: 'Title', rel: 'Rel'};

// Optional contextual link editor.
//
// The command is an ordinary value mark, so creating, changing, and removing a
// link is one path that any other UI can drive; this module only supplies one.
// Which protocols and attributes are acceptable is the sanitizer's policy, not
// this form's: it writes what the link adapter understands and nothing else.
export function linkEditor({fields = ['href', 'target', 'title']} = {}) {
    if (!Array.isArray(fields) || !fields.length || fields.some(name => !LABELS[name])) {
        throw new TypeError(`A link editor field must be one of ${Object.keys(LABELS).join(', ')}`);
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
    state.active = {view, surface, element: marked(surface, at(surface)), selection: surface.selection};
    const value = view.commands.state('link');
    fill(state, value && value !== 'mixed' ? value : null);
    show(form, true);
    place(form, surface, {align: 'start', prefer: 'below'});
    form.querySelector('[name=href]')?.focus();
    return form;
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
    // No Apply and no Remove: what the fields say is what the link is, as it is
    // typed, and an emptied address says there is no link.
    form.addEventListener('input', event => write(state, read(state), event.target));
    form.addEventListener('submit', event => {
        event.preventDefault();
        cancel(state);
    });
    // A manual popover is not dismissed by the browser, so the form closes on
    // its own keys. Two text fields block implicit submission anyway, and with
    // every edit already applied Enter has nothing left to confirm and Escape
    // nothing to undo: both leave and put the caret back.
    form.addEventListener('keydown', event => {
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

