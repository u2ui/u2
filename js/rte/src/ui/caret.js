// The other half of `place`: where a contextual UI hands the caret back when it
// is done. After the element it was about to change, never inside it — whoever
// just named an image or made a link wants to keep writing, without it. The
// surface takes the focus first, so what it captures is a selection it owns.
//
// An element that is no longer there leaves the surface with what it had.
export function caretAfter(surface, element) {
    surface.element.focus();
    if (!element?.isConnected) return surface.restore();
    const range = surface.element.ownerDocument.createRange();
    range.setStartAfter(element);
    range.collapse(true);
    const selection = surface.core.selection;
    selection.removeAllRanges();
    selection.addRange(range);
    return !!surface.capture();
}
