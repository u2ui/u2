import {rangeRect} from '../browser/range-rect.js';

// One placement policy for every contextual UI: anchor on the surface's saved
// selection, keep the element inside the viewport, and fall to the other side
// when the preferred one does not fit.
//
// A UI that belongs to one element rather than to the selection passes that
// element's rect as `on`: what it points at should not shift with the caret.
export function place(element, surface, {align = 'center', prefer = 'above', gap = 28, on = null} = {}) {
    const range = on ? null : surface.selection?.range();
    if (!on && !range) return false;
    const anchor = on || rangeRect(range, {root: surface.element});
    const view = element.ownerDocument.defaultView;
    const box = element.getBoundingClientRect();
    const start = align === 'center' ? anchor.left + anchor.width / 2 - box.width / 2 : anchor.left;
    const above = anchor.top - box.height - gap;
    const below = anchor.bottom + gap;
    const fits = prefer === 'above' ? above >= gap : below + box.height + gap <= view.innerHeight;
    const top = prefer === 'above'
        ? (fits ? above : Math.min(view.innerHeight - box.height - gap, below))
        : (fits ? below : Math.max(gap, above));
    element.style.left = `${Math.max(gap, Math.min(view.innerWidth - box.width - gap, start))}px`;
    element.style.top = `${top}px`;
    return true;
}
