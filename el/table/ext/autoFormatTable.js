import { getTableColumns } from "../table.js";

export function autoFormatTable(table) {

    const root = table.shadowRoot || document.documentElement;
    let style = root.querySelector('style[data-autoformat]');
    if (!style) {
        style = document.createElement('style'); // ok, reicht fast immer
        style.dataset.autoformat = '';
        root.prepend(style);
    }

    style.textContent = `
        /* AUTO-FORMAT STYLES (BETA) */
        td.auto-numeric,
        td.auto-currency {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
        
        th.auto-vertical {
            writing-mode: vertical-rl;
            writing-mode: sideways-lr;
            white-space: nowrap;
        }
        
        td.auto-date {
            text-align: center;
            white-space: nowrap;
        }
        
        td.auto-boolean {
            text-align: center;
            font-size: 1.2em;
        }
        
        td.auto-percentage {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
        
        td.auto-email {
            word-break: break-all;
            font-size: 0.9em;
        }
        
        td.auto-url {
            word-break: break-all;
            xcolor: #0066cc;
        }
        
        td.auto-long-text {
            font-size:max(.8em, 12px);
        }
    `;

    const firstHeadTr = table.querySelector(':scope > thead > tr');
    if (firstHeadTr) {
        for (const th of firstHeadTr.children) {
            th.setAttribute('data-sort-handler', '');
            th.tabIndex = '0';
        }
    }

    const columns = getTableColumns(table);

    // Analyze and format each column
    for (const col of columns) {
        const allCells = col.cells;
        const bodyCells = allCells.filter(c => c.tagName === 'TD');
        const headerCell = allCells.find(c => c.tagName === 'TH');
        
        if (bodyCells.length === 0) continue;
        
        const values = bodyCells.map(c => c.textContent.trim());
        const nonEmptyValues = values.filter(v => v !== '');
        
        if (nonEmptyValues.length === 0) continue;

        // 1. NUMERIC CHECK
        const allNumeric = nonEmptyValues.every(v => !isNaN(v) && v !== '');
        if (allNumeric) {
            bodyCells.forEach(cell => cell.classList.add('auto-numeric'));
            
            // Normalize decimal places
            const decimals = nonEmptyValues.map(v => (v.split('.')[1] || '').length);
            const maxDecimals = Math.max(...decimals, 0);
            
            if (maxDecimals > 0) {
                bodyCells.forEach(cell => {
                    const num = parseFloat(cell.textContent);
                    if (!isNaN(num)) {
                        cell.textContent = num.toFixed(maxDecimals);
                    }
                });
            }
            continue; // Skip other checks if numeric
        }

        // 2. CURRENCY CHECK (€, $, £, CHF, etc.)
        const allCurrency = nonEmptyValues.every(v => 
            /^[€$£¥CHF]*\s*\d+([.,]\d{1,2})?$/.test(v)
        );
        if (allCurrency) {
            bodyCells.forEach(cell => {
                const text = cell.textContent.trim();
                const numericValue = text.replace(/[€$£¥CHF\s]/g, '').replace(',', '.');
                cell.setAttribute('data-sort', parseFloat(numericValue));                    
                cell.classList.add('auto-currency')
            });
            continue;
        }

        // 3. PERCENTAGE CHECK
        const allPercentage = nonEmptyValues.every(v => 
            /^\d+([.,]\d+)?%$/.test(v)
        );
        if (allPercentage) {
            bodyCells.forEach(cell => {
                cell.setAttribute('data-sort', parseFloat(cell.textContent.trim()));
                cell.classList.add('auto-percentage');
            });
            continue;
        }

        // 4. DATE CHECK
        const allDates = nonEmptyValues.every(v => {
            const parsed = Date.parse(v);
            return !isNaN(parsed) && v.length > 5; // Avoid false positives
        });
        if (allDates) {
            bodyCells.forEach(cell => {
                cell.classList.add('auto-date');
                const date = new Date(cell.textContent);
                if (!isNaN(date)) {
                    cell.setAttribute('data-sort', date.getTime());
                    cell.textContent = date.toLocaleDateString('de-CH');
                }
            });
            continue;
        }

        // 5. BOOLEAN CHECK
        const booleanValues = ['true', 'false', 'yes', 'no', 'ja', 'nein', '✓', '✗', 'x'];
        const allBoolean = nonEmptyValues.every(v => 
            booleanValues.includes(v.trim().toLowerCase())
        );
        if (allBoolean) {
            bodyCells.forEach(cell => {
                cell.classList.add('auto-boolean');
                const val = cell.textContent.trim().toLowerCase();
                if (['true', 'yes', 'ja', '✓'].includes(val)) {
                    cell.textContent = '🟢'; // ✓ ●
                } else if (['false', 'no', 'nein', '✗', 'x'].includes(val)) {
                    cell.textContent = '⚪'; // ✗ ○
                }
            });
            continue;
        }

        // 6. EMAIL CHECK
        const allEmail = nonEmptyValues.every(v => 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        );
        if (allEmail) {
            bodyCells.forEach(cell => cell.classList.add('auto-email'));
            continue;
        }

        // 7. URL CHECK
        const allUrl = nonEmptyValues.every(v => 
            /^https?:\/\/.+/.test(v)
        );
        if (allUrl) {
            bodyCells.forEach(cell => {
                cell.classList.add('auto-url');
                const url = cell.textContent;
                cell.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
            });
            continue;
        }

        // 8. LONG TEXT CHECK
        const avgLength = nonEmptyValues.join('').length / nonEmptyValues.length;
        if (avgLength > 50) {
            bodyCells.forEach(cell => cell.classList.add('auto-long-text'));
        }

        // 9. LONG HEADER CHECK (vertical writing)
        if (headerCell) {
            const headerLength = headerCell.textContent.trim().length;
            const maxContentLength = Math.max(...nonEmptyValues.map(v => v.length));
            if (headerLength > maxContentLength * 1.5 && headerLength > 15) {
                headerCell.classList.add('auto-vertical');
            }
        }
    }

    for (const col of columns) {
        const allCells = col.cells;
        const bodyCells = allCells.filter(c => c.tagName === 'TD');
        const headerCell = allCells.find(c => c.tagName === 'TH');

        if (bodyCells.length === 0) continue;
        
        const values = bodyCells.map(c => c.textContent.trim());
        const nonEmptyValues = values.filter(v => v !== '');

        // 8. LONG TEXT CHECK
        // todo: muss nur schauen ob irgend ein text länger als 50 ist.
        //const avgLength = nonEmptyValues.join('').length / nonEmptyValues.length;
        const maxContentLength = Math.max(...nonEmptyValues.map(v => v.length));
        if (maxContentLength > 50) {
            bodyCells.forEach(cell => cell.classList.add('auto-long-text'));
        }

        // 9. LONG HEADER CHECK (vertical writing)
        if (headerCell) {
            const headerLength = headerCell.textContent.trim().length;
            const maxContentLength = Math.max(...nonEmptyValues.map(v => v.length));
            if (headerLength > maxContentLength * 1.5 && headerLength > 15) {
                headerCell.classList.add('auto-vertical');
            }
        }
    }
}    
