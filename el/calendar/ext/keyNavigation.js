
document.addEventListener('keydown', e=>{
    if (e.target.tagName !== 'U2-CALENDAR') return;

    const path = e.composedPath();
    const actualTarget = path[0]; // Element, das das Event wirklich ausgelöst hat

    // cell 
    if (actualTarget.matches('.grid > *')) {

        const row = parseInt(actualTarget.dataset.row, 10);
        const col = parseInt(actualTarget.dataset.col, 10);
        const parent = actualTarget.closest('.grid');

        let nextTarget;

        switch (e.key) {
            case 'ArrowRight':
                nextTarget = actualTarget.nextElementSibling;
                break;

            case 'ArrowLeft':
                nextTarget = actualTarget.previousElementSibling;
                break;

            case 'ArrowDown':
                nextTarget = parent.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
                break;

            case 'ArrowUp':
                nextTarget = parent.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
                break;
        }

        if (nextTarget) {
            nextTarget.focus();
            e.preventDefault(); // Verhindert Scrollen etc.
        }

    }
})