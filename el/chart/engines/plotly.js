
export async function render(container, data, config) {
    // Import Plotly from ESM CDN (esm.sh to wrap UMD)
    const Plotly = (await import('https://esm.sh/plotly.js-dist-min@3.3.0')).default;

    const { rows, cols, data: chartData } = data;
    const { type, options } = config;

    // Map types
    // Plotly types: scatter (line), bar, pie
    const typeMap = {
        'line': 'scatter',
        'bar': 'bar',
        'pie': 'pie',
        'doughnut': 'pie'
    };
    const chartType = typeMap[type] || 'scatter';

    // Prepare data
    let traces = [];

    if (chartType === 'pie') {
        // Pie/Donut
        // values: data (first column), labels: rows
        const trace = {
            values: chartData.map(row => row[0]),
            labels: rows,
            type: 'pie',
            hole: type === 'doughnut' ? 0.4 : 0
        };
        traces.push(trace);
    } else {
        // Line/Bar
        // x: rows, y: data column
        traces = cols.map((colName, i) => {
            return {
                x: rows,
                y: chartData.map(row => row[i]),
                type: chartType,
                name: colName,
                mode: chartType === 'scatter' ? 'lines+markers' : undefined
            };
        });
    }

    // Create a div for the chart
    let chartDiv = container.querySelector('.plotly-chart');
    if (!chartDiv) {
        chartDiv = document.createElement('div');
        chartDiv.className = 'plotly-chart';
        chartDiv.style.width = '100%'; // Plotly needs explicit size or 100%
        chartDiv.style.height = '100%';
        container.append(chartDiv);
    }

    const layout = {
        margin: { t: 20, r: 20, b: 30, l: 40 },
        ...options
    };

    const configOptions = {
        responsive: true,
        displayModeBar: false
    };

    await Plotly.newPlot(chartDiv, traces, layout, configOptions);

    return {
        destroy() {
            Plotly.purge(chartDiv);
        }
    };
}
