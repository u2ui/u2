import {Point} from '../selection/point/point.js';
import {fill} from './block-boundary.js';

// Inserts one prepared element at the selection. The content model decides
// where it belongs: the block is split only as far as the nearest container
// that accepts the element, so a block-level rule separates paragraphs while an
// inline element stays inside its text.
//
// A selection is not deleted first: the element lands where the selection
// starts and the selected content stays after it. Insertion may not depend on a
// caret — a toolbar shown only for a selection would never offer it.
export function insertNode(create, inputTypes = []) {
    if (typeof create !== 'function') throw new TypeError('Node insertion requires a factory function');
    if (!Array.isArray(inputTypes)) throw new TypeError('Input types must be an array');
    return {
        inputTypes: [...inputTypes],
        enabled: edit => !!container(edit, create(edit.document)),
        run: edit => insert(edit, create(edit.document)),
    };
}

function insert(edit, node) {
    const parent = container(edit, node);
    if (!parent) return null;
    const start = edit.range.start;
    const caret = new Point(start.node, start.offset, 'forward');
    edit.map.add(caret);
    const at = edit.map.split(parent, start.node, start.offset);
    edit.map.insert(parent, at, node);
    const position = edit.map.get(caret);
    // Splitting at a block edge leaves an empty half that needs a caret.
    for (const sibling of [parent.childNodes[at - 1], parent.childNodes[at + 1]]) {
        if (sibling?.nodeType === Node.ELEMENT_NODE && edit.model.block(sibling)) fill(edit, sibling);
    }
    edit.transaction.touch(parent);
    edit.select(position);
    return node;
}

function container(edit, node) {
    const start = edit.range?.start;
    if (!start) return null;
    const from = start.node.nodeType === Node.ELEMENT_NODE ? start.node : start.node.parentElement;
    for (let element = from; element && element !== edit.element; element = element.parentElement) {
        if (edit.model.atomic(element)) return null;
    }
    for (let element = from; element; element = element.parentElement) {
        if (edit.model.allows(element, node)) return element;
        if (element === edit.element) return null;
    }
    return null;
}
