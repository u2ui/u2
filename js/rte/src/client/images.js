import {elementAttributes, selectedElement} from '../command/element.js';
import {inlineUi} from '../config/config.js';
import {Handles} from '../ui/handles.js';
import {place} from '../ui/place.js';

const STYLE = `
#image {
    align-items: center;
    display: flex;
    gap: .57em;
    padding: .34em;

    input {
        background: transparent;
        border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
        border-radius: .34em;
        min-inline-size: 16em;
        padding: .17em .34em;
    }
}
`;


// Only the trailing edges: an image sits in a text flow with its top and its
// start edge held in place, so dragging the other side is the only direction
// that grows it where the eye expects. The corner keeps the proportion; the two
// edges change one measurement alone.
const HANDLES = Object.freeze([
    Object.freeze({name: 'se', label: 'Resize', x: 1, y: 1, axis: 'both', cursor: 'nwse-resize'}),
    Object.freeze({name: 'e', label: 'Width', x: 1, y: 0.5, axis: 'x', cursor: 'ew-resize'}),
    Object.freeze({name: 's', label: 'Height', x: 0.5, y: 1, axis: 'y', cursor: 'ns-resize'}),
]);

// Optional image module. A selected image gets a frame with corner handles; the
// drag resizes the frame only and the size is written once when it is released,
// so a resize is one undo step rather than a trail of them.
//
// It also gets its alt text, in a field below it: what an image says is part of
// the image, and a form nobody opens is a form everybody fills in.
//
// Size is expressed as `width` and `height` attributes because that is what the
// sanitize policy allows on an image. What is resizable is a selector, so an
// application can make any atomic element sizeable.
export function imageTools({selector = 'img', minimum = 16} = {}) {
    const match = element => element.matches(selector);
    const editors = new WeakMap();
    return Object.freeze({
        name: 'images',
        setup({editor, root, chrome}) {
            const state = {
                root,
                chrome,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                views: new WeakMap(),
                active: null,
                drag: null,
                minimum,
                handles: null,
                alt: null,
                controller: null,
                pending: 0,
            };
            editors.set(editor, state);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                release(state);
                editors.delete(editor);
                connected = false;
            }};
        },
        commands({editor, surface, commands}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The image extension is not set up', 'InvalidStateError');
            state.views.set(surface, {surface, commands});
            const size = elementAttributes(['width', 'height'], {match});
            return {
                imageSize: size,
                imageAlt: elementAttributes(['alt'], {match}),
                // No value clears both attributes, so the image is its own size.
                imageOriginal: {
                    enabled: edit => {
                        const element = selectedElement(edit, match);
                        return !!element && (element.hasAttribute('width') || element.hasAttribute('height'));
                    },
                    run: edit => size.run(edit),
                },
            };
        },
        attach({editor, surface}) {
            const state = editors.get(editor);
            const view = state?.views.get(surface);
            if (!view) throw new DOMException('The image surface is not set up', 'InvalidStateError');
            const controller = new state.document.defaultView.AbortController();
            const listen = {signal: controller.signal};
            const sync = () => track(state, view, match);
            surface.addEventListener('u2-rte-selectionchange', sync, listen);
            surface.addEventListener('u2-rte-change', sync, listen);
            surface.addEventListener('u2-rte-deactivate', () => close(state, surface), listen);
            // A click has to select the image itself: engines disagree about
            // whether pointing at one does, and nothing is addressable until it
            // is the selection.
            surface.element.addEventListener('click', event => {
                const element = event.composedPath()[0];
                if (element?.nodeType !== Node.ELEMENT_NODE || !element.matches?.(selector)) return;
                if (!surface.element.contains(element)) return;
                const range = state.document.createRange();
                range.selectNode(element);
                const selection = surface.core.selection;
                selection.removeAllRanges();
                selection.addRange(range);
                surface.capture();
                sync();
            }, listen);
            return {dispose() {
                controller.abort();
                close(state, surface);
                state.views.delete(surface);
            }};
        },
        toolbar: Object.freeze([Object.freeze({
            command: 'imageOriginal', name: 'imageOriginal', label: 'Original size', text: '⤢',
        })]),
    });
}

export const images = imageTools();

function track(state, view, match) {
    if (!inlineUi(view.surface.config, 'image')) return close(state, view.surface);
    const element = current(view, match);
    if (!element) return close(state, view.surface);
    build(state);
    state.active = {view, element};
    state.handles.show();
    state.alt.hidden = false;
    if (state.document.activeElement !== state.chrome.element) {
        state.alt.firstElementChild.value = element.getAttribute('alt') || '';
    }
    schedule(state);
}

