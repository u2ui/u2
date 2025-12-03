
class Table extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
                overflow: auto;
            }
            </style>
            <!--u2-menubutton>
                <button>Spalten</button>
                <menu>
                    <button>test</button>
                </menu>
            </u2-menubutton-->
            <slot></slot>
        `;
    }
    connectedCallback() {
        this.mutObs = new MutationObserver(mutations => {
            if (this._isUpdating) return; // IGNORIEREN WÄHREND UPDATE
            this.#checkTable()
        });
        this.mutObs.observe(this, {childList: true, subtree: true});
        this.#checkTable();
    }

    #checkTable() {
        this.table = this.querySelector(':scope > table');
        if (!this.table) return;

        this._isUpdating = true; // FLAG SETZEN

        const firstHeadTr = this.querySelector(':scope > table > thead > tr');


        if (firstHeadTr) {

            // sortable
            firstHeadTr.addEventListener('click', tableSortListener);

            // th-text to each td
            for (const th of firstHeadTr.children) {
                const title = th.innerText.trim();
                const index = this.columns.indexOf(th);
                for (const td of this.columns.item(index).cells) td.dataset.title = title;
            }
        }
        for (const col of this.columns) {
            const colEl = col.colElement;
            if (!colEl) break; // why break? if there is no col-element for the first column, there will be no col-element at all?
            for (const td of col.cells) {
                td.classList.add(...colEl.classList); // test!!
            }
        }

        if (this.hasAttribute('autoformat')) this.#autoFormat();

        queueMicrotask(()=>{
            this._isUpdating = false; // FLAG ZURÜCKSETZEN        
        })

    }

    get columns() {
        return this.table && getTableColumns(this.table);
    }



    #autoFormat() {
        // Inject styles into light DOM
        let style = this.querySelector('style[data-autoformat]');
        if (!style) {
            style = document.createElement('style');
            style.dataset.autoformat = '';
            this.insertBefore(style, this.firstChild);
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

        const firstHeadTr = this.querySelector(':scope > table > thead > tr');
        if (firstHeadTr) {
            for (const th of firstHeadTr.children) {
                th.setAttribute('data-sort-handler', '');
                th.tabIndex = '0';
            }
        }

        // Analyze and format each column
        for (const col of this.columns) {
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
                console.log(headerCell, headerLength)
                if (headerLength > maxContentLength * 1.5 && headerLength > 15) {
                    headerCell.classList.add('auto-vertical');
                }
            }
        }

        for (const col of this.columns) {
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
                console.log(headerCell, headerLength)
                if (headerLength > maxContentLength * 1.5 && headerLength > 15) {
                    headerCell.classList.add('auto-vertical');
                }
            }
        }
    }    

}

/* Sort-listener that would also work for other tables, even globally. */
function tableSortListener(e){
    const btn = e.target.closest('[data-sort-handler]');
    if (!btn) return;
    const th = btn.closest('th');
    if (!th) return;
    const tr = th.parentNode;
    const thead = tr.parentNode;
    const table = thead.parentNode;

    const columns = getTableColumns(table);
    const index = columns.indexOf(th);
    const tbody = table.querySelector('tbody');

    const ascending = th.ariaSort !== 'ascending';
    for (const el of th.parentNode.children) el.ariaSort = null;
    th.ariaSort = ascending ? 'ascending' : 'descending';

    const tds = columns.item(index).cellsByGroup(tbody);
    tds
        .map( td => { return { td, val: td.getAttribute('data-sort') ?? td.textContent.trim() }; } )
        .sort((a, b) => {
            if (!ascending) [a, b] = [b, a];
            const [v1, v2] = [a.val, b.val];
            return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
        })
        .forEach(item => tbody.appendChild(item.td.parentNode) );

}



/**
 * The factory for the Columns class.
 */
const TableColMap = new WeakMap();
const getTableColumns = (table) => {
    if (!TableColMap.has(table)) {
        TableColMap.set(table, new Columns(table));
    }
    return TableColMap.get(table);
}

/**
 * The Columns class represents a collection of the columns in a table.
 * A Column is a collection of all its cells taking into account shifts caused by colspan.
 *
 * Example usage:
 * const columns = new Columns(tableElement);
 * columns.item(3).cells().forEach(...)
 */

class Columns {
    constructor(table) {
        this.table = table;
        this._columns = {};
    }
    get length() {
        const last = this.table.querySelector(':scope > * > tr > :last-child');
        return this.indexOf(last)+1; // todo: endIndexOf
    }
    indexOf(cell) {
        let currentIndex = -1;
        for (const td of cell.parentNode.children) {
            ++currentIndex;
            if (td === cell) return currentIndex;
            if (td.colSpan > 1) currentIndex += td.colSpan -1;
        }
    }
    item(i) {
        if (!this._columns[i]) {
            this._columns[i] = new Column(this.table, i);
        }
        return this._columns[i];
    }
    [Symbol.iterator]() {
        const length = this.length;
        let i = 0;
        return {
            next: () => ({
                value: this.item(i++),
                done: i > length,
            })
        }
    }

    /**
     * Gibt das col-Element für eine bestimmte Spaltennummer (index) zurück.
     * Berücksichtigt colgroup- und col-span.
     */
    _getColElement(index) {
        if (!this._colMap) {
            this._colMap = this.#createColMap();
        }
        return this._colMap[index] || null;
    }

    /**
     * Erstellt eine Zuordnung von Spaltenindex zu col-Element.
     * @private
     */
    #createColMap() {
        const colMap = []; // Array, wobei der Index der Spaltenindex ist
        const colgroups = this.table.querySelectorAll(':scope > colgroup');
        const standaloneCols = this.table.querySelectorAll(':scope > col');
        for (const colgroup of colgroups) {
            const colgroupSpan = parseInt(colgroup.getAttribute('span')) || 1;
            const cols = colgroup.querySelectorAll(':scope > col');
            if (cols.length > 0) {
                for (const col of cols) {
                    const colSpan = parseInt(col.getAttribute('span')) || 1;
                    for (let i = 0; i < colSpan; i++) {
                        colMap.push(col);
                    }
                }
            } else {
                for (let i = 0; i < colgroupSpan; i++) {
                    colMap.push(colgroup);
                }
            }
        }
        for (const col of standaloneCols) {
            const colSpan = parseInt(col.getAttribute('span')) || 1;
            for (let i = 0; i < colSpan; i++) {
                colMap.push(col);
            }
        }
        return colMap;
    }

}

class Column {
    constructor(table, index) {
        this.table = table;
        this.index = index;
    }
    get cells(){
        const cells = [];
        for (const group of this.table.children) {
            this.cellsByGroup(group).forEach(cell => cells.push(cell));
        }
        return cells;
    }
    get colElement() {
        const columnsCollection = getTableColumns(this.table);
        return columnsCollection._getColElement(this.index);
    }    
    cellsByGroup(group){
        const cells = [];
        for (const row of group.children) {
            let currentIndex = -1;
            for (const cell of row.children) {
                currentIndex += (cell.colSpan||1);
                if (currentIndex >= this.index) {
                    cells.push(cell);
                    break; // next row
                }
            }
        }
        return cells;
    }
}

customElements.define('u2-table', Table);
