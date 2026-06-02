// u2-tree DnD — minimal. Drag state from js/drag/drag.js, marker from js/drag/indicateDrop.js.
// Draggable via the `draggable` HTML attribute. Region (before/after/into) from the pointer Y.
// Two events, detail {source, parent, next, region}:
//   u2-tree-dragover  decides WHETHER a drop is allowed here. preventDefault() = forbid (hides marker, no drop).
//   u2-tree-drop      commit on release. preventDefault() = app moves it itself (e.g. server-first) instead of auto-move.
import { dragged } from '../../../js/drag/drag.js';
import { indicateDrop } from '../../../js/drag/indicateDrop.js';

let over = null, region = '', allowed = true, expandTimer;
const clear = () => (clearTimeout(expandTimer), indicateDrop(null), over = null, region = '');

const place = (target, reg) => reg === 'into'
    ? { parent: target, next: null }
    : { parent: target.parentNode, next: reg === 'before' ? target : target.nextElementSibling };

const ask = (type, target) => target.dispatchEvent(new CustomEvent(type, {
    bubbles: true, cancelable: true,
    detail: { source: dragged, ...place(target, region), region },
}));

document.addEventListener('dragover', e => {
    if (!dragged) return;
    // composedPath() durchquert Shadow-Grenzen; e.target wäre auf den Shadow-Host retargetiert.
    const target = e.composedPath().find(n => n.localName === dragged.localName);
    if (!target || dragged.contains(target)) return clear();
    const row = target.shadowRoot.querySelector('[part=row]');
    const r = row.getBoundingClientRect();
    const rel = (e.clientY - r.top) / r.height;
    const reg = rel < .25 ? 'before' : rel > .75 ? 'after' : 'into';

    if (target !== over || reg !== region) {
        over = target; region = reg;
        allowed = ask('u2-tree-dragover', target);
        clearTimeout(expandTimer);
        if (reg === 'into')
            expandTimer = setTimeout(() => target.isExpanded() || target.toggleExpand(true), allowed ? 650 : 1300);
    }
    if (!allowed) return indicateDrop(null);
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    indicateDrop(region, row, { box: 'content' });
});

document.addEventListener('drop', () => {
    if (over && allowed && ask('u2-tree-drop', over)) {
        const { parent, next } = place(over, region);
        parent.insertBefore(dragged, next);
        region === 'into' && parent.toggleExpand?.(true);
    }
    clear();
});

document.addEventListener('dragend', clear);
