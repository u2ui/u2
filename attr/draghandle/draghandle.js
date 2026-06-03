import 'https://bernardo-castilho.github.io/DragDropTouch/DragDropTouch.js';

const css = `
[u2-draghandle] {
    cursor: grab;
    touch-action: none; /* needed? probably yes */
}
`;
document.head.insertAdjacentHTML('afterbegin', `<style>${css}</style>`);


// pointermove statt pointerover/-out: Bewegungen INNERHALB eines Shadow-Roots erzeugen für einen
// document-Listener keine over/out-Events (target & relatedTarget retargeten beide auf den Host ->
// gleicher Knoten -> Event wird unterdrückt). pointermove feuert dagegen kontinuierlich, und
// composedPath()[0] liefert das echte Element unter dem Zeiger – auch im Shadow-DOM.
let activeDraggable = null;
document.addEventListener('pointermove', e => {
    const handle = e.composedPath()[0]?.closest?.('[u2-draghandle]');
    const draggable = handle ? handle.closest('[draggable]') : null;
    if (draggable === activeDraggable) return; // kein Wechsel -> nichts tun
    activeDraggable?.setAttribute('draggable', 'false');
    activeDraggable = draggable;
    draggable?.setAttribute('draggable', 'true');
}, true);
