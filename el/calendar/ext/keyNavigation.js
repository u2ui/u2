// cell navigations
const calendarKeyDownFns = {
    'ArrowLeft': (row, col, grid)=>{
        return grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col - 1}"]`);
    },
    'ArrowRight': (row, col, grid)=>{
        return grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col + 1}"]`);
    },
    'ArrowUp': (row, col, grid)=>{
        return grid.querySelector(`[aria-rowindex="${row - 1}"][aria-colindex="${col}"]`);
    },
    'ArrowDown': (row, col, grid)=>{
        return grid.querySelector(`[aria-rowindex="${row + 1}"][aria-colindex="${col}"]`);
    },
    'PageUp': (row, col, grid, calendar)=>{
        calendar.prev();
        setTimeout(()=>{
            const nextTarget = grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col}"]`);
            nextTarget.focus();
        }, 10);
    },
    'PageDown': (row, col, grid, calendar)=>{
        calendar.next();
        setTimeout(()=>{
            const nextTarget = grid.querySelector(`[aria-rowindex="${row}"][aria-colindex="${col}"]`);
            if (nextTarget) nextTarget.focus();
            else grid.querySelector(':scope > :last-child').focus();
        }, 10);
    },
    'Home': (row, col, grid)=>{
        return grid.querySelector(`[aria-rowindex="1"][aria-colindex="1"]`);
    },
    'End': (row, col, grid)=>{
        return grid.querySelector(':scope > :last-child');
    },
}
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
        if (e.deltaY > 0) calendar.next();
        else calendar.prev();
    }
}, { passive: false });


// move event by one day left or right
document.addEventListener('keydown', e => {
    const item = e.target.closest('u2-calendaritem');
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