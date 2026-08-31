// Editor UI normally lives outside a surface. Native top-layer isolation is
// the exception: a modal dialog, popover, or fullscreen host can only keep UI
// interactive when that UI is its flat-tree descendant. Retained nodes are
// therefore DOM children but never document content.
export function contentChildren(surface, parent = surface.element) {
    return [...parent.childNodes].filter(node => !surface.core.retains(node));
}

export function replaceContent(surface, ...nodes) {
    const root = surface.element;
    const retained = [...root.childNodes].filter(node => surface.core.retains(node));
    for (const node of [...root.childNodes]) if (!surface.core.retains(node)) node.remove();
    const fragment = root.ownerDocument.createDocumentFragment();
    fragment.append(...nodes);
    root.insertBefore(fragment, retained[0] || null);
}
