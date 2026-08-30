import {MarkAdapter} from '../mark/dom-adapter.js';
import {Mark} from '../mark/mark.js';
import {EditRange} from '../selection/range/edit-range.js';
import {Point} from '../selection/point/point.js';

export function applyMark(adapter, value) {
    const mark = concrete(adapter, arguments.length > 1 ? value : true);
    return applyCommand(adapter, mark);
}

export function removeMark(adapter, value) {
    const mark = concrete(adapter, arguments.length > 1 ? value : true);
    return removeCommand(adapter, mark);
}

export function toggleMark(adapter, value) {
    const mark = concrete(adapter, arguments.length > 1 ? value : true);
    const apply = applyCommand(adapter, mark);
    const remove = removeCommand(adapter, mark);
    return {
        enabled: edit => {
            if (!selected(edit)) return false;
            return markState(edit, adapter, mark) === true || canApply(edit, adapter, mark);
        },
        state: apply.state,
        run(edit) {
            return (markState(edit, adapter, mark) === true ? remove : apply).run(edit);
        },
    };
}

function applyCommand(adapter, mark) {
    return {
        enabled: edit => selected(edit)
            && (markState(edit, adapter, mark) === true || canApply(edit, adapter, mark)),
        state: edit => markState(edit, adapter, mark),
        run(edit) {
            const state = prepare(edit);
            const changed = new Set(apply(edit, adapter, mark, state.range));
            state.range = mappedRange(edit, state);
            for (const [left, right] of merge(edit, adapter, mark, state.range)) {
                changed.delete(right);
                changed.add(left);
            }
            restore(edit, state);
            return [...changed];
        },
    };
}

function removeCommand(adapter, mark) {
    if (!adapter.removable) throw new TypeError('Removing a mark requires a clear policy');
    return {
        enabled: edit => selected(edit) && markState(edit, adapter, mark) !== false,
        state: edit => markState(edit, adapter, mark),
        run(edit) {
            const state = prepare(edit);
            isolate(edit, adapter, mark, state);
            state.range = mappedRange(edit, state);
            const changed = remove(edit, adapter, mark, state.range);
            restore(edit, state);
            return changed;
        },
    };
}

function selected(edit) {
    return !!edit.range && !edit.range.collapsed;
}

function canApply(edit, adapter, mark) {
    if (!selected(edit)) return false;
    const wrapper = adapter.render(mark, edit.document);
    for (const node of edit.range.textNodes()) {
        if (!node.data || blocked(edit, node) || has(edit, adapter, mark, node)) continue;
        for (let element = node.parentElement; element && element !== edit.element; element = element.parentElement) {
            if (edit.model.block(element) || boundary(element)) break;
            if (covered(edit.range, element) && reusable(edit, adapter, element)) return true;
        }
        if (edit.model.allows(node.parentNode, wrapper)) return true;
    }
    return false;
}

function markState(edit, adapter, mark) {
    if (!edit.range) return null;
    if (edit.range.collapsed) {
        const node = edit.range.start.node;
        return !blocked(edit, node) && has(edit, adapter, mark, node);
    }
    let active = false;
    let inactive = false;
    for (const node of edit.range.textNodes()) {
        if (!node.data || blocked(edit, node)) continue;
        has(edit, adapter, mark, node) ? active = true : inactive = true;
        if (active && inactive) return 'mixed';
    }
    return active;
}

function apply(edit, adapter, mark, range) {
    const changed = [];
    const visit = parent => {
        for (const node of [...parent.childNodes]) {
            if (!range.intersects(node)) continue;
            if (node.nodeType === Node.TEXT_NODE) {
                if (!node.data || !range.contains(node) || has(edit, adapter, mark, node)) continue;
                const wrapper = adapter.render(mark, edit.document);
                if (!edit.model.allows(parent, wrapper)) continue;
                edit.map.wrap([node], wrapper);
                edit.transaction.touch(wrapper);
                changed.push(wrapper);
                continue;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || boundary(node) || edit.model.atomic(node)) continue;
            if (covered(range, node) && reusable(edit, adapter, node)) {
                const current = adapter.parse(node);
                if (!current?.equals(mark)) {
                    if (current?.type === mark.type && adapter.removable) adapter.clear(node, current);
                    adapter.apply(node, mark);
                    edit.transaction.touch(node);
                    changed.push(node);
                }
                continue;
            }
            visit(node);
        }
    };
    visit(edit.element);
    return changed;
}

function remove(edit, adapter, mark, range) {
    const matches = [];
    const visit = parent => {
        for (const node of parent.children) {
            if (boundary(node) || !range.intersects(node)) continue;
            const current = adapter.parse(node);
            if (current?.equals(mark) && covered(range, node) && inline(edit, node)) matches.push(node);
            visit(node);
        }
    };
    visit(edit.element);
    const changed = [];
    for (const element of matches.reverse()) {
        const parent = element.parentNode;
        const unwrap = adapter.clear(element, mark);
        if (unwrap && element.attributes.length && element.localName !== 'span') {
            const replacement = edit.document.createElement('span');
            for (const attribute of element.attributes) replacement.setAttribute(attribute.name, attribute.value);
            edit.map.replaceWrapper(element, replacement);
            edit.transaction.touch(replacement).touch(parent);
        } else if (unwrap && !element.attributes.length) {
            edit.map.unwrap(element);
            edit.transaction.touch(parent);
        } else {
            edit.transaction.touch(element);
        }
        changed.push(element);
    }
    return changed;
}

