import '../../vendor/dragdroptouch/DragDropTouch.js';

const css = `
[u2-draghandle] {
    cursor: grab;
    touch-action: none; /* needed? probably yes */
}
`;
document.head.insertAdjacentHTML('afterbegin', `<style>${css}</style>`);


// pointermove instead of pointerover/-out: moves INSIDE a shadow root fire no over/out events for a
// document listener (target & relatedTarget are both retargeted to the host -> same node -> the
// event is suppressed). pointermove fires continuously, and composedPath()[0] is the real element
// under the pointer – in shadow DOM as well.
let activeDraggable = null;
document.addEventListener('pointermove', e => {
    const handle = e.composedPath()[0]?.closest?.('[u2-draghandle]');
    const draggable = handle?.closest('[draggable]') ?? null;
    if (draggable === activeDraggable) return; // no change -> nothing to do
    activeDraggable?.setAttribute('draggable', 'false');
    activeDraggable = draggable;
    draggable?.setAttribute('draggable', 'true');
}, true);
