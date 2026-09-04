// The other half of `place`: where a contextual UI hands the caret back when it
// is done. After the element it was about to change, never inside it — whoever
// just named an image or made a link wants to keep writing, without it. The
// surface takes the focus first, so what it captures is a selection it owns.
//
// An element that is no longer there leaves the surface with what it had.
// The same hand-back where there is no element left: emptying an address takes the link away, and
// what follows it is the end of the text it used to be.
export function caretAfterRange(surface, range) {
    surface.element.focus();
    if (!range || !surface.element.contains(range.endContainer)) return surface.restore();
    const selection = surface.core.selection;
    const collapsed = range.cloneRange();
    collapsed.collapse(false);
    selection.removeAllRanges();
    selection.addRange(collapsed);
    return !!surface.capture();
}

export function caretAfter(surface, element) {
    surface.element.focus();
    if (!element?.isConnected) return surface.restore();
    const range = surface.element.ownerDocument.createRange();
    // The start of what follows, rather than the boundary behind the element: engines resolve a
    // caret at that boundary towards the element it sits behind, and typing would go on inside the
    // link that was just left. Naming the text node instead says the same place without the pull.
    const next = element.nextSibling;
    if (next?.nodeType === Node.TEXT_NODE) range.setStart(next, 0);
    else range.setStartAfter(element);
    range.collapse(true);
    const selection = surface.core.selection;
    selection.removeAllRanges();
    selection.addRange(range);
    return !!surface.capture();
}
