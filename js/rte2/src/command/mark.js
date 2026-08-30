import {MarkAdapter} from '../mark/dom-adapter.js';
import {Mark, markSet} from '../mark/mark.js';
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

export function setMarks(adapters) {
    const known = adapterSet(adapters);
    return {
        enabled(edit) {
            const target = targetSet(edit.value, known);
            return selected(edit) && !!target && target.every(mark => {
                const adapter = known.get(mark.type);
                return markState(edit, adapter, mark) === true || canApply(edit, adapter, mark);
            });
        },
        state: edit => setState(edit, [...known.values()]),
        run(edit) {
            const target = targetSet(edit.value, known);
            if (!target) return [];
            const removals = [];
            for (const adapter of known.values()) {
                const kept = target.filter(mark => mark.type === adapter.type);
                for (const mark of marksIn(edit, adapter)) {
                    if (!kept.some(item => item.equals(mark))) removals.push([adapter, mark]);
                }
            }
            return change(edit, removals, target.map(mark => [known.get(mark.type), mark]));
        },
    };
}

function applyCommand(adapter, mark) {
    return {
        enabled: edit => selected(edit)
            && (markState(edit, adapter, mark) === true || canApply(edit, adapter, mark)),
        state: edit => markState(edit, adapter, mark),
        run(edit) {
            const removals = marksIn(edit, adapter)
                .filter(current => !current.equals(mark) && current.conflicts(mark))
                .map(current => [adapter, current]);
            return change(edit, removals, [[adapter, mark]]);
        },
    };
}

function removeCommand(adapter, mark) {
    if (!adapter.removable) throw new TypeError('Removing a mark requires a clear policy');
    return {
        enabled: edit => selected(edit) && markState(edit, adapter, mark) !== false,
        state: edit => markState(edit, adapter, mark),
        run: edit => change(edit, [[adapter, mark]]),
    };
}

function change(edit, removals = [], applications = []) {
    const state = prepare(edit);
    const changed = new Set();
    for (const [adapter, mark] of removals) {
        isolate(edit, adapter, mark, state);
        state.range = mappedRange(edit, state);
        for (const element of remove(edit, adapter, mark, state.range)) changed.add(element);
        state.range = mappedRange(edit, state);
    }
    for (const [adapter, mark] of applications) {
        for (const element of apply(edit, adapter, mark, state.range)) changed.add(element);
        state.range = mappedRange(edit, state);
    }
    canonicalize(edit, applications, state, changed);
    restore(edit, state);
    return [...changed];
}

function canonicalize(edit, applications, state, changed) {
    const entries = applications.map(([adapter, mark], order) => ({
        adapter,
        mark,
        order,
        pattern: adapter.render(mark, edit.document),
    }));
    while (entries.length) {
        state.range = mappedRange(edit, state);
        if (dedupe(edit, entries, state.range, changed) || reorder(edit, entries, state.range, changed)) continue;
        let merged = false;
        for (const {adapter, mark, pattern} of entries) {
            for (const [left, right] of merge(edit, adapter, mark, pattern, state.range)) {
                changed.delete(right);
                changed.add(left);
                merged = true;
            }
        }
        if (!merged) break;
    }
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
            const current = adapter.parse(element);
            if (current && current.conflicts(mark) && allowsAfterClear(edit, adapter, current, element, wrapper)) return true;
            if (covered(edit.range, element) && reusable(edit, adapter, element)) return true;
        }
        if (edit.model.allows(node.parentNode, wrapper)) return true;
    }
    return false;
}

