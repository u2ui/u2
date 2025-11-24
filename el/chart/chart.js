// Dependencies: u2/tools/promiseElementById.js

class U2Chart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = 
            `<style>
            canvas {
                width: 100%;
                display:block;
                &:not([height]) { aspect-ratio: 2; }
            }
            :host([type="pie"]) canvas:not([height]) { aspect-ratio: 1; }
            </style>
            <canvas></canvas>`;
        this.canvas = this.shadowRoot.querySelector('canvas');
        this.chart = null; // Initialisiere die Chart-Instanz
    }
    connectedCallback() {
        this._requestBuild();
    }

    static get observedAttributes() { return ['for', 'type', 'flip-axis', 'axis-labels', 'grid']; }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === 'for') {
            this._forPromise = import('../../u2/tools/promiseElementById.js').then(({promiseElementById}) => {
                return promiseElementById(this.getAttribute('for'));
            });
        }
        this._requestBuild(); // every change in attributes should trigger a rebuild
    }

    async _extractdata() {
        let target = null;
        if (this.hasAttribute('for')) {
            target = await this._forPromise
        } else {
            target = this.querySelector(':scope > table, :scope > dl');
        }
        if (target) {
            if (target.tagName === 'TABLE') return extractTableData(target);
            if (target.tagName === 'DL') return extractDLData(target);
        }
    }
    _requestBuild() {
        if (this._buildRequested) return;
        this._buildRequested = true;
        requestAnimationFrame(() => {
            this._buildRequested = false;
            this._build();
        });
    }
    async _build() {
        if (this.canvas) this.canvas.remove();


        
        this.canvas = document.createElement('canvas');
        this.shadowRoot.appendChild(this.canvas);
        //this.chart.destroy();
        //this.chart = null;

        const ctx = this.canvas.getContext('2d');
        let {rows, cols, data} = await this._extractdata();
        if (!data) { console.error('No data found'); return; }

        const type = this.getAttribute('type') || 'line';
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: {}, grid: {}, border:{}, beginAtZero: true },
                x: { ticks: {}, grid: {}, border:{} }
            }
        };

        if (type === 'pie' || type === 'doughnut') {
            options.scales = undefined;
        }

        const {Chart, registerables} = await import ('https://cdn.skypack.dev/chart.js');
        Chart.register(...registerables);

        const {hue, saturation, lightness} = getHSLofElement(this);

        function colorNr(i) {
            return `hsl(${hue + i*30}, ${saturation}, ${lightness})`;
        }
        if (this.hasAttribute('flip-axis')) {
            [rows, cols] = [cols, rows];
            data = data[0].map((_, i) => data.map(row => row[i]));
        }

        const attr_axisLabels = this.getAttribute('axis-labels')
        if (attr_axisLabels != null) {
            if (attr_axisLabels === 'false') {
                options.scales.x.ticks.display = false;
                options.scales.y.ticks.display = false;
            }
        }
        const attr_grid = this.getAttribute('grid')
        if (attr_grid != null) {
            if (attr_grid === 'false') {
                options.scales.x.grid.display = false;
                options.scales.y.grid.display = false;
                options.scales.x.border.display = false;
                options.scales.y.border.display = false;
            }
        }

        new Chart(ctx, {
            type,
            data: {
                labels: rows,
                datasets: cols.map((col, i) => ({
                    label: col,
                    data:data.map(row => row[i]),
                    backgroundColor: type==='pie' || type==='doughnut' ? data.map((_, j) => colorNr(j)) : colorNr(i),
                    borderColor:     type==='pie' || type==='doughnut' ? '#fff' : colorNr(i),
                }))
            },
            options
        });
    }
    disconnectedCallback() {
        if (this.chart) this.chart.destroy();
    }
}



function extractTableData(table) {
    const trs = [...table.querySelectorAll('tbody tr')];
    let headTr = table.querySelector('thead tr');

    if (!headTr) {
        const firstRowCells = table.querySelectorAll('tbody tr:nth-child(1) th');
        const secondRowCells = table.querySelectorAll('tbody tr:nth-child(2) th');
        if (firstRowCells.length !== secondRowCells.length) {
            headTr = table.querySelector('tbody tr');
            trs.shift();
        }
    }

    const hasRowHeaders = trs[0].firstElementChild.tagName === 'TH';

    let rowHeaders = [];
    let colHeaders = [];

    const data = trs.map(row => {
        const cells = [...row.children];
        if (hasRowHeaders) {
            rowHeaders.push(cells.shift().textContent.trim());
        } else {
            rowHeaders.push('Row ' + (rowHeaders.length + 1));
        }
        return cells.map(cell => parseFloat(cell.textContent.trim()));
    });

    if (headTr) {
        colHeaders = [...headTr.children].map(cell => cell.textContent.trim());
        if (hasRowHeaders) colHeaders.shift();
    } else {
        colHeaders = Array.from({ length: data[0].length }, (_, i) => 'Col ' + (i + 1));
    }

    return {cols: colHeaders, rows: rowHeaders, data};
}


function extractDLData(dl) {
    let dts = [...dl.querySelectorAll('dt')];
    let dds = [...dl.querySelectorAll('dd')];

    let rows = dts.map(dt => dt.textContent.trim());
    let cols = [''];
    let data = dds.map(dd => [parseFloat(dd.textContent.trim())]);


    return {cols, rows, data};
}


function getHSLofElement(el) {
    const style = getComputedStyle(el);
    const hue = parseFloat(style.getPropertyValue('--hsl-h') || 200);
    const saturation = style.getPropertyValue('--hsl-s') || '50%';
    const lightness = style.getPropertyValue('--hsl-l') || '50%';
    return { hue, saturation, lightness };
}


customElements.define('u2-chart', U2Chart);