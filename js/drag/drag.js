
export let dragged = null;

document.addEventListener('dragstart', (e) => {
    dragged = null;
    if (e.target.nodeType === Node.TEXT_NODE) return;
    dragged = e.target;
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
