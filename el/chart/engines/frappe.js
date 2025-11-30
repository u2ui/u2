
export async function render(container, data, config) {
    const { Chart } = await import('https://cdn.jsdelivr.net/npm/frappe-charts@1.6.2/dist/frappe-charts.min.esm.js');
    

    const { rows, cols, data: chartData } = data;
    const { type, getColor } = config;

    // Map chart.js types to frappe types
    const typeMap = {
        'line': 'line',
        'bar': 'bar',
        'pie': 'pie',
        'doughnut': 'percentage'
    };
    const frappeType = typeMap[type] || 'line';

    // Frappe Charts data format
    const datasets = cols.map((col, i) => ({
        name: col,
        values: chartData.map(row => row[i]),
        chartType: frappeType
    }));

    const chart = new Chart(container, {
        data: {
            labels: rows,
            datasets: datasets
        },
        type: frappeType,
        height: container.clientHeight || 300,
        colors: cols.map((_, i) => getColor(i)),
        animate: 0 // Disable animation for now to avoid issues during testing/rendering
    });
    const styleTag = document.head.lastElementChild;
    styleTag.tagName === 'STYLE' && container.append(styleTag);

    // Handle resizing (no, svgs are responsive by default)
    const resizeObserver = new ResizeObserver(() => {});
    resizeObserver.observe(container);

    return {
        destroy() {
            resizeObserver.disconnect();
            // chart.destroy(); // Frappe charts doesn't have destroy?
            container.innerHTML = ''; // Clear container
        }
    };
}
