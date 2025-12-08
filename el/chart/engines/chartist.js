
export async function render(container, data, config) {
    // Import Chartist from ESM CDN
    const { LineChart, BarChart, PieChart } = await import('https://cdn.jsdelivr.net/npm/chartist@1.5.0/dist/index.js');

    // Load Chartist CSS into the Shadow DOM container
    if (!container.querySelector('link[href*="chartist"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/chartist@1.5.0/dist/index.css';
        container.append(link);
    }

    const { rows, cols, data: chartData } = data;
    const { type, options } = config;

    options.fullWidth ??= true;

    // Map types
    const typeMap = {
        'line': LineChart,
        'bar': BarChart,
        'pie': PieChart,
        'doughnut': PieChart
    };
    const ChartClass = typeMap[type] || LineChart;

    // Prepare data
    let formattedData;
    if (ChartClass === PieChart) {
        // For Pie, we take the first column of data
        formattedData = {
            labels: rows,
            series: chartData.map(row => row[0])
        };

        if (type === 'doughnut') {
            config.options = { ...config.options, donut: true };
        }
    } else {
        // Line/Bar
        // Series is an array of arrays (column-major)
        const series = cols.map((col, i) => {
            return chartData.map(row => row[i]);
        });

        formattedData = {
            labels: rows,
            series: series
        };
    }

    // Create a div for the chart because Chartist replaces the content or appends to it.
    let chartDiv = container.querySelector('.ct-chart');
    if (!chartDiv) {
        chartDiv = document.createElement('div');
        chartDiv.className = 'ct-chart';
        chartDiv.style.height = '100%';
        container.append(chartDiv);
    }

    // Chartist options
    const chartOptions = {
        ...options
    };

    const chart = new ChartClass(chartDiv, formattedData, chartOptions);

    return {
        destroy() {
            chart.detach();
        }
    };
}
