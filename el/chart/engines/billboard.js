
export async function render(container, data, config) {
    // Import Billboard.js and chart types from ESM CDN
    const { default: bb, line, bar, pie, donut } = await import('https://esm.sh/billboard.js@3.17.2');

    // Load Billboard.js CSS into the Shadow DOM container
    if (!container.querySelector('link[href*="billboard.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/billboard.js@3.17.2/dist/billboard.min.css';
        container.appendChild(link);
    }

    const { rows, cols, data: chartData } = data;
    const { type, options } = config;

    // Map types to module functions
    const typeMap = {
        'line': line(),
        'bar': bar(),
        'pie': pie(),
        'doughnut': donut()
    };

    // Default to line if type not found, but we need to make sure 'line()' is available.
    // If 'type' is unknown, we might default to line.
    const chartTypeModule = typeMap[type] || line();
    const chartTypeString = typeMap[type] ? type : 'line';

    // For doughnut, billboard uses 'donut' as type string usually, but let's check.
    // Actually, when using modules, we pass the module execution result to the 'type' property?
    // No, looking at docs/examples:
    // bb.generate({
    //   data: { type: line(), ... }
    // })
    // OR
    // bb.generate({
    //   data: { types: { data1: line(), data2: bar() } }
    // })

    // Prepare data
    const columns = cols.map((colName, i) => {
        return [colName, ...chartData.map(row => row[i])];
    });

    // Create a div for the chart
    let chartDiv = container.querySelector('.bb-chart');
    if (!chartDiv) {
        chartDiv = document.createElement('div');
        chartDiv.className = 'bb-chart';
        container.appendChild(chartDiv);
    }

    const chartConfig = {
        bindto: chartDiv,
        data: {
            columns: columns,
            type: chartTypeModule // Pass the module function result here
        },
        axis: {
            x: {
                type: 'category',
                categories: rows
            }
        },
        ...options
    };

    // Special handling for doughnut to map to 'donut' options if needed, 
    // but the module is 'donut()'.

    const chart = bb.generate(chartConfig);

    return {
        destroy() {
            chart.destroy();
        }
    };
}
