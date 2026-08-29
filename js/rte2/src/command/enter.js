import {Point} from '../selection/point/point.js';

// The host policy names the element Enter splits; `block` follows the
// configured default block, the structural values name their own unit.
const UNITS = Object.freeze({item: ['li'], row: ['tr'], cell: ['td', 'th']});
const LISTS = Object.freeze(['ul', 'ol', 'menu']);

export const enter = {
    inputTypes: ['insertParagraph'],
    enabled: editable,
    run(edit) {
        const exited = exitList(edit);
        if (exited) return exited;
        const unit = structure(edit);
        return unit ? split(edit, unit) : insertBreak(edit);
    },
};

export const lineBreak = {
    inputTypes: ['insertLineBreak'],
    enabled: editable,
    run: edit => insertBreak(edit),
};

// Both commands replace one caret with new structure. A selection would have to
// be deleted first, and atomic content is indivisible, so the browser keeps its
// native behavior in those cases.
function editable(edit) {
    if (!edit.range?.collapsed) return false;
    for (let element = closest(edit.range.start.node); element && element !== edit.element; element = element.parentElement) {
        if (edit.model.atomic(element)) return false;
    }
    return true;
}

function structure(edit) {
    const {enter: mode, block: tag} = edit.config;
    if (mode === 'break') return null;
    const tags = UNITS[mode] || (tag ? [tag] : []);
    for (let element = closest(edit.range.start.node); element && element !== edit.element; element = element.parentElement) {
        if (tags.includes(element.localName) && edit.model.allows(element.parentElement, element)) return element;
    }
    return null;
}

function exitList(edit) {
    const {enter: mode, block: tag} = edit.config;
    if (!tag || mode !== 'block' && mode !== 'item') return null;
    let item = closest(edit.range.start.node);
    while (item && item !== edit.element && item.localName !== 'li') item = item.parentElement;
    if (!item || item === edit.element || !empty(item, edit.model, item)) return null;
    const list = item.parentElement;
    if (!LISTS.includes(list?.localName) || list === edit.element) return null;
    const parent = list.parentElement;
    const block = edit.document.createElement(tag);
    if (!edit.model.allows(parent, block)) return null;

    const start = continuation(list, item);
    const offset = [...list.childNodes].indexOf(item);
    edit.map.remove(item);
    const at = edit.map.split(parent, list, offset);
    const tail = parent.childNodes[at];
    let trailing = tail;
    edit.map.insert(parent, at, block);
    edit.map.insert(block, 0, edit.document.createElement('br'));
    if (!list.children.length) {
        if (tail.children.length) {
            while (tail.firstChild) edit.map.move(tail.firstChild, list, list.childNodes.length);
            edit.map.remove(tail);
            edit.map.move(list, parent, [...parent.childNodes].indexOf(block) + 1);
            trailing = list;
        } else {
            edit.map.remove(list);
            edit.map.remove(tail);
            trailing = null;
        }
    } else if (!tail.children.length) {
        edit.map.remove(tail);
        trailing = null;
    }
    if (start !== null && trailing) trailing.setAttribute('start', start);
    edit.transaction.touch(parent);
    edit.select(new Point(block, 0, 'forward'));
    return block;
}

function continuation(list, item) {
    if (list.localName !== 'ol') return null;
    const items = [...list.children].filter(child => child.localName === 'li');
    const target = items.indexOf(item) + 1;
    if (!target || target >= items.length || items[target].hasAttribute('value')) return null;
    let value = list.hasAttribute('start') ? list.start : list.reversed ? items.length : 1;
    const step = list.reversed ? -1 : 1;
    for (let index = 0; index < target; index++) {
        if (items[index].hasAttribute('value')) value = items[index].value;
        value += step;
    }
    return String(value);
}

function split(edit, unit) {
    const start = edit.range.start;
    const caret = new Point(start.node, start.offset, 'forward');
    edit.map.add(caret);
    const parent = unit.parentElement;
    const tail = parent.childNodes[edit.map.split(parent, start.node, start.offset)];
    const position = edit.map.get(caret);
    fill(edit, unit);
    fill(edit, tail);
    edit.transaction.touch(unit);
    edit.transaction.touch(tail);
    edit.select(position);
    return tail;
}

function insertBreak(edit) {
    const start = edit.range.start;
    const caret = new Point(start.node, start.offset, 'forward');
    edit.map.add(caret);
    const parent = closest(start.node);
    const index = edit.map.split(parent, start.node, start.offset);
    const separator = edit.document.createElement('br');
    edit.map.insert(parent, index, separator);
    const position = edit.map.get(caret);
    // A break at the end of its block needs a second one to become visible.
    if (!following(edit, separator)) edit.map.insert(parent, index + 1, edit.document.createElement('br'));
    edit.transaction.touch(parent);
    edit.select(position);
    return separator;
}

// An empty block has no caret position of its own until it holds a break.
function fill(edit, element) {
    if (!blank(edit.model, element)) return null;
    const filler = edit.document.createElement('br');
    edit.map.insert(element, element.childNodes.length, filler);
    return filler;
}

function following(edit, node) {
    const limit = block(edit, node);
    for (let current = node; current && current !== limit; current = current.parentElement) {
        for (let sibling = current.nextSibling; sibling; sibling = sibling.nextSibling) {
            if (!blank(edit.model, sibling)) return true;
        }
    }
    return false;
}

function block(edit, node) {
    for (let element = node.parentElement; element && element !== edit.element; element = element.parentElement) {
        if (edit.model.block(element)) return element;
    }
    return edit.element;
}

function blank(model, node) {
    if (node.nodeType === Node.TEXT_NODE) return !node.data.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    if (model.atomic(node) || node.textContent.trim()) return false;
    return ![...node.querySelectorAll('*')].some(element => model.atomic(element));
}

function empty(node, model, root) {
    if (node.nodeType === Node.TEXT_NODE) return !node.data.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    if (node.localName === 'br') return true;
    if (node !== root && (node.hasAttribute('contenteditable') || model.atomic(node))) return false;
    return [...node.childNodes].every(child => empty(child, model, root));
}

function closest(node) {
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
