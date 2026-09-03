import {rangeRect} from '../browser/range-rect.js';

// One placement policy for every contextual UI: anchor on the surface's saved
// selection, keep the element inside the viewport, and fall to the other side
// when the preferred one does not fit.
//
// A UI that belongs to one element rather than to the selection passes that
// element's rect as `on`: what it points at should not shift with the caret.
// One distance for every panel that hangs off something, and between two of them
// — near enough to read as belonging to it. What must be cleared belongs in the
// rect a caller anchors on, not in this number: a frame's handles reach past the
// element they sit on, and the panel below them is told so.
export const panelGap = 8;

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
    const left = Math.max(gap, Math.min(view.innerWidth - box.width - gap, start));
    element.style.left = `${left}px`;
    element.style.top = `${clear(element, {top, left, width: box.width, height: box.height}, gap)}px`;
    return true;
}

// Two panels can answer for the same thing — an image that is also a link — and
// the second must not sit on the first. What is already drawn keeps its spot and
// the newcomer goes under it, in the order the chrome holds them, so the same
// two always stack the same way round.
function clear(element, box, gap) {
    let top = box.top;
    for (const panel of element.getRootNode().querySelectorAll?.('.panel') ?? []) {
        if (panel === element || panel.hidden) continue;
        const other = panel.getBoundingClientRect();
        const misses = other.bottom <= top || other.top >= top + box.height
            || other.right <= box.left || other.left >= box.left + box.width;
        if (!misses) top = other.bottom + gap;
    }
    return top;
}
