
export let dragged = null;

document.addEventListener('dragstart', (e) => {
    dragged = null;
    // composedPath() statt e.target: bei Events aus einem Shadow-Root ist e.target auf den
    // Host retargetiert -> wir würden das falsche Element ziehen. Das gezogene Element ist
    // das erste [draggable] im Pfad (funktioniert in Light- und Shadow-DOM gleich).
    dragged = e.composedPath().find(n => n.nodeType === 1 && n.draggable);
    if (!dragged) return;
    dragged.classList.add(':dragging-image');
    requestAnimationFrame(() => { // add styles after native dragImage is created
        dragged.classList.remove(':dragging-image')
        dragged.classList.add(':dragging');
    });
});

document.addEventListener('dragend', () => {
    if (!dragged) return; // just handle elements
    dragged.classList.remove(':dragging');
});







/* this works *
document.addEventListener('dragstart', (e) => {
    const element = e.target;
    const clone = element.cloneNode(true);
    clone.innerHTML = 'Dragging...';
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, 20, 20);
    requestAnimationFrame(() => clone.remove());
});
*/