function merge(edit, adapter, mark, range) {
    const pattern = adapter.render(mark, edit.document);
    const changed = [];
    const visit = parent => {
        for (const child of [...parent.children]) {
            if (!boundary(child) && !edit.model.atomic(child) && range.intersects(child)) visit(child);
        }
        for (let left = parent.firstChild; left;) {
            const right = left.nextSibling;
            if (!right) break;
            if (canonical(adapter, mark, pattern, left)
                && canonical(adapter, mark, pattern, right)
                && (range.intersects(left) || range.intersects(right))) {
                join(edit, left, right);
                changed.push([left, right]);
            } else {
                left = right;
            }
        }
    };
    visit(edit.element);
    return changed;
}

function canonical(adapter, mark, pattern, element) {
    return element.nodeType === Node.ELEMENT_NODE
        && adapter.parse(element)?.equals(mark)
        && element.cloneNode(false).isEqualNode(pattern);
}

function join(edit, left, right) {
    const before = left.lastChild;
    while (right.firstChild) edit.map.move(right.firstChild, left, left.childNodes.length);
    edit.map.remove(right);
    const after = before?.nextSibling;
    if (before?.nodeType === Node.TEXT_NODE && after?.nodeType === Node.TEXT_NODE) edit.map.mergeText(before, after);
    edit.transaction.touch(left).touch(left.parentNode);
}

function prepare(edit) {
    const start = new Point(edit.range.start.node, edit.range.start.offset, 'forward');
    const end = new Point(edit.range.end.node, edit.range.end.offset, 'backward');
    edit.map.add(start).add(end);
    splitText(edit, end);
    splitText(edit, start);
    return {start, end, backward: !!edit.surface.selection?.backward, range: mappedRange(edit, {start, end})};
}

function splitText(edit, point) {
    const current = edit.map.get(point);
    if (current.node.nodeType === Node.TEXT_NODE && current.offset > 0 && current.offset < current.node.length) {
        edit.map.splitText(current.node, current.offset);
    }
}

function isolate(edit, adapter, mark, state) {
    splitMark(edit, adapter, mark, state.end);
    splitMark(edit, adapter, mark, state.start);
}

function splitMark(edit, adapter, mark, point) {
    const current = edit.map.get(point);
    const wrapper = marked(edit, adapter, mark, current.node);
    if (!wrapper || !inside(current, wrapper)) return;
    edit.transaction.touch(wrapper.parentNode);
    edit.map.split(wrapper.parentNode, current.node, current.offset);
}

function marked(edit, adapter, mark, node) {
    let found = null;
    for (let element = parentElement(node); element && element !== edit.element; element = element.parentElement) {
        if (boundary(element) || edit.model.block(element)) break;
        if (adapter.parse(element)?.equals(mark)) found = element;
    }
    return found;
}

function has(edit, adapter, mark, node) {
    for (let element = parentElement(node); element && element !== edit.element; element = element.parentElement) {
        if (boundary(element) || edit.model.block(element)) return false;
        if (adapter.parse(element)?.equals(mark)) return true;
    }
    return false;
}

function blocked(edit, node) {
    for (let element = parentElement(node); element && element !== edit.element; element = element.parentElement) {
        if (boundary(element) || edit.model.atomic(element)) return true;
    }
    return false;
}

function reusable(edit, adapter, element) {
    return adapter.canReuse(element) && inline(edit, element);
}

function inline(edit, element) {
    return element !== edit.element
        && !boundary(element)
        && (typeof edit.model.allowed !== 'function' || edit.model.allowed(element))
        && edit.model.is(element, 'phrasing')
        && !edit.model.block(element)
        && !edit.model.atomic(element);
}

function covered(range, element) {
    if (!element.childNodes.length) return range.contains(element);
    return [...element.childNodes].every(node => {
        if (node.nodeType === Node.TEXT_NODE) return !node.data || range.contains(node);
        if (node.nodeType !== Node.ELEMENT_NODE || !node.childNodes.length) return range.contains(node);
        return covered(range, node);
    });
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

function mappedRange(edit, {start, end}) {
    return EditRange.fromPoints(edit.map.get(start), edit.map.get(end), edit.element);
}

function restore(edit, state) {
    edit.select(edit.map.get(state.start), edit.map.get(state.end), state.backward);
}

function concrete(adapter, value) {
    if (!(adapter instanceof MarkAdapter)) throw new TypeError('A mark command requires a mark adapter');
    const mark = value instanceof Mark ? value : adapter.type.create(value);
    if (mark.type !== adapter.type) throw new TypeError('A mark command requires the adapter\'s mark type');
    return mark;
}

function boundary(element) {
    return element.hasAttribute('contenteditable');
}

function parentElement(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
