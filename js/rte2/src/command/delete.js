import {Point} from '../selection/point/point.js';
import {blockEdge, emptyBlock} from './block-boundary.js';

// Collapsed deletion owns only the boundary between compatible mergeable
// blocks. Character and range deletion remain native.
export const deleteBackward = deletion('backward', 'deleteContentBackward');
export const deleteForward = deletion('forward', 'deleteContentForward');

function deletion(direction, inputType) {
    return {
        inputTypes: [inputType],
        enabled: edit => !!boundary(edit, direction),
        run(edit) {
            const pair = boundary(edit, direction);
            return pair ? merge(edit, pair.left, pair.right, pair.between) : undefined;
        },
    };
}

function merge(edit, left, right, between) {
    const parent = left.parentElement;
    const leftEmpty = emptyBlock(left, edit.model);
    const rightEmpty = emptyBlock(right, edit.model);
    for (const node of between) edit.map.remove(node);
    if (rightEmpty) {
        edit.map.remove(right);
        edit.transaction.touch(parent);
        edit.select(leftEmpty
            ? new Point(left, 0, 'forward')
            : new Point(left, left.childNodes.length, 'backward'));
        return left;
    }

    if (leftEmpty) while (left.firstChild) edit.map.remove(left.firstChild);
    const caret = new Point(left, left.childNodes.length, 'backward');
    edit.map.add(caret);
    while (right.firstChild) edit.map.move(right.firstChild, left, left.childNodes.length);
    edit.map.remove(right);
    edit.transaction.touch(left);
    edit.transaction.touch(parent);
    edit.select(edit.map.get(caret));
    return left;
}

function boundary(edit, direction) {
    const point = edit.range?.collapsed && edit.range.start;
    if (!point || insideAtomic(edit, point.node)) return null;
    const edge = direction === 'backward' ? 'start' : 'end';
    for (let current = closest(point.node); current && current !== edit.element; current = current.parentElement) {
        if (!edit.model.mergeable(current) || !atEdge(current, point, edge, edit.model)) continue;
        const adjacent = neighbor(current, direction, edit.model);
        const [left, right] = direction === 'backward' ? [adjacent.node, current] : [current, adjacent.node];
        if (compatible(edit.model, left, right)) return {left, right, between: adjacent.between};
    }
    return null;
}

function neighbor(current, direction, model) {
    const property = direction === 'backward' ? 'previousSibling' : 'nextSibling';
    const between = [];
    let node = current[property];
    while (node && node.nodeType !== Node.ELEMENT_NODE && emptyBlock(node, model)) {
        between.push(node);
        node = node[property];
    }
    return {node, between};
}

function compatible(model, left, right) {
    if (left?.nodeType !== Node.ELEMENT_NODE || right?.nodeType !== Node.ELEMENT_NODE
        || !model.mergeable(left) || !model.mergeable(right)) return false;
    if (emptyBlock(right, model)) return true;
    return [...right.childNodes].every(child => model.allows(left, child));
}

function atEdge(unit, point, edge, model) {
    // Every DOM position inside an empty block denotes its one visual caret.
    // A filler br is therefore not a special boundary of its own.
    return emptyBlock(unit, model) || blockEdge(unit, point, edge);
}

function insideAtomic(edit, node) {
    for (let element = closest(node); element && element !== edit.element; element = element.parentElement) {
        if (edit.model.atomic(element)) return true;
    }
    return false;
}

function closest(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
