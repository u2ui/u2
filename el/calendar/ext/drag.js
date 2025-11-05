// Globale Drag-States
let draggedItem = null;
let currentDropTarget = null;

// Hilfsfunktionen für 'part'
function addPart(el, partName) {
    const parts = (el.getAttribute('part') || '').split(/\s+/).filter(Boolean);
    if (!parts.includes(partName)) parts.push(partName);
    el.setAttribute('part', parts.join(' '));
}

function removePart(el, partName) {
    const parts = (el.getAttribute('part') || '').split(/\s+/).filter(p => p !== partName);
    if (parts.length) el.setAttribute('part', parts.join(' '));
    else el.removeAttribute('part');
}

document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('[draggable="true"]');
    if (!item) return;
    if (item.tagName.toLowerCase() !== 'u2-calendaritem') return;
    draggedItem = item;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    e.dataTransfer.setDragImage(img, 0, 0);
});


document.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.composedPath().find(el => el.closest?.('.day'))?.closest('.day');
    if (!target || target === currentDropTarget) return;

    currentDropTarget && removePart(currentDropTarget, 'drop-target');
    currentDropTarget = target;
    addPart(target, 'drop-target');
});

document.addEventListener('dragend', () => {
    currentDropTarget && removePart(currentDropTarget, 'drop-target');
    draggedItem = null;
    currentDropTarget = null;
});

document.addEventListener('drop', (e) => {
    if (!draggedItem || !currentDropTarget) return;
    e.preventDefault();

    const [year, month, day] = currentDropTarget.dataset.date.split('-').map(Number);
    const startTime = new Date(draggedItem.getAttribute('start'));
    const endTime = new Date(draggedItem.getAttribute('end'));
    const duration = endTime - startTime;

    const newStart = new Date(startTime); // smarter?
    newStart.setFullYear(year, month - 1, day); 

    const newEnd = new Date(newStart.getTime() + duration);

    draggedItem.setAttribute('start', newStart.toISOString());
    draggedItem.setAttribute('end', newEnd.toISOString());

    removePart(currentDropTarget, 'drop-target');
    draggedItem = null;
    currentDropTarget = null;
});
