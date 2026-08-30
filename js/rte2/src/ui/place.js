import {rangeRect} from '../browser/range-rect.js';

// One placement policy for every contextual UI: anchor on the surface's saved
// selection, keep the element inside the viewport, and fall to the other side
// when the preferred one does not fit.
export function place(element, surface, {align = 'center', prefer = 'above'} = {}) {
    const range = surface.selection?.range();
    if (!range) return false;
    const anchor = rangeRect(range, {root: surface.element});
    const view = element.ownerDocument.defaultView;
    const box = element.getBoundingClientRect();
    const gap = 8;
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
