
export default class U2Table extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
            }
            </style>
            <slot></slot>
        `;
    }
    connectedCallback() {
        this.mutObs = new MutationObserver(mutations => {
            // console.log('check?', !this._isUpdating)
            if (this._isUpdating) return; // ignore own changes
            if (!this._watchCells && !mutations.some(m => isSkeleton(m.target))) return;
            this.columns?.refresh();
            this.#checkTable();
        });
        this.mutObs.observe(this, { childList: true, subtree: true, /* attributes: true, characterData: true*/});
        this.#checkTable();
    }
    disconnectedCallback() {
        this.mutObs.disconnect();
    }

    #checkTable() {
        this.table = this.querySelector(':scope > table');
        if (!this.table) return;

        this._isUpdating = true; // set flag


        this.addEventListener('click', tableCheckboxMultiSelectListener);

        const firstHeadTr = this.querySelector(':scope > table > thead > tr');
        if (firstHeadTr) {
            firstHeadTr.addEventListener('click', tableSortListener);
            const heads = [...firstHeadTr.children];
            const titles = heads.map(th => th.innerText.trim()); // all reads first, a write in between costs the next read a reflow
            heads.forEach((th, i) => {
                for (const td of this.columns.item(this.columns.indexOf(th)).cells) td.dataset.title = titles[i];
            });
        }
        for (const col of this.columns) {
            const colEl = col.colElement;
            if (!colEl) break; // why break? if there is no col-element for the first column, there will be no col-element at all?
            for (const td of col.cells) td.classList.add(...colEl.classList); // test!!
        }
        if (this.hasAttribute('check-column') && !this.checkboxColumnInitialized) {
            this.checkboxColumnInitialized = true;
            for (const group of this.table.children) {
                if (group.tagName === 'COLGROUP') {
                    const col = document.createElement('col')
                    col.style.width = '1em';
                    group.prepend(col);
                    continue;
                }
                for (const tr of group.children) {
                    if (group.tagName === 'TBODY') {
                        const td = document.createElement('td');
                        tr.prepend(td);
                        td.innerHTML = '<input class=row-checkbox type="checkbox">';
                    }
                    if (group.tagName === 'THEAD') {
                        const th = document.createElement('th');
                        tr.prepend(th);
                        th.innerHTML = '<input class=summary-checkbox type="checkbox">';
                    }
                    if (group.tagName === 'TFOOT') {
                        const td = document.createElement('td');
                        tr.prepend(td);
                    }
                }
            }
            const summaryCheck = this.querySelector(':scope .summary-checkbox');
            const headCheckAdjust = () => {
                const checks = this.querySelectorAll(':scope > table > tbody > tr > td > input[type="checkbox"]');
                const checked = this.querySelectorAll(':scope > table > tbody > tr > td > input[type="checkbox"]:checked');
                const allChecked = checked.length === checks.length;
                summaryCheck.checked = allChecked;
                summaryCheck.indeterminate = !allChecked && checked.length > 0;
            };
            headCheckAdjust();
            this.addEventListener('input', e => {
                if (e.target.classList.contains('row-checkbox')) headCheckAdjust();
                if (e.target === summaryCheck) this.querySelectorAll(':scope > table > tbody > tr > td > input.row-checkbox').forEach(el => el.checked = e.target.checked);
            });
        }
        if (this.hasAttribute('drag-column') && !this.dragColumnInitialized) {
            this.dragColumnInitialized = true;
            import('../../attr/dropzone/dropzone.js');
            for (const group of this.table.children) {
                if (group.tagName === 'COLGROUP') {
                    const col = document.createElement('col')
                    col.style.width = '1em';
                    group.prepend(col);
                    continue;
                }
                if (group.tagName === 'TBODY' && !group.hasAttribute('u2-dropzone')) group.setAttribute('u2-dropzone', '');
                for (const tr of group.children) {
                    const td = document.createElement('td');
                    tr.prepend(td);
                    if (group.tagName === 'TBODY') {
                        tr.setAttribute('draggable', 'false');
                        td.innerHTML = '<u2-ico inline>⠿</u2-ico>';
                        td.setAttribute('u2-draghandle', '');
                    }
                }
            }
        }

        if (this.hasAttribute('autoformat')) {
            import('./ext/autoFormatTable.js').then(({ autoFormatTable }) => {
                this._isUpdating = true;
                autoFormatTable(this.table)
                queueMicrotask(() => this._isUpdating = false)
            });
        }

        const tdValue = td => {
            let string = (td.dataset.value ?? td.textContent).trim();
            if (string === '') {
                const input = td.querySelector('input');
                if (!input) return null;
                string = input.value;
            }
            return parseFloat(string);
        }

        const firstFootTr = this.querySelector(':scope > table > tfoot > tr');
        // the foot aggregates read cell values, so such a table has to watch the cells as well
        this._watchCells = !!firstFootTr?.querySelector('[data-sum], [data-avg], [data-count]');
        if (firstFootTr) {
            const colCells = td => this.columns.item(this.columns.indexOf(td)).cellsByGroup(this.table.tBodies[0]);
            for (const td of firstFootTr.children) {
                if (td.hasAttribute('data-sum')) td.textContent = colCells(td).reduce((a, b) => a + tdValue(b), 0);
                if (td.hasAttribute('data-avg')) {
                    const cells = colCells(td);
                    td.textContent = cells.reduce((a, b) => a + tdValue(b), 0) / cells.length;
                }
                if (td.hasAttribute('data-count')) td.textContent = colCells(td).filter(td => tdValue(td) !== null).length;
            }
        }

        queueMicrotask(() => this._isUpdating = false);
    }

    get columns() {
        return this.table && getTableColumns(this.table);
    }

}

/* Content inside a cell cannot move a column, so only changes to the table skeleton are worth a rebuild. */
const isSkeleton = node => ['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR'].includes(node.nodeName);

/* Sort-listener that would also work for other tables, even globally. */
function tableSortListener(e) {
    const btn = e.target.closest('[data-sort-handler]');
    if (!btn) return;
    const th = btn.closest('th');
    if (!th) return;
    const table = th.parentNode.parentNode.parentNode;

    const columns = getTableColumns(table);
    const index = columns.indexOf(th);
    const tbody = table.querySelector('tbody');

    const ascending = th.ariaSort !== 'ascending';
    for (const el of th.parentNode.children) el.ariaSort = null;
    th.ariaSort = ascending ? 'ascending' : 'descending';

    const tds = columns.item(index).cellsByGroup(tbody);
    tds
        .map(td => ({ td, val: td.getAttribute('data-value') ?? td.textContent.trim() }))
        .sort((a, b) => {
            if (!ascending) [a, b] = [b, a];
            const [v1, v2] = [a.val, b.val];
            return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
        })
        .forEach(item => tbody.appendChild(item.td.parentNode));

}





/**
 * Multi-select click listener for tables with checkboxes (shift-click selects a range).
 * @param {MouseEvent} e 
 */
function tableCheckboxMultiSelectListener(e) {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const tr = checkbox.closest('tr');
    const table = checkbox.closest('table');
    if (!tr || !table || table.getAttribute('aria-multiselectable') !== 'true') return;

    // 1. plain click: remember the anchor
    if (!e.shiftKey || !table._lastSelectedCheckbox) {
        table._lastSelectedCheckbox = checkbox;
        return;
    }

    // --- shift-click: range selection ---

    const columns = getTableColumns(table);

    const lastTr = table._lastSelectedCheckbox.closest('tr');
    const targetState = table._lastSelectedCheckbox.checked; // take over its state
    const scope = table.dataset.selectScope || 'any';

    // 2. row range (tr.rowIndex is native and fast)
    const startRowIndex = Math.min(lastTr.rowIndex, tr.rowIndex);
    const endRowIndex = Math.max(lastTr.rowIndex, tr.rowIndex);

    // 3. column range
    let minColIndex = 0;
    let maxColIndex = Infinity;

    if (scope !== 'row') {
        const lastCell = table._lastSelectedCheckbox.closest('td, th');
        const currentCell = checkbox.closest('td, th');

        // the fast indexOf() of Columns
        const lastColIdx = columns.indexOf(lastCell);
        const currentColIdx = columns.indexOf(currentCell);

        if (scope === 'column') {
            // only the column of the clicked checkbox
            minColIndex = maxColIndex = currentColIdx;
        } else { // scope === 'any' (rectangle)
            minColIndex = Math.min(lastColIdx, currentColIdx);
            maxColIndex = Math.max(lastColIdx, currentColIdx);
        }
    }

    // 4. select, iterating table.rows (all tr)
    for (let r = startRowIndex; r <= endRowIndex; r++) {
        const row = table.rows[r];

        // scope 'row' needs no column check
        if (scope === 'row') {
            const inputs = row.querySelectorAll('input[type="checkbox"]');
            for (const input of inputs) input.checked = targetState;
            continue;
        }

        // 'column' or 'any': check the cells
        for (const cell of row.cells) {
            // is the cell inside the column range?
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
export const getTableColumns = (table) => TableColMap.get(table) ?? TableColMap.set(table, new Columns(table)).get(table);

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

        // table.rows holds every tr (thead, tbody, tfoot) in document order
        const rows = this.table.rows;

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            this._matrix[r] ??= [];

            let colIdx = 0;

            for (const cell of row.children) {
                // 1. skip slots taken by a rowspan from above
                while (this._matrix[r][colIdx]) colIdx++;

                // 2. remember the cell's index
                this._cellIndexMap.set(cell, colIdx);

                // 3. mark the grid by colspan and rowspan
                const spanX = cell.colSpan;
                const spanY = cell.rowSpan;

                for (let x = 0; x < spanX; x++) {
                    for (let y = 0; y < spanY; y++) {
                        const targetRow = r + y;
                        this._matrix[targetRow] ??= [];

                        // the slot is taken by this cell
                        this._matrix[targetRow][colIdx + x] = cell;
                    }
                }

                // advance by the cell's width
                colIdx += spanX;
            }
        }
    }

    get length() {
        this._ensureMatrix();
        return this._matrix[0]?.length ?? 0;
    }

    indexOf(cell) {
        this._ensureMatrix();
        return this._cellIndexMap.get(cell) ?? -1;
    }

    item(i) {
        return this._columns[i] ??= new Column(this, i);
    }

    cellAt(rowIndex, colIndex) {
        this._ensureMatrix();
        return this._matrix[rowIndex]?.[colIndex] ?? null;
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
                // a colgroup with cols: take its cols
                const innerCols = el.tagName === 'COLGROUP' ? el.querySelectorAll(':scope > col') : [];

                if (innerCols.length) {
                    pushCols(innerCols);
                } else {
                    for (let i = 0; i < span; i++) colMap.push(el);
                }
            }
        }

        // process colgroups and cols the standard way
        pushCols(colgroups);
        pushCols(standaloneCols); // cols outside colgroups (rare, but valid)

        return colMap;
    }
}

class Column {
    constructor(columnsInstance, index) {
        this.columns = columnsInstance; // reference to the main class
        this.table = columnsInstance.table;
        this.index = index;
    }

    get cells() {
        const cells = [];
        // all groups (thead, tbody, tfoot)
        for (const group of this.table.children) {
            if (group.tagName === 'COLGROUP' || group.tagName === 'CAPTION') continue;
            cells.push(...this.cellsByGroup(group));
        }
        return cells;
    }

    get colElement() {
        return this.columns._getColElement(this.index);
    }

    cellsByGroup(group) {
        const cells = [];
        // the rows of this group
        for (const row of group.children) {
            if (row.tagName !== 'TR') continue;
            const cell = this.columns.cellAt(row.rowIndex, this.index);
            // the matrix also fills slots that a colspan/rowspan from elsewhere takes
            if (cell?.parentNode === row && this.columns.indexOf(cell) === this.index) cells.push(cell);
        }
        return cells;
    }
}

customElements.get('u2-table') || customElements.define('u2-table', U2Table);
