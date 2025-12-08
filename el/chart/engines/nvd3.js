
export async function render(container, data, config) {
    // Load D3 v3 and NVD3 via script tags sequentially
    if (!window.d3 || !window.d3.version || !window.d3.version.startsWith('3.')) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    if (!window.nv) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/nvd3@1.8.6/build/nv.d3.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load NVD3 CSS into the Shadow DOM container
    if (!container.querySelector('link[href*="nv.d3.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/nvd3@1.8.6/build/nv.d3.min.css';
        container.appendChild(link);
    }

    const { rows, cols, data: chartData } = data;
    const { type, options } = config;

    // Map types
    // NVD3 types: lineChart, discreteBarChart, pieChart, multiBarChart
    const typeMap = {
        'line': 'lineChart',
        'bar': 'discreteBarChart', // or multiBarChart if multiple series
        'pie': 'pieChart',
        'doughnut': 'pieChart'
    };

    // Check if we have multiple columns for bar chart, then use multiBarChart
    let chartType = typeMap[type] || 'lineChart';
    if (type === 'bar' && cols.length > 1) {
        chartType = 'multiBarChart';
    }

    // Prepare data
    let formattedData = [];

    if (chartType === 'pieChart') {
        // Pie: [{label: "One", value: 29}, ...]
        // We take the first column of data
        formattedData = rows.map((row, i) => ({
            label: row,
            value: chartData[i][0]
        }));
    } else {
        // Line/Bar: [{ key: "Series 1", values: [{x, y}, ...] }]
        formattedData = cols.map((colName, i) => {
            return {
                key: colName,
                values: rows.map((row, j) => ({
                    x: type === 'line' ? j : row, // Line chart usually needs numeric x or time, bar uses ordinal
                    y: chartData[j][i]
                }))
            };
        });

        // For discreteBarChart, it expects a single series object inside the array? 
        // No, it expects [{ key: "Cumulative Return", values: [...] }]
        // But discreteBarChart is usually for one series. 
        // If we have multiple series, we switched to multiBarChart above.
    }

    // Create SVG element
    let svg = container.querySelector('svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.width = '100%';
        svg.style.height = '100%';
        // NVD3 needs explicit height often, or it defaults to 400
        svg.style.minHeight = '300px';
        container.appendChild(svg);
    }

    let chart;

    // NVD3 chart creation is wrapped in nv.addGraph
    await new Promise((resolve) => {
        window.nv.addGraph(() => {
            chart = window.nv.models[chartType]();

            if (chartType === 'lineChart') {
                chart.useInteractiveGuideline(true);
                // chart.xAxis.axisLabel('Time'); // Optional
                // chart.yAxis.axisLabel('Value');

                // If x is index, format it back to label?
                // NVD3 line chart x-axis is linear/time by default.
                // If we passed index j as x, we can format tick.
                chart.xAxis.tickFormat(d => rows[d]);
            }

            if (chartType === 'pieChart') {
                chart.showLabels(true);
                if (type === 'doughnut') {
                    chart.donut(true);
                    chart.donutRatio(0.35);
                }
            }

            // Apply options if any
            // This is tricky with NVD3 as options are methods.
            // e.g. chart.margin({left: 100})

            window.d3.select(svg)
                .datum(formattedData)
                .call(chart);

            window.nv.utils.windowResize(chart.update);
            resolve();
            return chart;
        });
    });

    return {
        destroy() {
            // NVD3 doesn't have a clear destroy on the chart instance, 
            // but we can remove the SVG content.
            // nv.utils.windowResize listener might persist?
            // There isn't a clean way to remove the resize listener added by nv.utils.windowResize 
            // without access to the handler.
            // But we can clear the container.
        }
    };
}
