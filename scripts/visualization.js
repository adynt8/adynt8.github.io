// Assuming you're using Chart.js for visualization
// Make sure to include the Chart.js library in your HTML file before this script

let sizeChart;

function initializeChart() {
    const canvas = document.getElementById('sizeChart');
    if (!canvas) {
        console.log('Size chart canvas not found, skipping initialization');
        return;
    }
    const ctx = canvas.getContext('2d');
    sizeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Erect Length', 'Erect Girth', 'Flaccid Length', 'Flaccid Girth'],
            datasets: [{
                label: 'Your Measurements',
                data: [0, 0, 0, 0],
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }, {
                label: 'Population Average',
                data: [0, 0, 0, 0],
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Size'
                    }
                }
            }
        }
    });
}

function updateVisualization(userMeasurements, populationAverage, unit) {
    if (!sizeChart) {
        console.log('Size chart not initialized, skipping visualization update');
        return;
    }
    sizeChart.data.datasets[0].data = [
        userMeasurements.erectLength,
        userMeasurements.erectGirth,
        userMeasurements.flaccidLength,
        userMeasurements.flaccidGirth
    ];
    sizeChart.data.datasets[1].data = [
        populationAverage.erectLength,
        populationAverage.erectGirth,
        populationAverage.flaccidLength,
        populationAverage.flaccidGirth
    ];
    sizeChart.options.scales.y.title.text = `Size (${unit})`;
    sizeChart.update();
}

// Initialize the chart when the page loads
document.addEventListener('DOMContentLoaded', initializeChart);