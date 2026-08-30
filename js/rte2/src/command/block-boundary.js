// Editor emptiness differs from textContent emptiness: a filler br is empty,
// while atomic content and nested editing boundaries are meaningful.
export function emptyBlock(node, model, root = node) {
    if (node.nodeType === Node.TEXT_NODE) return !node.data.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    if (node.localName === 'br') return true;
    if (node !== root && (node.hasAttribute('contenteditable') || model.atomic(node))) return false;
    return [...node.childNodes].every(child => emptyBlock(child, model, root));
}

export function blockEdge(unit, point, edge) {
    if (edge !== 'start' && edge !== 'end') throw new TypeError('Block edge must be start or end');
    let {node, offset} = point;
    while (node !== unit) {
        const length = node.nodeType === Node.TEXT_NODE ? node.length : node.childNodes.length;
        if (offset !== (edge === 'start' ? 0 : length)) return false;
        const parent = node.parentNode;
        if (!parent) return false;
        const index = [...parent.childNodes].indexOf(node);
        offset = index + (edge === 'end' ? 1 : 0);
        node = parent;
    }
    return offset === (edge === 'start' ? 0 : unit.childNodes.length);
}

// Emptiness for structural editing: a filler br already occupies its block, so
// unlike `emptyBlock` it counts as content and must not be doubled.
export function blank(model, node) {
    if (node.nodeType === Node.TEXT_NODE) return !node.data.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    if (model.atomic(node) || node.textContent.trim()) return false;
    return ![...node.querySelectorAll('*')].some(element => model.atomic(element));
}

// An empty block has no caret position of its own until it holds a break.
export function fill(edit, element) {
    if (!blank(edit.model, element)) return null;
    const filler = edit.document.createElement('br');
    edit.map.insert(element, element.childNodes.length, filler);
    return filler;
}
