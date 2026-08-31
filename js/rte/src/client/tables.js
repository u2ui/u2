import {Tables} from '../command/table.js';
import {inlineUi} from '../config/config.js';
import {elementOf} from '../selection/ownership/ownership.js';
import {Handles} from '../ui/handles.js';


// Where each handle sits: `axis` picks the edge it lines up with, `at` the
// fraction along the cell it is anchored to.
const HANDLES = [
    {name: 'rowBefore', axis: 'row', at: 0, label: 'Row above', text: '+'},
    {name: 'rowDelete', axis: 'row', at: 0.5, label: 'Delete row', text: '×'},
    {name: 'rowAfter', axis: 'row', at: 1, label: 'Row below', text: '+'},
    {name: 'columnBefore', axis: 'column', at: 0, label: 'Column before', text: '+'},
    {name: 'columnDelete', axis: 'column', at: 0.5, label: 'Delete column', text: '×'},
    {name: 'columnAfter', axis: 'column', at: 1, label: 'Column after', text: '+'},
];

// Optional table module. Inserting a table is a toolbar action because it
// applies where no table is; everything else belongs to a table that exists, so
// it appears on that table — row handles down its left edge, column handles
// along its top, lined up with the cell the caret is in.
export function tableTools({tag = 'table'} = {}) {
    const tables = new Tables(tag);
    const editors = new WeakMap();
    return Object.freeze({
        name: 'tables',
        setup({editor, root, chrome}) {
            const state = {
                root,
                chrome,
                document: root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument,
                views: new WeakMap(),
                active: null,
                handles: null,
                controller: null,
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
        commands({editor, surface, commands}) {
            const state = editors.get(editor);
            if (!state) throw new DOMException('The table extension is not set up', 'InvalidStateError');
            state.views.set(surface, {surface, commands});
            return tables.commands;
        },
        attach({editor, surface}) {
            const state = editors.get(editor);
            const view = state?.views.get(surface);
            if (!view) throw new DOMException('The table surface is not set up', 'InvalidStateError');
            const controller = new state.document.defaultView.AbortController();
            const listen = {signal: controller.signal};
            const sync = () => track(state, view);
            surface.addEventListener('u2-rte-selectionchange', sync, listen);
            surface.addEventListener('u2-rte-change', sync, listen);
            surface.addEventListener('u2-rte-deactivate', () => close(state, surface), listen);
            surface.element.addEventListener('input', sync, listen);
            return {dispose() {
                controller.abort();
                close(state, surface);
                state.views.delete(surface);
            }};
        },
        toolbar: Object.freeze([Object.freeze({command: 'insertTable', label: 'Insert table', text: '⊞'})]),
    });
}

export const tables = tableTools();

function track(state, view) {
    if (!inlineUi(view.surface.config, 'table')) return close(state, view.surface);
    const cell = cellAt(view.surface);
    if (!cell) return close(state, view.surface);
    build(state);
    state.active = {view, cell};
    state.handles.show();
    for (const handle of HANDLES) state.handles.disable(handle.name, !view.commands.enabled(handle.name));
    schedule(state);
}

function close(state, surface) {
    if (surface && state.active && state.active.view.surface !== surface) return;
    state.active = null;
    state.handles?.show(false);
}

// The cell the surface's saved selection sits in, if any.
function cellAt(surface) {
    const range = surface.selection?.range();
    if (!range) return null;
    for (let element = elementOf(range.startContainer); element && element !== surface.element;
        element = element.parentElement) {
        if (element.matches('td, th') && surface.element.contains(element)) return element;
    }
    return null;
}

function schedule(state) {
    if (state.frame || !state.handles) return;
    state.frame = state.document.defaultView.requestAnimationFrame(() => {
        state.frame = 0;
        position(state);
    });
}

function position(state) {
    const cell = state.active?.cell;
    const table = cell?.isConnected && cell.closest('table');
    if (!table) return close(state);
    const box = cell.getBoundingClientRect();
    const bounds = table.getBoundingClientRect();
    const edge = 12;
    // One axis follows the cell, the other sits just outside the table's edge.
    for (const {name, axis, at} of HANDLES) {
        const centre = axis === 'row'
            ? {x: bounds.left - edge, y: box.top + box.height * at}
            : {x: box.left + box.width * at, y: bounds.top - edge};
        state.handles.place(name, centre.x, centre.y);
    }
}

function build(state) {
    if (state.handles) return state.handles;
    state.handles = new Handles(state.chrome.root, {
        name: 'tables',
        handles: HANDLES,
        action: name => run(state, name),
    });
    const controller = new state.document.defaultView.AbortController();
    const reposition = () => state.active && schedule(state);
    state.root.addEventListener('scroll', reposition,
        {capture: true, passive: true, signal: controller.signal});
    state.document.defaultView.addEventListener('resize', reposition, {signal: controller.signal});
    state.controller = controller;
    return state.handles;
}

function run(state, name) {
    const active = state.active;
    if (!active?.view.surface.connected) return;
    const {view} = active;
    if (!view.surface.capture()) view.surface.restore();
    view.commands.run(name);
    view.surface.element.focus();
    track(state, view);
}

function release(state) {
    state.controller?.abort();
    if (state.frame) state.document.defaultView.cancelAnimationFrame(state.frame);
    state.handles?.dispose();
    state.active = null;
    state.frame = 0;
    state.handles = null;
    state.controller = null;
}
