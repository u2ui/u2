import {linkHtml} from '../mark/standard.js';
import {place} from '../ui/place.js';
import {valueMark} from '../command/mark.js';

const STYLE = `
[data-u2-rte-link] {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: .3rem;
    inset: auto;
    margin: 0;
    padding: .3rem;
    position: fixed;
}
[data-u2-rte-link][hidden] { display: none; }
[data-u2-rte-link] label {
    align-items: center;
    display: flex;
    gap: .3rem;
}
[data-u2-rte-link] input[name=href] { min-inline-size: 16rem; }
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
        setup({editor, root}) {
            const state = {
                root,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                fields: [...fields],
                views: new Map(),
                form: null,
                style: null,
                active: null,
            };
            editors.set(editor, state);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                state.form?.remove();
                state.style?.remove();
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
    state.active = view;
    const value = view.commands.state('link');
    fill(state, value && value !== 'mixed' ? value : null);
    show(form, true);
    place(form, view.surface, {align: 'start', prefer: 'below'});
    form.querySelector('[name=href]')?.focus();
    return form;
}

// The saved selection is the only record of what to mark, and focusing the
// surface would replace it with a fresh caret. The command therefore runs on an
// explicit range first; focus follows.
function submit(state, action) {
    const view = state.active;
    if (!view?.surface.connected) return close(state);
    const value = action === 'remove' ? null : read(state);
    const range = target(view.surface);
    close(state);
    if (!range || action !== 'remove' && !value) return null;
    const result = view.commands.run('link', {value, range});
    view.surface.element.focus();
    return result;
}

// Leaving without acting puts the caret back where the form was opened on.
function cancel(state) {
    const view = state.active;
    close(state);
    if (!view?.surface.connected) return;
    view.surface.element.focus();
    view.surface.restore();
}

function close(state, surface = null) {
    if (!state.active || surface && state.active.surface !== surface) return;
    state.active = null;
    if (state.form) show(state.form, false);
}

function reposition(state, surface) {
    if (state.active?.surface !== surface) return;
    if (!surface.connected) return close(state, surface);
    place(state.form, surface, {align: 'start', prefer: 'below'});
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
    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    for (; element && element !== surface.element; element = element.parentElement) {
        if (linkHtml.parse(element)) return element;
    }
    return null;
}

function build(state) {
    if (state.form) return state.form;
    const container = state.root.nodeType === Node.DOCUMENT_NODE
        ? state.document.body || state.document.documentElement
        : state.root;
    const style = state.document.createElement('style');
    style.dataset.u2RteLinkStyle = '';
    style.textContent = STYLE;
    const form = state.document.createElement('form');
    form.dataset.u2RteLink = '';
    form.noValidate = true;
    form.hidden = true;
    if (typeof form.showPopover === 'function') form.popover = 'manual';
    form.setAttribute('aria-label', 'Link');
    for (const name of state.fields) form.append(field(state.document, name));
    for (const [action, label] of [['apply', 'Apply'], ['remove', 'Remove']]) {
        const button = state.document.createElement('button');
        button.type = 'submit';
        button.value = action;
        button.textContent = label;
        form.append(button);
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        submit(state, event.submitter?.value || 'apply');
    });
    // A manual popover is not dismissed by the browser, and the form must be
    // escapable without acting on the link.
    form.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        cancel(state);
    });
    container.append(style, form);
    state.style = style;
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
    const popover = form.hasAttribute('popover') && typeof form.showPopover === 'function';
    if (visible) {
        form.hidden = false;
        if (popover && !form.matches(':popover-open')) form.showPopover();
        return;
    }
    if (popover && form.matches(':popover-open')) form.hidePopover();
    form.hidden = true;
}

