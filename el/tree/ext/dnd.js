// u2-tree DnD — minimal, mit Drop-Marker über den geteilten js/drag/indicateDrop.
// Ziehbar via HTML-Attribut `draggable`. Region (before/after/into) aus Maus-Y.
// Kein Lazy-Expand, kein Veto-Event.
import { indicateDrop } from '../../../js/drag/indicateDrop.js';

let dragged = null, over = null, region = '';
const clear = () => (indicateDrop(null), over = null);

document.addEventListener('dragstart', e => dragged = e.target);

document.addEventListener('dragover', e => {
    if (!dragged) return;
    const target = e.target.closest?.(dragged.localName);    // gleiche Sorte; nicht auf 'u2-tree' festgenagelt
    if (!target || dragged.contains(target)) return clear();  // nicht auf sich / in eigenen Teilbaum
    e.preventDefault();                                       // Drop hier erlauben (+ Cursor)
    const row = target.shadowRoot.querySelector('[part=row]');
    const r = row.getBoundingClientRect();
    const rel = (e.clientY - r.top) / r.height;
    region = rel < .25 ? 'before' : rel > .75 ? 'after' : 'into';
    over = target;
    indicateDrop(region === 'into' ? null : region, row);    // indicateDrop kann nur before/after
});

document.addEventListener('drop', () => {
    if (region === 'before') over?.before(dragged);
    else if (region === 'after') over?.after(dragged);
    else if (over) over.append(dragged), over.toggleExpand(true);  // hinein + aufklappen
    clear();
});

document.addEventListener('dragend', clear);