function allowsAfterClear(edit, adapter, mark, element, wrapper) {
    if (!adapter.removable) return false;
    const cleared = element.cloneNode(false);
    const unwrap = adapter.clear(cleared, mark);
    let parent = cleared;
    if (unwrap && cleared.attributes.length && cleared.localName !== 'span') {
        parent = edit.document.createElement('span');
        for (const attribute of cleared.attributes) parent.setAttribute(attribute.name, attribute.value);
    } else if (unwrap && !cleared.attributes.length) {
        parent = element.parentNode;
    }
    return edit.model.allows(parent, wrapper);
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

function setState(edit, adapters) {
    if (!edit.range) return null;
    if (edit.range.collapsed) return marksAt(edit, adapters, edit.range.start.node);
    let state = null;
    for (const node of edit.range.textNodes()) {
        if (!node.data || blocked(edit, node)) continue;
        const marks = marksAt(edit, adapters, node);
        if (state && !sameSet(state, marks)) return 'mixed';
        state = marks;
    }
    return state;
}

function marksAt(edit, adapters, node) {
    if (blocked(edit, node)) return markSet([]);
    const elements = [];
    for (let element = parentElement(node); element && element !== edit.element; element = element.parentElement) {
        if (boundary(element) || edit.model.block(element)) break;
        elements.push(element);
    }
    const marks = [];
    for (const element of elements.reverse()) {
        for (const adapter of adapters) {
            const mark = adapter.parse(element);
            if (mark) marks.push(mark);
        }
    }
    return markSet(marks);
}

function marksIn(edit, adapter) {
    const marks = [];
    if (!edit.range) return marks;
    for (const node of edit.range.textNodes()) {
        if (!node.data || blocked(edit, node)) continue;
        for (let element = node.parentElement; element && element !== edit.element; element = element.parentElement) {
            if (boundary(element) || edit.model.block(element)) break;
            const mark = adapter.parse(element);
            if (mark && !marks.some(item => item.equals(mark))) marks.push(mark);
        }
    }
    return marks;
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
                if (current && !current.conflicts(mark)) {
                    visit(node);
                    continue;
                }
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

function merge(edit, adapter, mark, pattern, range) {
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

function dedupe(edit, entries, range, changed) {
    for (const element of elements(edit)) {
        if (!range.intersects(element) || boundary(element) || edit.model.atomic(element)) continue;
        const entry = representation(entries, element);
        if (!entry || !marked(edit, entry.adapter, entry.mark, element.parentNode)) continue;
        const parent = element.parentNode;
        edit.map.unwrap(element);
        joinText(edit, parent);
        edit.transaction.touch(parent);
        changed.delete(element);
        changed.add(parent);
        return true;
    }
    return false;
}

function reorder(edit, entries, range, changed) {
    for (const parent of elements(edit)) {
        if (!range.intersects(parent) || boundary(parent) || edit.model.atomic(parent)) continue;
        if (parent.childNodes.length !== 1 || parent.firstChild.nodeType !== Node.ELEMENT_NODE) continue;
        const child = parent.firstChild;
        const outer = representation(entries, parent);
        const inner = representation(entries, child);
        if (!outer || !inner || outer.order <= inner.order || !swappable(edit, parent, child)) continue;
        const grand = parent.parentNode;
        edit.map.unwrap(parent);
        edit.map.wrap([...child.childNodes], parent);
        edit.transaction.touch(grand).touch(child).touch(parent);
        changed.add(child).add(parent);
        return true;
    }
    return false;
}

function representation(entries, element) {
    let found = null;
    for (const entry of entries) {
        if (!canonical(entry.adapter, entry.mark, entry.pattern, element)) continue;
        if (found) return null;
        found = entry;
    }
    return found;
}

function swappable(edit, parent, child) {
    return inline(edit, parent)
        && inline(edit, child)
        && edit.model.allows(parent.parentNode, child)
        && edit.model.allows(child, parent)
        && [...child.childNodes].every(node => edit.model.allows(parent, node));
}

function elements(edit) {
    const found = [];
    const visit = parent => {
        for (const child of parent.children) {
            found.push(child);
            if (!boundary(child) && !edit.model.atomic(child)) visit(child);
        }
    };
    visit(edit.element);
    return found;
}

function joinText(edit, parent) {
    for (let node = parent.firstChild; node;) {
        const next = node.nextSibling;
        if (node.nodeType === Node.TEXT_NODE && next?.nodeType === Node.TEXT_NODE) edit.map.mergeText(node, next);
        else node = next;
    }
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

function adapterSet(adapters) {
    if (!Array.isArray(adapters) || !adapters.length) throw new TypeError('A mark set command requires adapters');
    const known = new Map();
    for (const adapter of adapters) {
        if (!(adapter instanceof MarkAdapter)) throw new TypeError('A mark set command requires mark adapters');
        if (!adapter.removable) throw new TypeError('A mark set adapter requires a clear policy');
        if (known.has(adapter.type)) throw new RangeError('A mark set command requires one adapter per mark type');
        known.set(adapter.type, adapter);
    }
    return known;
}

function targetSet(value, adapters) {
    if (!Array.isArray(value) || value.some(mark => !(mark instanceof Mark) || !adapters.has(mark.type))) return null;
    return markSet(value);
}

function sameSet(left, right) {
    return left.length === right.length && left.every((mark, index) => mark.equals(right[index]));
}

function boundary(element) {
    return element.hasAttribute('contenteditable');
}

function parentElement(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
