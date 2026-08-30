const EDITABLE_VALUES = new Set(['', 'true', 'false', 'plaintext-only']);

export function isEditableHost(element) {
    const value = editableValue(element);
    return value === '' || value === 'true' || value === 'plaintext-only';
}

export function isPlainTextHost(element) {
    return editableValue(element) === 'plaintext-only';
}

export function isEditingBoundary(element) {
    return editableValue(element) !== null;
}

// The element context of a node: itself when it is one, otherwise its parent.
// Traversals start here so text and element boundaries behave identically.
export function elementOf(node) {
    return node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement || null;
}

export function editingHost(node) {
    for (let element = elementOf(node); element; element = element.parentElement) {
        if (editableValue(element) !== null) return element;
    }
    return null;
}

export function belongsTo(node, host) {
    return !!node && (node === host || host.contains(node)) && editingHost(node) === host;
}

export function selectionOf(host) {
    const root = host.getRootNode();
    return root.getSelection?.() || host.ownerDocument.getSelection();
}

function editableValue(element) {
    if (!element?.hasAttribute?.('contenteditable')) return null;
    const value = element.getAttribute('contenteditable').toLowerCase();
    return EDITABLE_VALUES.has(value) ? value : null;
}
