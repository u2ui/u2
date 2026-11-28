export async function render(container, data, config) {
    const { Chart, registerables } = await import('https://cdn.skypack.dev/chart.js');
    Chart.register(...registerables);

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const { rows, cols, data: chartData } = data;
    const { type, options, getColor } = config;

    const isPie = type === 'pie' || type === 'doughnut';
    const chart = new Chart(ctx, {
        type,
        data: {
            labels: rows,
            datasets: cols.map((col, i) => ({
                label: col,
                data: chartData.map(row => row[i]),
                backgroundColor: isPie ? chartData.map((_, j) => getColor(j)) : getColor(i),
                borderColor: isPie ? '#fff' : getColor(i),
            }))
        },
        options
    });

    return {
        destroy() {
            chart.destroy();
            canvas.remove();
        }
    };
}
