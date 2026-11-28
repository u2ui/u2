// cell navigations
const cell = (grid, row, col) => grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col}"]`);
const page = (row, col, grid, fn) => {
    fn();
    setTimeout(() => (cell(grid, row, col) || grid.querySelector(':scope > :last-child')).focus(), 10);
};
const calendarKeyDownFns = {
    ArrowLeft:  (r, c, g) => cell(g, r, c - 1),
    ArrowRight: (r, c, g) => cell(g, r, c + 1),
    ArrowUp:    (r, c, g) => cell(g, r - 1, c),
    ArrowDown:  (r, c, g) => cell(g, r + 1, c),
    PageUp:     (r, c, g, cal) => page(r, c, g, () => cal.prev()),
    PageDown:   (r, c, g, cal) => page(r, c, g, () => cal.next()),
    Home:       (r, c, g) => cell(g, 1, 1),
    End:        (r, c, g) => g.querySelector(':scope > :last-child'),
};
document.addEventListener('keydown', e=>{
    if (e.target.tagName !== 'U2-CALENDAR') return;

    const path = e.composedPath();
    const actualTarget = path[0];
    const calendar = e.target;

    if (actualTarget.matches('.grid > *')) {
        const row = parseInt(actualTarget.ariaRowIndex, 10);
        const col = parseInt(actualTarget.ariaColIndex, 10);
        const grid = actualTarget.closest('.grid');

        let nextTarget = calendarKeyDownFns[e.key]?.(row, col, grid, calendar);

        if (nextTarget) {
            nextTarget.focus();
            e.preventDefault();
        }

    }
});


// Handle scroll navigation for month change
document.addEventListener('wheel', e => {
    if (e.target.tagName !== 'U2-CALENDAR') return;

    const path = e.composedPath();
    const target = path[0];

    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const calendar = e.target;
    
    const grid = target.closest('.grid');
    if (grid) {
        e.preventDefault();
        e.deltaY > 0 ? calendar.next() : calendar.prev();
    }
}, { passive: false });


// move event by one day left or right
document.addEventListener('keydown', e => {
    const item = e.target.closest('u2-calendar-item');
    if (!item) return;
    if (!item.draggable) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const offset = e.key === 'ArrowLeft' ? -1 : 1;
        
        const startTime = new Date(item.getAttribute('start'));
        const endTime = new Date(item.getAttribute('end'));
        const duration = endTime - startTime;
        
        const newStart = new Date(startTime);
        newStart.setDate(startTime.getDate() + offset);
        
        const newEnd = new Date(newStart.getTime() + duration);

        item.setAttribute('start', newStart.toISOString());
        if (item.end) item.setAttribute('end', newEnd.toISOString());
        
        e.preventDefault();
        setTimeout(() => item.shadowRoot.querySelector('*')?.focus(), 16);
    }
});
