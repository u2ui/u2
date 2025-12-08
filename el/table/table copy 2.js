
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
 * Multi-Select Listener (click) für Tabellen mit Checkboxen.
 * @param {MouseEvent} e 
 * /
function tableCheckboxMultiSelectListener(e) {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    
    const tr = checkbox.closest('tr');
    const table = checkbox.closest('table');
    if (!tr || !table) return;
    if (table.getAttribute('aria-multiselectable') !== 'true') return;
    
    const scope = table.dataset.selectScope || 'any';
    const columns = getTableColumns(table);
    
    // Bestimme Spaltenindex der Checkbox (colspan-aware)
    const cell = checkbox.closest('td, th');
    const colIndex = columns.indexOf(cell);
    
    if (!table._lastSelectedCheckbox) table._lastSelectedCheckbox = null;
    
    // Ctrl / Meta => toggle einzelne Checkbox (wird automatisch gemacht)
    if (e.ctrlKey || e.metaKey) {
        table._lastSelectedCheckbox = checkbox;
        return;
    }
    
    // Shift => Range Select
    if (e.shiftKey && table._lastSelectedCheckbox) {
        
        const lastTr = table._lastSelectedCheckbox.closest('tr');
        const lastCell = table._lastSelectedCheckbox.closest('td, th');
        const lastColIndex = columns.indexOf(lastCell);
        
        const tbody = table.tBodies.length ? table.tBodies[0] : table;
        const rows = Array.from(tbody.rows);

        const startRowIndex = Math.min(rows.indexOf(lastTr), rows.indexOf(tr));
        const endRowIndex = Math.max(rows.indexOf(lastTr), rows.indexOf(tr));
        const startColIndex = Math.min(lastColIndex, colIndex);
        const endColIndex = Math.max(lastColIndex, colIndex);
        
        // Bestimme Zielstatus: Status der zuerst geklickten Checkbox
        const targetState = table._lastSelectedCheckbox.checked;
        
        // Sammle alle Checkboxen im Bereich
        const checkboxes = [];
        
        if (scope === 'any') {
            // Bereichsauswahl über Zeilen und Spalten
            for (let rowIdx = startRowIndex; rowIdx <= endRowIndex; rowIdx++) {
                const row = rows[rowIdx];
                for (let colIdx = startColIndex; colIdx <= endColIndex; colIdx++) {
                    const cells = columns.item(colIdx).cellsByGroup(row.parentNode);
                    const cellInRow = cells.find(c => c.parentNode === row);
                    if (cellInRow) {
                        const cb = cellInRow.querySelector('input[type="checkbox"]');
                        if (cb) checkboxes.push(cb);
                    }
                }
            }
        } else if (scope === 'row') {
            // Nur Checkboxen in den betroffenen Zeilen
            [lastTr, tr].forEach(row => {
                if (rows.includes(row)) {
                    row.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        checkboxes.push(cb);
                    });
                }
            });
        } else if (scope === 'column') {
            // Nur Checkboxen in der gleichen Spalte
            for (let rowIdx = startRowIndex; rowIdx <= endRowIndex; rowIdx++) {
                const row = rows[rowIdx];
                const cells = columns.item(colIndex).cellsByGroup(row.parentNode);
                const cellInRow = cells.find(c => c.parentNode === row);
                if (cellInRow) {
                    const cb = cellInRow.querySelector('input[type="checkbox"]');
                    if (cb) checkboxes.push(cb);
                }
            }
        }
        
        checkboxes.forEach(cb => cb.checked = targetState );
        
        return;
    }
    
    table._lastSelectedCheckbox = checkbox;
}


/**
 * Multi-Select Listener (click) für Tabellen mit Checkboxen (Shift/Ctrl/Meta-Unterstützung).
 * Verwendet moderne JS-APIs für Kompaktheit.
 * Nimmt an, dass getTableColumns und cellsByGroup existieren und korrekt funktionieren.
 * @param {MouseEvent} e 
 */
