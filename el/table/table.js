
// creation of the u1-table element
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
            <!--div id=tools style="display:flex; justify-content:end">
                <button type=button>fullscreen</button>
                <select id=columnChooser></select>
                <input type=search>
            </div-->
            <slot></slot>
        `;
        this.table = this.firstElementChild;
    }
    connectedCallback() {
        this.resizeObs = new ResizeObserver(entries => this._checkResize());
        this.resizeObs.observe(this);

        // mutations
        this.mutObs = new MutationObserver(mutations => this._checkMutations());
        this.mutObs.observe(this, {childList: true, subtree: true});
        this._checkMutations();

        this.shadowRoot?.querySelector('#tools button')?.addEventListener('click', () => {
            this.shadowRoot.querySelector('slot').requestFullscreen()
        });

    }

    static get observedAttributes() { return ['sortable']; }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'sortable') makeSortable(this.table, newValue !== null);
    }

    _checkResize() {

        this.resizeLimite = this.resizeLimite == null ? 1 : this.resizeLimite+1;
        if (this.resizeLimite>20) {
            console.warn('debug: u1-table element resized to often');
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

                /*
                this.shadowRoot.querySelector('#columnChooser').appendChild(
                    new Option(title, index)
                );
                */

                // set aria-labels
                for (const td of this.columns.item(index).cells) {
                    td.setAttribute('aria-label', title);
                }
            }
        }
        this._breakpoint !== null && this._checkResize();
    }

    get columns() {
        if (!this._columns) this._columns = getTableColumns(this.table);
        return this._columns;
    }

}



/* sortable */
function makeSortable(table, ok=true) {
    table[ok?'addEventListener':'removeEventListener']('click', sortableClick);
}
function sortableClick(e){
    const table = this;
    const th = e.target.closest('thead > tr > *');
    if (!th) return;

    const attr = table.parentNode.getAttribute('sortable');
    if (attr !== '' && !e.target.matches(attr)) return;

    const columns = getTableColumns(table);
    const index = columns.indexOf(th);
    const group = table.querySelector('tbody');
    const trs = group.children;

    const ascending = th.getAttribute('aria-sort') !== 'ascending';
    for (const el of th.parentNode.children) el.removeAttribute('aria-sort');
    th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');

    const tds = columns.item(index).cellsByGroup(group);
    tds
        .map( td => { return { td, val: td.getAttribute('data-sortby') ?? td.innerText.trim() }; } )
        .sort((a, b) => {
            if (!ascending) [a, b] = [b, a];
            const [v1, v2] = [a.val, b.val];
            return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
        })
        .forEach(item => group.appendChild(item.td.parentNode) );
}





/* columns */

// use the factory function:
const TableColMap = new WeakMap();
const getTableColumns = (table) => {
    if (!TableColMap.has(table)) {
        TableColMap.set(table, new Columns(table));
    }
    return TableColMap.get(table);
}

/* are there memory leaks? */
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
    get headerCells(){
        const group = this.querySelector('thead');
        return this.cellsByGroup(group);
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

customElements.define('u1-table', Table);
