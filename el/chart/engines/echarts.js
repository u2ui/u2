export async function render(container, data, config) {
    const echarts = await import('https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.esm.min.js');

    const chart = echarts.init(container, null, { renderer: config.renderer });
    const { rows, cols, data: chartData } = data;
    const { type, getColor, renderer } = config;

    // Map chart.js types to echarts types
    const typeMap = {
        'line': 'line',
        'bar': 'bar',
        'pie': 'pie',
        'doughnut': 'pie'
    };
    const echartType = typeMap[type] || 'line';

    const series = cols.map((col, i) => {
        const s = {
            name: col,
            type: echartType,
            data: chartData.map(row => row[i]),
            itemStyle: {
                color: getColor(i)
            }
        };
        if (type === 'doughnut') {
            s.radius = ['40%', '70%'];
        }
        return s;
    });

    const option = {
        tooltip: {
            trigger: (type === 'pie' || type === 'doughnut') ? 'item' : 'axis'
        },
        legend: {
            data: cols
        },
        series: series
    };

    if (type !== 'pie' && type !== 'doughnut') {
        option.xAxis = {
            type: 'category',
            data: rows
        };
        option.yAxis = {
            type: 'value'
        };
    }

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
        chart.resize();
    });
    resizeObserver.observe(container);

    return {
        destroy() {
            resizeObserver.disconnect();
            chart.dispose();
        }
    };
}
