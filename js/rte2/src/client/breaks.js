import {editingHost} from '../selection/ownership/ownership.js';

const STYLE = `
[data-u2-rte-break-layer] {
    background: transparent;
    border: 0;
    inset: 0;
    margin: 0;
    padding: 0;
    pointer-events: none;
    position: fixed;
}
[data-u2-rte-break-marker] {
    color: color-mix(in srgb, currentColor 48%, transparent);
    font: 0.88em/1 system-ui, sans-serif;
    pointer-events: none;
    position: fixed;
    transform: translate(0.36em, 0.15em);
    white-space: nowrap;
}
`;

const FALSE = new Set(['', '0', 'false', 'none', 'off', 'hide', 'auto']);

// Optional view-only extension. Its state never enters editable HTML and its
// command deliberately runs outside an editing transaction.
export function breakMarks() {
    const editors = new WeakMap();
    return Object.freeze({
        name: 'breaks',
        setup({editor, root}) {
            const state = {
                root,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                views: new Set(),
                surfaces: new WeakMap(),
                style: null,
                layer: null,
                controller: null,
                observer: null,
                frame: 0,
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
        commands({editor, surface}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The line-break extension is not set up', 'InvalidStateError');
            const view = {surface, visible: configured(surface.element), markers: []};
            state.surfaces.set(surface, view);
            return {showBreaks: {
                transaction: false,
                state: () => view.visible,
                run() {
                    view.visible = !view.visible;
                    render(surface.element, view.visible);
                    sync(state, view);
                    return view.visible;
                },
            }};
        },
        attach({editor, surface}) {
            const state = editors.get(editor);
            const view = state?.surfaces.get(surface);
            if (!state || !view) throw new DOMException('The line-break surface is not set up', 'InvalidStateError');
            const original = surface.element.getAttribute('data-u2-rte-breaks');
            const controller = new state.document.defaultView.AbortController();
            const schedule = () => view.visible && scheduleRefresh(state);
            surface.element.addEventListener('input', schedule, {signal: controller.signal});
            surface.addEventListener('u2-rte-change', schedule, {signal: controller.signal});
            surface.addEventListener('u2-rte-activate', schedule, {signal: controller.signal});
            state.views.add(view);
            render(surface.element, view.visible);
            sync(state, view);
            let connected = true;
            return {dispose() {
                if (!connected) return;
                controller.abort();
                original === null
                    ? surface.element.removeAttribute('data-u2-rte-breaks')
                    : surface.element.setAttribute('data-u2-rte-breaks', original);
                state.observer?.unobserve(surface.element);
                removeMarkers(view);
                state.views.delete(view);
                state.surfaces.delete(surface);
                if (![...state.views].some(item => item.visible)) release(state);
                connected = false;
            }};
        },
        toolbar: Object.freeze([Object.freeze({
            name: 'breaks',
            command: 'showBreaks',
            label: 'Show line breaks',
            text: '↵',
            state: true,
        })]),
    });
}

export const breaks = breakMarks();

function configured(element) {
    const value = getComputedStyle(element).getPropertyValue('--u2-rte-show-breaks').trim().toLowerCase();
    return !FALSE.has(value);
}

function render(element, visible) {
    element.toggleAttribute('data-u2-rte-breaks', visible);
}

function sync(state, view) {
    if (!view.visible) {
        state.observer?.unobserve(view.surface.element);
        removeMarkers(view);
        if (![...state.views].some(item => item.visible)) release(state);
        return;
    }
    ensure(state);
    state.observer?.observe(view.surface.element);
    refreshView(state, view);
}

function ensure(state) {
    if (state.layer) return;
    const container = state.root.nodeType === Node.DOCUMENT_NODE
        ? state.document.body || state.document.documentElement
        : state.root;
    const styles = state.root.nodeType === Node.DOCUMENT_NODE
        ? state.document.head || state.document.documentElement
        : state.root;
    const style = state.document.createElement('style');
    style.dataset.u2RteBreaksStyle = '';
    style.textContent = STYLE;
    const layer = state.document.createElement('div');
    layer.dataset.u2RteBreakLayer = '';
    layer.setAttribute('aria-hidden', 'true');
    styles.append(style);
    container.append(layer);
    if (typeof layer.showPopover === 'function') {
        layer.popover = 'manual';
        layer.showPopover();
    }
    const controller = new state.document.defaultView.AbortController();
    const schedule = () => scheduleRefresh(state);
    state.root.addEventListener('scroll', schedule, {capture: true, signal: controller.signal});
    state.document.defaultView.addEventListener('resize', schedule, {signal: controller.signal});
    const Observer = state.document.defaultView.ResizeObserver;
    state.observer = typeof Observer === 'function' ? new Observer(schedule) : null;
    state.style = style;
    state.layer = layer;
    state.controller = controller;
}

function scheduleRefresh(state) {
    if (state.frame || !state.layer) return;
    state.frame = state.document.defaultView.requestAnimationFrame(() => {
        state.frame = 0;
        for (const view of state.views) if (view.visible) refreshView(state, view);
    });
}

function refreshView(state, view) {
    const breaks = [...view.surface.element.querySelectorAll('br')]
        .filter(element => editingHost(element) === view.surface.element);
    while (view.markers.length < breaks.length) {
        const marker = state.document.createElement('span');
        marker.dataset.u2RteBreakMarker = '';
        marker.textContent = '↵';
        state.layer.append(marker);
        view.markers.push(marker);
    }
    while (view.markers.length > breaks.length) view.markers.pop().remove();
    for (let index = 0; index < breaks.length; index++) {
        const marker = view.markers[index];
        const rect = breakRect(breaks[index]);
        marker.hidden = !rect;
        if (!rect) continue;
        marker.style.left = `${rect.left}px`;
        marker.style.top = `${rect.top}px`;
    }
}

function breakRect(element) {
    const range = element.ownerDocument.createRange();
    range.selectNode(element);
    const rect = range.getClientRects()[0] || range.getBoundingClientRect();
    return rect && (rect.width || rect.height || rect.x || rect.y) ? rect : null;
}

function removeMarkers(view) {
    for (const marker of view.markers) marker.remove();
    view.markers = [];
}

function release(state) {
    if (state.frame) state.document.defaultView.cancelAnimationFrame(state.frame);
    state.controller?.abort();
    state.observer?.disconnect();
    state.layer?.remove();
    state.style?.remove();
    state.frame = 0;
    state.controller = null;
    state.observer = null;
    state.layer = null;
    state.style = null;
}
