import {EditRange} from '../selection/range/edit-range.js';
import {Point, indexOf} from '../selection/point/point.js';

// Inserts only an already prepared DOM fragment. Parsing, security sanitizing,
// presentation cleanup, and clipboard access remain outside this command.
export const insertFragment = {
    enabled: edit => !!edit.range && !!edit.fragment
        && (!!edit.fragment.childNodes.length || !edit.range.collapsed),
    run(edit) {
        const state = prepare(edit);
        if (!edit.range.collapsed) removeSelection(edit, state);
        const nodes = [...edit.fragment.childNodes];
        const end = new Point(edit.fragment, nodes.length, 'forward');
        edit.map.add(end);
        if (nodes.length) {
            const point = edit.map.get(state.start);
            const target = insertionTarget(edit, point, nodes);
            edit.map.insertFragment(target.parent, target.offset, edit.fragment);
            edit.transaction.touch(target.parent);
            for (const node of nodes) edit.transaction.touch(node);
        }
        edit.select(nodes.length ? edit.map.get(end) : edit.map.get(state.start));
        return nodes;
    },
};

function prepare(edit) {
    const start = new Point(edit.range.start.node, edit.range.start.offset, 'forward');
    const end = new Point(edit.range.end.node, edit.range.end.offset, 'backward');
    edit.map.add(start).add(end);
    splitText(edit, end);
    splitText(edit, start);
    return {start, end};
}

function splitText(edit, point) {
    const current = edit.map.get(point);
    if (current.node.nodeType === Node.TEXT_NODE && current.offset > 0 && current.offset < current.node.length) {
        edit.map.splitText(current.node, current.offset);
    }
}

function removeSelection(edit, state) {
    const range = EditRange.fromPoints(edit.map.get(state.start), edit.map.get(state.end), edit.element);
    for (const node of range.roots()) {
        const parent = node.parentNode;
        edit.map.remove(node);
        edit.transaction.touch(parent);
    }
}

function insertionTarget(edit, point, nodes) {
    let {parent, offset} = childBoundary(point);
    while (parent !== edit.element && !nodes.every(node => edit.model.allows(parent, node))) {
        const grand = parent.parentNode;
        const index = indexOf(parent);
        if (offset === 0) {
            offset = index;
        } else if (offset === parent.childNodes.length) {
            offset = index + 1;
        } else {
            offset = edit.map.split(grand, parent, offset);
            edit.transaction.touch(parent).touch(grand);
        }
        parent = grand;
    }
    return {parent, offset};
}

function childBoundary(point) {
    if (point.node.nodeType !== Node.TEXT_NODE) return {parent: point.node, offset: point.offset};
    const parent = point.node.parentNode;
    const index = indexOf(point.node);
    return {parent, offset: index + (point.offset === point.node.length ? 1 : 0)};
}

