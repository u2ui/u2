
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
    }
    connectedCallback() {
        this.canvas = this.shadowRoot.querySelector('canvas');
        this._build();
        //requestAnimationFrame(() => this._build());
    }
    _extractdata() {
        const table = this.querySelector(':scope > table');
        if (table) return extractTableData(table);
        const dl = this.querySelector(':scope > dl');
        if (dl) return extractDLData(dl);
    }
    // _getDefaultColors() {
    //     const style = getComputedStyle(this);
    //     const hue = style.getPropertyValue('--hsl-h') || 200;
    //     const saturation = style.getPropertyValue('--hsl-s') || 50;
    //     const lightness = style.getPropertyValue('--hsl-l') || 50;
    //     return { hue, saturation, lightness };
    // }
    async _build() {
        this.ctx = this.canvas.getContext('2d');
        const {rows, cols, data} = this._extractdata();
        if (!data) { console.error('No data found'); return; }

        const type = this.getAttribute('type') || 'line';
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        };

        if (type === 'pie' || type === 'doughnut') {
            options.scales = undefined;
        }

        const {Chart, registerables} = await import ('https://cdn.skypack.dev/chart.js');
        Chart.register(...registerables);

        new Chart(this.ctx, {
            type,
            data: {
                labels: rows,
                datasets: cols.map((col, i) => ({
                    label: col, data: data.map(row => row[i]),
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


customElements.define('u2-chart', U2Chart);