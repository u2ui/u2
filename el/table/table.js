
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
            <slot></slot>
        `;
    }
    connectedCallback() {
        this.mutObs = new MutationObserver(mutations => {
            if (this._isUpdating) return; // IGNORIEREN WÄHREND UPDATE
            this.#checkTable();
            this.columns.refresh();
        });
        this.mutObs.observe(this, {childList: true, subtree: true});
        this.#checkTable();
    }

    #checkTable() {
        this.table = this.querySelector(':scope > table');
        if (!this.table) return;

        this._isUpdating = true; // FLAG SETZEN

        const firstHeadTr = this.querySelector(':scope > table > thead > tr');

        this.addEventListener('click', tableCheckboxMultiSelectListener);

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

        //if (this.hasAttribute('autoformat')) this.#autoFormat();
        if (this.hasAttribute('autoformat')) {
            import('./ext/autoFormatTable.js').then(({autoFormatTable})=> {
                this._isUpdating = true;
                autoFormatTable(this.table)
                queueMicrotask(() => this._isUpdating = false )
            });
        }

        queueMicrotask(() => this._isUpdating = false )
    }

    get columns() {
        return this.table && getTableColumns(this.table);
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
 * Multi-Select Listener (click) für Tabellen mit Checkboxen (Shift/Ctrl/Meta-Unterstützung).
 * @param {MouseEvent} e 
 */
function tableCheckboxMultiSelectListener(e) {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const tr = checkbox.closest('tr');
    const table = checkbox.closest('table');
    if (!tr || !table || table.getAttribute('aria-multiselectable') !== 'true') return;

    // 1. Einfache Klick-Logik (Reset oder Setzen)
    if (!e.shiftKey || !table._lastSelectedCheckbox) {
        table._lastSelectedCheckbox = checkbox;
        return;
    }

    // --- Shift-Klick: Bereichsauswahl ---
    
    const columns = getTableColumns(table); 

    const lastTr = table._lastSelectedCheckbox.closest('tr');
    const targetState = table._lastSelectedCheckbox.checked; // Status übernehmen
    const scope = table.dataset.selectScope || 'any';

    // 2. Bereich bestimmen (Zeilen)
    // tr.rowIndex ist native DOM API und sehr schnell
    const startRowIndex = Math.min(lastTr.rowIndex, tr.rowIndex);
    const endRowIndex = Math.max(lastTr.rowIndex, tr.rowIndex);

    // 3. Bereich bestimmen (Spalten)
    let minColIndex = 0;
    let maxColIndex = Infinity;

    if (scope !== 'row') {
        const lastCell = table._lastSelectedCheckbox.closest('td, th');
        const currentCell = checkbox.closest('td, th');
        
        // Hier nutzen wir unser neues, schnelles indexOf()
        const lastColIdx = columns.indexOf(lastCell);
        const currentColIdx = columns.indexOf(currentCell);

        if (scope === 'column') {
            // Nur die Spalte der aktuell angeklickten Checkbox
            minColIndex = maxColIndex = currentColIdx;
        } else { // scope === 'any' (Rechteck)
            minColIndex = Math.min(lastColIdx, currentColIdx);
            maxColIndex = Math.max(lastColIdx, currentColIdx);
        }
    }

    // 4. Iteration und Selektion
    // Wir iterieren direkt über die rows Collection (enthält alle tr)
    for (let r = startRowIndex; r <= endRowIndex; r++) {
        const row = table.rows[r];
        
        // Optimierung: Wenn Scope 'row' ist, brauchen wir keine Spaltenprüfung
        if (scope === 'row') {
            const inputs = row.querySelectorAll('input[type="checkbox"]');
            for (const input of inputs) input.checked = targetState;
            continue;
        }

        // Für 'column' oder 'any': Zellen prüfen
        for (const cell of row.cells) {
            // Ist die Zelle im relevanten Spaltenbereich?
            const cellColIdx = columns.indexOf(cell);
            
            if (cellColIdx >= minColIndex && cellColIdx <= maxColIndex) {
                const input = cell.querySelector('input[type="checkbox"]');
                if (input) input.checked = targetState;
            }
        }
    }
}




/**
 * The factory for the Columns class.
 */
const TableColMap = new WeakMap();
export const getTableColumns = (table) => {
    if (!TableColMap.has(table)) {
        TableColMap.set(table, new Columns(table));
    }
    return TableColMap.get(table);
}

/**
 * The Columns class represents a collection of the columns in a table.
 * A Column is a collection of all its cells taking into account shifts caused by colspan AND rowspan.
 *
 * Example usage:
 * const columns = getTableColumns(tableElement);
 * columns.item(3).cells().forEach(...)
 */

class Columns {
    constructor(table) {
        this.table = table;
        this._columns = {};
        this._matrix = null;
        this._cellIndexMap = null;
    }

    refresh() {
        this._matrix = null;
        this._cellIndexMap = null;
        this._columns = {};
        this._colMap = null;
    }

    _ensureMatrix() {
        if (this._matrix && this._cellIndexMap) return;

        this._matrix = [];
        this._cellIndexMap = new Map();
        
        // Wir nutzen table.rows, da dies alle tr (thead, tbody, tfoot) in korrekter Reihenfolge enthält
        const rows = this.table.rows; 

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            this._matrix[r] ??= [];
            
            let colIdx = 0;
            
            for (const cell of row.children) {
                // 1. Überspringe Plätze, die durch ein rowspan von oben belegt sind
                while (this._matrix[r][colIdx]) colIdx++;

                // 2. Speichere den Index für diese Zelle
                this._cellIndexMap.set(cell, colIdx);

                // 3. Markiere das Grid basierend auf colspan und rowspan
                const spanX = cell.colSpan;
                const spanY = cell.rowSpan;

                for (let x = 0; x < spanX; x++) {
                    for (let y = 0; y < spanY; y++) {
                        const targetRow = r + y;
                        this._matrix[targetRow] ??= [];
                        
                        // Wir markieren den Slot als "belegt"
                        // (Man könnte hier auch die Cell-Referenz speichern)
                        this._matrix[targetRow][colIdx + x] = cell;
                    }
                }

                // Index weiterschieben um die Breite der aktuellen Zelle
                colIdx += spanX;
            }
        }
    }

    get length() {
        this._ensureMatrix();
        return this._matrix.length > 0 ? this._matrix[0].length : 0;
    }

    indexOf(cell) {
        this._ensureMatrix();
        return this._cellIndexMap.has(cell) ? this._cellIndexMap.get(cell) : -1;
    }

    item(i) {
        this._columns[i] ??= new Column(this, i); // Übergebe 'this' (die Columns Instanz) statt nur table
        return this._columns[i];
    }
    
    // cellAt(rowIndex, colIndex) { // not used, but usefull
    //     this._ensureMatrix(); 
    //     const matrix = this._matrix;
    //     if (rowIndex < 0 || rowIndex >= matrix.length || colIndex < 0) return null;
    //     return matrix[rowIndex] ? matrix[rowIndex][colIndex] || null : null;
    // }

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

    _getColElement(index) {
        this._colMap ??= this.#createColMap();
        return this._colMap[index] || null;
    }

    #createColMap() {
        const colMap = [];
        const colgroups = this.table.querySelectorAll(':scope > colgroup');
        const standaloneCols = this.table.querySelectorAll(':scope > col');
        
        // Helper function to push cols
        const pushCols = (elements) => {
             for (const el of elements) {
                const span = parseInt(el.getAttribute('span')) || 1;
                // Wenn es eine colgroup mit cols ist, iterieren wir deren cols
                const innerCols = el.tagName === 'COLGROUP' ? el.querySelectorAll(':scope > col') : [];
                
                if (innerCols.length > 0) {
                    pushCols(innerCols);
                } else {
                    for (let i = 0; i < span; i++) colMap.push(el);
                }
            }
        }

        // Standardisiert colgroups und cols verarbeiten
        if(colgroups.length > 0) pushCols(colgroups);
        pushCols(standaloneCols); // Falls cols außerhalb von colgroups existieren (selten, aber valide)

        return colMap;
    }
}

class Column {
    constructor(columnsInstance, index) {
        this.columns = columnsInstance; // Referenz auf die Hauptklasse
        this.table = columnsInstance.table;
        this.index = index;
    }

    get cells() {
        const cells = [];
        // Wir iterieren über alle Gruppen (thead, tbody, tfoot)
        for (const group of this.table.children) {
            if(group.tagName === 'COLGROUP' || group.tagName === 'CAPTION') continue;
            this.cellsByGroup(group).forEach(cell => cells.push(cell));
        }
        return cells;
    }

    get colElement() {
        return this.columns._getColElement(this.index);
    }

    cellsByGroup(group) {
        const cells = [];
        // Iteriere über die Zeilen dieser Gruppe
        for (const row of group.children) {
            if (row.tagName !== 'TR') continue;

            for (const cell of row.children) {
                // Wir nutzen die zentrale Logik der Columns-Klasse
                // Das löst das Rowspan Problem automatisch
                if (this.columns.indexOf(cell) === this.index) {
                    cells.push(cell);
                    // Wir brechen hier NICHT ab, da theoretisch durch colspan
                    // eine Zelle relevant sein könnte, aber für eine *einzelne* Spalte 
                    // gibt es pro Zeile meist nur eine Zelle (außer bei komplexen Verschachtelungen).
                    // Bei Standard-Tabellen ist break ok, aber sicher ist sicher.
                }
            }
        }
        return cells;
    }
}

customElements.define('u2-table', Table);