function current(view, match) {
    const range = view.surface.selection?.range();
    if (!range || range.collapsed) return null;
    const contents = range.cloneContents();
    if (contents.childNodes.length !== 1) return null;
    const element = range.startContainer.childNodes[range.startOffset];
    return element?.nodeType === Node.ELEMENT_NODE && match(element)
        && view.surface.element.contains(element) ? element : null;
}

function close(state, surface) {
    if (surface && state.active && state.active.view.surface !== surface) return;
    state.active = null;
    state.drag = null;
    state.handles?.show(false);
    if (state.alt) state.alt.hidden = true;
}

// Naming the image moves the selection back onto it, and an engine follows that
// with focus — so the field takes it back, caret and all, exactly as the link
// form has to.
function name(state, field) {
    const active = state.active;
    if (!active) return null;
    const caret = [field.selectionStart, field.selectionEnd];
    active.view.commands.run('imageAlt', {value: {alt: field.value.trim()}, trigger: 'input'});
    field.focus();
    field.setSelectionRange(...caret);
    return active.element;
}

function schedule(state) {
    if (state.pending || !state.handles) return;
    state.pending = state.document.defaultView.requestAnimationFrame(() => {
        state.pending = 0;
        position(state);
    });
}

function position(state, box = null) {
    const element = state.active?.element;
    if (!element?.isConnected) return close(state);
    const rect = box || element.getBoundingClientRect();
    state.handles.frame(rect);
    for (const handle of HANDLES) {
        state.handles.place(handle.name, rect.left + rect.width * handle.x, rect.top + rect.height * handle.y);
    }
    // Below the image, clear of the handles sitting on its lower edge.
    place(state.alt, state.active.view.surface, {align: 'start', prefer: 'below', gap: 16, on: rect});
}

function build(state) {
    if (state.handles) return state.handles;
    const form = state.chrome.part('image', STYLE, 'form');
    form.className = 'panel';
    form.hidden = true;
    form.setAttribute('aria-label', 'Image');
    const field = state.document.createElement('input');
    field.type = 'text';
    field.name = 'alt';
    field.placeholder = 'Alt text';
    field.setAttribute('aria-label', 'Alt text');
    form.append(field);
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', () => name(state, field));
    state.alt = form;
    state.handles = new Handles(state.chrome.root, {
        name: 'images',
        handles: HANDLES,
        part: 'corner',
        press: name => start(state, name),
    });
    const controller = new state.document.defaultView.AbortController();
    const listen = {signal: controller.signal};
    const view = state.document.defaultView;
    view.addEventListener('pointermove', event => drag(state, event), listen);
    view.addEventListener('pointerup', event => drop(state, event), listen);
    view.addEventListener('resize', () => state.active && schedule(state), listen);
    state.root.addEventListener('scroll', () => state.active && schedule(state),
        {capture: true, passive: true, signal: controller.signal});
    state.controller = controller;
    return state.handles;
}

function start(state, name) {
    const handle = HANDLES.find(item => item.name === name);
    if (!handle || !state.active) return;
    const rect = state.active.element.getBoundingClientRect();
    // The top and start edges stay where the flow put them.
    state.drag = {rect, axis: handle.axis, ratio: rect.height / rect.width || 1};
}

function drag(state, event) {
    if (!state.drag) return;
    position(state, measure(state.drag, state.minimum, event));
}

function drop(state, event) {
    const drag = state.drag;
    state.drag = null;
    if (!drag || !state.active) return;
    const size = measure(drag, state.minimum, event);
    const {view, element} = state.active;
    if (!view.surface.connected) return;
    if (!view.surface.capture()) view.surface.restore();
    view.commands.run('imageSize', {
        value: {width: Math.round(size.width), height: Math.round(size.height)},
    });
    if (element.isConnected) schedule(state);
}

// The corner keeps the picture's proportion; an edge changes one measurement
// alone, which is a different intention and says so by where it sits.
function measure({rect, axis, ratio}, minimum, event) {
    const dragged = {
        width: Math.max(minimum, event.clientX - rect.left),
        height: Math.max(minimum, event.clientY - rect.top),
    };
    const width = axis === 'y' ? rect.width : dragged.width;
    const height = axis === 'x' ? rect.height : axis === 'y' ? dragged.height : width * ratio;
    return {width, height, left: rect.left, top: rect.top};
}

function release(state) {
    state.controller?.abort();
    if (state.pending) state.document.defaultView.cancelAnimationFrame(state.pending);
    state.handles?.dispose();
    state.active = null;
    state.drag = null;
    state.pending = 0;
    state.handles = null;
    state.controller = null;
}
