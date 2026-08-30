import {EditRange} from '../selection/range/edit-range.js';
import {Point} from '../selection/point/point.js';
import {Unstyle, defaultUnstyle} from '../unstyle/unstyle.js';

export function unstyleCommand(policy = defaultUnstyle) {
    if (!(policy instanceof Unstyle)) throw new TypeError('An unstyle command requires a policy');
    return {
        inputTypes: ['formatRemove'],
        enabled: edit => !!next(edit, policy.levels),
        state: edit => next(edit, policy.levels)?.name || null,
        run: edit => run(edit, next(edit, policy.levels)),
    };
}

function next(edit, levels) {
    if (!edit.range || edit.range.collapsed) return null;
    return levels.find(item => targets(edit, item, edit.range, true).length) || null;
}

function run(edit, level) {
    if (!level) return;
    const state = prepare(edit);
    isolate(edit, level, state.end);
    isolate(edit, level, state.start);
    const range = mappedRange(edit, state);
    const changed = targets(edit, level, range);
    for (const element of changed.reverse()) clear(edit, level, element);
    edit.select(edit.map.get(state.start), edit.map.get(state.end), state.backward);
    return {level: level.name, changed};
}

function targets(edit, level, range, preview = false) {
    const result = [];
    const visit = parent => {
        for (const element of parent.children) {
            if (boundary(element) || !range.intersects(element)) continue;
            if (!edit.model.atomic(element)) visit(element);
            if (!applicable(edit, level, element)) continue;
            if (covered(range, element) || preview && inline(edit, element)) result.push(element);
        }
    };
    visit(edit.element);
    return result;
}

function clear(edit, level, element) {
    const parent = element.parentNode;
    for (const name of level.attributes) element.removeAttribute(name);
    const unwrap = level.elements.includes(element.localName)
        || element.localName === 'span' && !element.attributes.length;
    if (unwrap && inline(edit, element)) edit.map.unwrap(element);
    edit.transaction.touch(unwrap ? parent : element).touch(parent);
}

function prepare(edit) {
    const start = new Point(edit.range.start.node, edit.range.start.offset, 'forward');
    const end = new Point(edit.range.end.node, edit.range.end.offset, 'backward');
    edit.map.add(start).add(end);
    splitText(edit, end);
    splitText(edit, start);
    return {start, end, backward: !!edit.surface.selection?.backward};
}

function splitText(edit, point) {
    const current = edit.map.get(point);
    if (current.node.nodeType === Node.TEXT_NODE && current.offset > 0 && current.offset < current.node.length) {
        edit.map.splitText(current.node, current.offset);
    }
}

function isolate(edit, level, point) {
    const current = edit.map.get(point);
    const wrapper = matchingWrapper(edit, level, current.node);
    if (!wrapper || !inside(current, wrapper)) return;
    edit.transaction.touch(wrapper.parentNode);
    edit.map.split(wrapper.parentNode, current.node, current.offset);
}

function matchingWrapper(edit, level, node) {
    let found = null;
    for (let element = parentElement(node); element && element !== edit.element; element = element.parentElement) {
        if (boundary(element) || !inline(edit, element)) break;
        if (applicable(edit, level, element)) found = element;
    }
    return found;
}

function applicable(edit, level, element) {
    return level.attributes.some(name => element.hasAttribute(name))
        || level.elements.includes(element.localName) && inline(edit, element);
}

function covered(range, element) {
    if (!element.childNodes.length) return range.contains(element);
    return [...element.childNodes].every(node => {
        if (node.nodeType === Node.TEXT_NODE) return !node.data || range.contains(node);
        if (node.nodeType !== Node.ELEMENT_NODE || !node.childNodes.length) return range.contains(node);
        return covered(range, node);
    });
}

function inline(edit, element) {
    return element !== edit.element && !boundary(element)
        && !edit.model.block(element) && !edit.model.atomic(element);
}

function mappedRange(edit, state) {
    return EditRange.fromPoints(edit.map.get(state.start), edit.map.get(state.end), edit.element);
}

function inside(point, element) {
    return point.within(element) && !atEdge(point, element, 'start') && !atEdge(point, element, 'end');
}

function atEdge(point, element, edge) {
    let node = point.node;
    let offset = point.offset;
    while (node !== element) {
        const length = typeof node.length === 'number' ? node.length : node.childNodes.length;
        if (offset !== (edge === 'start' ? 0 : length)) return false;
        const parent = node.parentNode;
        offset = Array.prototype.indexOf.call(parent.childNodes, node) + (edge === 'end' ? 1 : 0);
        node = parent;
    }
    return offset === (edge === 'start' ? 0 : element.childNodes.length);
}

function boundary(element) {
    return element.hasAttribute('contenteditable');
}

function parentElement(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
