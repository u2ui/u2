// Native collapsed ranges may report an empty rectangle. Derive the same caret
// boundary from adjacent rendered content without mutating DOM or selection.
export function rangeRect(range, {root = null} = {}) {
    if (!range?.getBoundingClientRect || !range?.cloneRange) throw new TypeError('Range geometry requires a native Range');
    if (root !== null && (typeof root?.contains !== 'function'
        || !contains(root, range.startContainer) || !contains(root, range.endContainer))) {
        throw new RangeError('Range geometry root must contain the range');
    }
    const native = range.getBoundingClientRect();
    if (!range.collapsed || located(native)) return native;
    return after(range.startContainer, range.startOffset)
        || before(range.startContainer, range.startOffset)
        || ancestor(range.startContainer, root)
        || native;
}

function after(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        return offset < container.length ? textEdge(container, offset, false) : null;
    }
    const child = container.childNodes[offset];
    return child ? nodeEdge(child, false) : null;
}

function before(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        return offset > 0 ? textEdge(container, offset - 1, true) : null;
    }
    const child = container.childNodes[offset - 1];
    return child ? nodeEdge(child, true) : null;
}

function nodeEdge(node, end) {
    if (node.nodeType === Node.TEXT_NODE) {
        if (!node.length) return null;
        return textEdge(node, end ? node.length - 1 : 0, end);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const child = node.childNodes[end ? node.childNodes.length - 1 : 0];
    const nested = child && nodeEdge(child, end);
    if (nested) return nested;
    const rect = node.getBoundingClientRect();
    return located(rect) ? edge(rect, end) : null;
}

function textEdge(node, offset, end) {
    const range = node.ownerDocument.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getBoundingClientRect();
    return located(rect) ? edge(rect, end) : null;
}

function ancestor(node, root) {
    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (element) {
        const rect = element.getBoundingClientRect();
        if (located(rect)) return edge(rect, false);
        if (element === root) break;
        element = element.parentElement;
    }
    return null;
}

function edge(rect, end) {
    const left = end ? rect.right : rect.left;
    const DOMRect = rect.constructor;
    if (typeof DOMRect?.fromRect === 'function') {
        return DOMRect.fromRect({x: left, y: rect.top, width: 0, height: rect.height});
    }
    return Object.freeze({x: left, y: rect.top, top: rect.top, right: left,
        bottom: rect.bottom, left, width: 0, height: rect.height});
}

function located(rect) {
    return !!rect && (rect.left !== 0 || rect.top !== 0 || rect.right !== 0 || rect.bottom !== 0
        || rect.width !== 0 || rect.height !== 0);
}

function contains(root, node) {
    return node === root || root.contains(node);
}
