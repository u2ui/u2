// todo? add roles like "table" to ensure it is a table even if untabeled using css?

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
        this.table = this.querySelector(':scope>table');
    }
    connectedCallback() {
        this.resizeObs = new ResizeObserver(entries => this._checkResize());
        this.resizeObs.observe(this);

        // mutations
        this.mutObs = new MutationObserver(mutations => this._checkMutations());
        this.mutObs.observe(this, {childList: true, subtree: true});
        this._checkMutations();
    }

    static get observedAttributes() { return ['sortable']; }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'sortable') makeSortable(this.table, newValue !== null);
    }

    _checkResize() {

        this.resizeLimite = this.resizeLimite == null ? 1 : this.resizeLimite+1;
        if (this.resizeLimite>20) {
            console.warn('debug: u2-table element resized to often');
            setTimeout(()=>{
                this.resizeLimite = 0;
            }, 400);
            return;
        }

        const overflows = this.scrollWidth > this.clientWidth;
        if (overflows) this._breakpoint = this.scrollWidth; // overflows && this._breakpoint === null ???

        if (this._breakpoint != null && this._breakpoint > this.clientWidth) {
            this.setAttribute(':overflows', ''); // :overflows=strategy (break, hide-optional, vertical)
        } else {
            this.removeAttribute(':overflows');
        }
    }
    _checkMutations() {
        const tr = this.table.querySelector(':scope > thead > tr');
        if (tr) {
            for (const th of tr.children) {
                const title = th.innerText;
                const index = this.columns.indexOf(th);

                // set aria-labels
                for (const td of this.columns.item(index).cells) {
                    td.setAttribute('aria-label', title);
                }
            }
        }
        this._breakpoint !== null && this._checkResize();
    }

    get columns() {
        return getTableColumns(this.table);
    }

}



/* sortable */
function makeSortable(table, enable=true) {
    table[enable?'addEventListener':'removeEventListener']('click', sortableClick);
}
function sortableClick(e){
    const table = this;
    const th = e.target.closest('thead > tr > *');
    if (!th) return;

    const attr = table.parentNode.getAttribute('sortable');
    if (attr !== '' && !e.target.matches(attr)) return;

    const columns = getTableColumns(table);
    const index = columns.indexOf(th);
    const tbody = table.querySelector('tbody');

    const ascending = th.getAttribute('aria-sort') !== 'ascending';
    for (const el of th.parentNode.children) el.removeAttribute('aria-sort');
    th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');

    const tds = columns.item(index).cellsByGroup(tbody);
    tds
        .map( td => { return { td, val: td.getAttribute('data-sortby') ?? td.innerText.trim() }; } )
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