function tableCheckboxMultiSelectListener(e) {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const tr = checkbox.closest('tr');
    const table = checkbox.closest('table');
    if (!tr || !table || table.getAttribute('aria-multiselectable') !== 'true') return;

    // Verwende ein Symbol für eine private Eigenschaft, falls nötig (optional, für sauberen Global State)
    if (!table._lastSelectedCheckbox) table._lastSelectedCheckbox = null;
    
    // Ctrl / Meta => Individuelles Toggle. Setzt nur den letzten Klick.
    if (e.ctrlKey || e.metaKey) {
        table._lastSelectedCheckbox = checkbox;
        return;
    }

    // Speichere den aktuellen Klick als letzten Klick und beende, wenn Shift nicht gedrückt oder kein letzter Klick gespeichert ist.
    if (!e.shiftKey || !table._lastSelectedCheckbox) {
        table._lastSelectedCheckbox = checkbox;
        return;
    }

    // --- Shift-Klick: Bereichsauswahl ---
    
    const lastCheckbox = table._lastSelectedCheckbox;
    const lastTr = lastCheckbox.closest('tr');
    const tbody = table.tBodies[0] || table;
    const rows = Array.from(tbody.rows);

    const startRowIndex = Math.min(rows.indexOf(lastTr), rows.indexOf(tr));
    const endRowIndex = Math.max(rows.indexOf(lastTr), rows.indexOf(tr));
    
    const targetState = lastCheckbox.checked; // Status der zuerst geklickten Checkbox
    const scope = table.dataset.selectScope || 'any';
    
    let checkboxes = [];

    // Nur Zeilen im Bereich betrachten
    const affectedRows = rows.slice(startRowIndex, endRowIndex + 1);

    if (scope === 'row') {
        // Nur Checkboxen in den betroffenen Zeilen (alle)
        checkboxes = affectedRows.flatMap(row => 
            Array.from(row.querySelectorAll('input[type="checkbox"]'))
        );
    } else {
        // Bestimme Spaltenindex für 'any' und 'column' Scope
        const columns = getTableColumns(table); // Annahme: Existiert
        const cell = checkbox.closest('td, th');
        const lastCell = lastCheckbox.closest('td, th');
        const colIndex = columns.indexOf(cell);
        const lastColIndex = columns.indexOf(lastCell);

        if (colIndex === -1 || lastColIndex === -1) return; // Fehlerbehandlung

        const startColIndex = (scope === 'any') ? Math.min(lastColIndex, colIndex) : colIndex;
        const endColIndex = (scope === 'any') ? Math.max(lastColIndex, colIndex) : colIndex;

        affectedRows.forEach(row => {
            for (let colIdx = startColIndex; colIdx <= endColIndex; colIdx++) {
                const cells = columns.item(colIdx).cellsByGroup(row.parentNode); 
                const cellInRow = cells.find(c => c.parentNode === row);
                
                if (cellInRow) {
                    const cb = cellInRow.querySelector('input[type="checkbox"]');
                    if (cb) checkboxes.push(cb);
                }
            }
        });
    }
    
    // Setze den Status für alle gesammelten Checkboxen im Bereich
    checkboxes.forEach(cb => cb.checked = targetState);
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
 * const columns = new Columns(tableElement);
 * columns.item(3).cells().forEach(...)
 */

class Columns {
    constructor(table) {
        this.table = table;
        this._columns = {};
        
        // Caches für Matrix und Index-Lookup
        this._matrix = null;
        this._cellIndexMap = null;
    }

    /**
     * Setzt den Cache zurück (nützlich, wenn sich die Tabelle dynamisch ändert)
     */
    refresh() {
        this._matrix = null;
        this._cellIndexMap = null;
        this._columns = {};
        this._colMap = null;
    }

    /**
     * Baut das Grid der Tabelle auf, um rowspan/colspan korrekt zu mappen.
     * Erstellt eine Map: Zelle -> Spaltenindex
     * @private
     */
    _ensureMatrix() {
        if (this._matrix && this._cellIndexMap) return;

        this._matrix = [];
        this._cellIndexMap = new Map();
        
        // Wir nutzen table.rows, da dies alle tr (thead, tbody, tfoot) in korrekter Reihenfolge enthält
        const rows = this.table.rows; 

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!this._matrix[r]) this._matrix[r] = [];
            
            let colIdx = 0;
            
            for (const cell of row.children) {
                // 1. Überspringe Plätze, die durch ein rowspan von oben belegt sind
                while (this._matrix[r][colIdx]) {
                    colIdx++;
                }

                // 2. Speichere den Index für diese Zelle
                this._cellIndexMap.set(cell, colIdx);

                // 3. Markiere das Grid basierend auf colspan und rowspan
                const spanX = parseInt(cell.colSpan) || 1;
                const spanY = parseInt(cell.rowSpan) || 1;

                for (let x = 0; x < spanX; x++) {
                    for (let y = 0; y < spanY; y++) {
                        const targetRow = r + y;
                        if (!this._matrix[targetRow]) this._matrix[targetRow] = [];
                        
                        // Wir markieren den Slot als "belegt"
                        // (Man könnte hier auch die Cell-Referenz speichern)
                        this._matrix[targetRow][colIdx + x] = true; 
                    }
                }

                // Index weiterschieben um die Breite der aktuellen Zelle
                colIdx += spanX;
            }
        }
    }

    get length() {
        this._ensureMatrix();
        // Die Länge ist die Breite der ersten Zeile der Matrix (oder max Breite)
        return this._matrix.length > 0 ? this._matrix[0].length : 0;
    }

    indexOf(cell) {
        this._ensureMatrix();
        // Schneller Lookup statt Iteration
        return this._cellIndexMap.has(cell) ? this._cellIndexMap.get(cell) : -1;
    }

    item(i) {
        if (!this._columns[i]) {
            this._columns[i] = new Column(this, i); // Übergebe 'this' (die Columns Instanz) statt nur table
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

    _getColElement(index) {
        if (!this._colMap) {
            this._colMap = this.#createColMap();
        }
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

// class Columns {
//     constructor(table) {
//         this.table = table;
//         this._columns = {};
//     }
//     get length() {
//         const last = this.table.querySelector(':scope > * > tr > :last-child');
//         return this.indexOf(last)+1; // todo: endIndexOf
//     }
//     indexOf(cell) {
//         let currentIndex = -1;
//         for (const td of cell.parentNode.children) {
//             ++currentIndex;
//             if (td === cell) return currentIndex;
//             if (td.colSpan > 1) currentIndex += td.colSpan -1;
//         }
//     }
//     item(i) {
//         if (!this._columns[i]) {
//             this._columns[i] = new Column(this.table, i);
//         }
//         return this._columns[i];
//     }
//     [Symbol.iterator]() {
//         const length = this.length;
//         let i = 0;
//         return {
//             next: () => ({
//                 value: this.item(i++),
//                 done: i > length,
//             })
//         }
//     }

//     /**
//      * Gibt das col-Element für eine bestimmte Spaltennummer (index) zurück.
//      * Berücksichtigt colgroup- und col-span.
//      */
//     _getColElement(index) {
//         if (!this._colMap) {
//             this._colMap = this.#createColMap();
//         }
//         return this._colMap[index] || null;
//     }

//     /**
//      * Erstellt eine Zuordnung von Spaltenindex zu col-Element.
//      * @private
//      */
//     #createColMap() {
//         const colMap = []; // Array, wobei der Index der Spaltenindex ist
//         const colgroups = this.table.querySelectorAll(':scope > colgroup');
//         const standaloneCols = this.table.querySelectorAll(':scope > col');
//         for (const colgroup of colgroups) {
//             const colgroupSpan = parseInt(colgroup.getAttribute('span')) || 1;
//             const cols = colgroup.querySelectorAll(':scope > col');
//             if (cols.length > 0) {
//                 for (const col of cols) {
//                     const colSpan = parseInt(col.getAttribute('span')) || 1;
//                     for (let i = 0; i < colSpan; i++) {
//                         colMap.push(col);
//                     }
//                 }
//             } else {
//                 for (let i = 0; i < colgroupSpan; i++) {
//                     colMap.push(colgroup);
//                 }
//             }
//         }
//         for (const col of standaloneCols) {
//             const colSpan = parseInt(col.getAttribute('span')) || 1;
//             for (let i = 0; i < colSpan; i++) {
//                 colMap.push(col);
//             }
//         }
//         return colMap;
//     }

// }

// class Column {
//     constructor(table, index) {
//         this.table = table;
//         this.index = index;
//     }
//     get cells(){
//         const cells = [];
//         for (const group of this.table.children) {
//             this.cellsByGroup(group).forEach(cell => cells.push(cell));
//         }
//         return cells;
//     }
//     get colElement() {
//         const columnsCollection = getTableColumns(this.table);
//         return columnsCollection._getColElement(this.index);
//     }    
//     cellsByGroup(group){
//         const cells = [];
//         for (const row of group.children) {
//             let currentIndex = -1;
//             for (const cell of row.children) {
//                 currentIndex += (cell.colSpan||1);
//                 if (currentIndex >= this.index) {
//                     cells.push(cell);
//                     break; // next row
//                 }
//             }
//         }
//         return cells;
//     }
// }

customElements.define('u2-table', Table);
