
export let dragged = null;

document.addEventListener('dragstart', (e) => {
    // composedPath() instead of e.target: for events from a shadow root e.target is retargeted
    // to the host -> we would drag the wrong element. The dragged element is the first
    // [draggable] in the path (works the same in light and shadow DOM).
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
