import {EditRange} from '../selection/range/edit-range.js';
import {elementOf, isEditingBoundary} from '../selection/ownership/ownership.js';
import {Point} from '../selection/point/point.js';
import {Unstyle, declared, defaultUnstyle, keepFor, removable, strip} from '../unstyle/unstyle.js';
import {indexOf} from '../selection/point/point.js';

// The structural rung is the ladder's end: presentation levels only ever strip
// attributes and unwrap inline elements, so without it a selection that is
// already plain inline content has nothing left to give. It needs the content
// model and mapped mutation, which is why it lives here rather than in the
// `Unstyle` policy that also runs on detached paste fragments.
const BLOCKS = Object.freeze({name: 'blocks'});

export function unstyleCommand(policy = defaultUnstyle, {blocks = true} = {}) {
    if (!(policy instanceof Unstyle)) throw new TypeError('An unstyle command requires a policy');
    const levels = blocks ? [...policy.levels, BLOCKS] : policy.levels;
    return {
        inputTypes: ['formatRemove'],
        enabled: edit => !!next(edit, levels),
        state: edit => next(edit, levels)?.name || null,
        run: edit => run(edit, next(edit, levels)),
    };
}

function next(edit, levels) {
    if (!edit.range || edit.range.collapsed) return null;
    for (const level of levels) {
        const found = level === BLOCKS
            ? structural(edit).length
            : targets(edit, level, edit.range, true).length;
        if (found) return level;
    }
    return null;
}

function run(edit, level) {
    if (!level) return;
    if (level === BLOCKS) return flatten(edit);
    const state = prepare(edit);
    isolate(edit, level, state.end);
    isolate(edit, level, state.start);
    const range = mappedRange(edit, state);
    const changed = targets(edit, level, range);
    for (const element of changed.reverse()) clear(edit, level, element);
    edit.select(edit.map.get(state.start), edit.map.get(state.end), state.backward);
    return {level: level.name, changed};
}

// Reduces every selected structure to the host's default block. One pass is
// enough: each outermost block is replaced by one default block per unit of
// content it holds, so lists, tables, quotes, and headings all collapse the
// same way without naming a single tag.
function flatten(edit) {
    const state = prepare(edit);
    const changed = [];
    for (const block of structural(edit).reverse()) changed.push(...reduce(edit, block));
    edit.select(edit.map.get(state.start), edit.map.get(state.end), state.backward);
    return {level: BLOCKS.name, changed};
}

function reduce(edit, block) {
    const parent = block.parentElement;
    const tag = edit.config.block;
    let at = indexOf(block);
    const created = [];
    const emit = nodes => {
        const target = edit.document.createElement(tag);
        edit.map.insert(parent, at++, target);
        for (const node of nodes) edit.map.move(node, target, target.childNodes.length);
        created.push(target);
    };
    // Content of its own and each nested structure become separate blocks, so
    // nothing is lost and nothing is merged that was not adjacent before.
    const visit = element => {
        let own = [];
        for (const node of [...element.childNodes]) {
            if (structure(edit, node)) {
                if (own.length) emit(own);
                own = [];
                visit(node);
            } else {
                own.push(node);
            }
        }
        if (own.length) emit(own);
    };
    visit(block);
    edit.map.remove(block);
    edit.transaction.touch(parent);
    return created;
}

// The outermost blocks in the selection that still hold structure to remove.
function structural(edit) {
    const tag = edit.config.block;
    if (!tag || !edit.range || edit.range.collapsed) return [];
    const found = new Set();
    for (const block of edit.range.blocks(element => element !== edit.element && structure(edit, element))) {
        let outermost = null;
        for (let element = block; element && element !== edit.element; element = element.parentElement) {
            if (structure(edit, element)) outermost = element;
        }
        if (outermost && reducible(edit, outermost, tag)) found.add(outermost);
    }
    return [...found];
}

// An atomic block is content, not structure: a rule or an image stays.
function structure(edit, node) {
    return node.nodeType === Node.ELEMENT_NODE
        && !isEditingBoundary(node)
        && edit.model.block(node)
        && !edit.model.atomic(node);
}

function reducible(edit, block, tag) {
    if (!edit.model.allows(block.parentElement, edit.document.createElement(tag))) return false;
    return block.localName !== tag || [...block.children].some(child => structure(edit, child));
}

function targets(edit, level, range, preview = false) {
    const result = [];
    const visit = parent => {
        for (const element of parent.children) {
            if (isEditingBoundary(element) || !range.intersects(element)) continue;
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
    strip(level, element, kept(edit, level));
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
    for (let element = elementOf(node); element && element !== edit.element; element = element.parentElement) {
        if (isEditingBoundary(element) || !inline(edit, element)) break;
        if (applicable(edit, level, element)) found = element;
    }
    return found;
}

function applicable(edit, level, element) {
    const keep = kept(edit, level);
    return level.attributes.some(name => removable(name, element, keep))
        || level.elements.includes(element.localName) && !declared(element, keep) && inline(edit, element);
}

// The host's content classes survive the foreign-presentation rungs, exactly as
// they survive paste cleanup; the rungs below that scope take them too.
function kept(edit, level) {
    const names = edit.config.classes;
    return keepFor(level, names.length ? new Set(names) : null);
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
    return element !== edit.element && !isEditingBoundary(element)
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

