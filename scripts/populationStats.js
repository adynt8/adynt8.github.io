const populationStats = {
    global: {
        cm: {erectLength: { avg: 13.12, stdDev: 2.66 }, flaccidLength: { avg: 9.16, stdDev: 1.57 }, erectGirth: { avg: 11.66, stdDev: 1.10 }, flaccidGirth: { avg: 9.31, stdDev: 0.90 }},
        in: {erectLength: { avg: 5.17, stdDev: 1.05 }, flaccidLength: { avg: 3.61, stdDev: 0.62 }, erectGirth: { avg: 4.59, stdDev: 0.43 }, flaccidGirth: { avg: 3.67, stdDev: 0.35 }}
    },
    western: {
        cm: {erectLength: { avg: 14.0, stdDev: 2.7 }, flaccidLength: { avg: 9.5, stdDev: 1.6 }, erectGirth: { avg: 12.0, stdDev: 1.2 }, flaccidGirth: { avg: 9.5, stdDev: 1.0 }},
        in: {erectLength: { avg: 5.51, stdDev: 1.06 }, flaccidLength: { avg: 3.74, stdDev: 0.63 }, erectGirth: { avg: 4.72, stdDev: 0.47 }, flaccidGirth: { avg: 3.74, stdDev: 0.39 }}
    },
    asian: {
        cm: {erectLength: { avg: 13.0, stdDev: 1.8 }, flaccidLength: { avg: 8.2, stdDev: 1.1 }, erectGirth: { avg: 11.5, stdDev: 1.0 }, flaccidGirth: { avg: 8.5, stdDev: 0.9 }},
        in: {erectLength: { avg: 5.12, stdDev: 0.71 }, flaccidLength: { avg: 3.23, stdDev: 0.43 }, erectGirth: { avg: 4.53, stdDev: 0.39 }, flaccidGirth: { avg: 3.35, stdDev: 0.35 }}
    },
    african: {
        cm: {erectLength: { avg: 14.5, stdDev: 2.8 }, flaccidLength: { avg: 10.0, stdDev: 1.8 }, erectGirth: { avg: 12.5, stdDev: 1.3 }, flaccidGirth: { avg: 10.0, stdDev: 1.1 }},
        in: {erectLength: { avg: 5.71, stdDev: 1.10 }, flaccidLength: { avg: 3.94, stdDev: 0.71 }, erectGirth: { avg: 4.92, stdDev: 0.51 }, flaccidGirth: { avg: 3.94, stdDev: 0.43 }}
    },
    european: {
        cm: {erectLength: { avg: 14.3, stdDev: 2.7 }, flaccidLength: { avg: 9.7, stdDev: 1.8 }, erectGirth: { avg: 12.2, stdDev: 1.3 }, flaccidGirth: { avg: 9.6, stdDev: 1.1 }},
        in: {erectLength: { avg: 5.63, stdDev: 1.06 }, flaccidLength: { avg: 3.82, stdDev: 0.71 }, erectGirth: { avg: 4.80, stdDev: 0.51 }, flaccidGirth: { avg: 3.78, stdDev: 0.43 }}
    },
    latinAmerican: {
        cm: {erectLength: { avg: 13.6, stdDev: 2.2 }, flaccidLength: { avg: 9.1, stdDev: 1.5 }, erectGirth: { avg: 11.8, stdDev: 1.1 }, flaccidGirth: { avg: 9.3, stdDev: 0.9 }},
        in: {erectLength: { avg: 5.35, stdDev: 0.87 }, flaccidLength: { avg: 3.58, stdDev: 0.59 }, erectGirth: { avg: 4.65, stdDev: 0.43 }, flaccidGirth: { avg: 3.66, stdDev: 0.35 }}
    }
};

let stats = populationStats.global;

function updateStats() {
    const population = document.getElementById('population-selector').value;

    console.log(`Updating stats for population: ${population}`);

    switch (population) {
        case 'global':
            stats = populationStats.global;
            console.log('Using global population stats');
            break;
        case 'western':
            stats = populationStats.western;
            console.log('Using western population stats');
            break;
        case 'asian':
            stats = populationStats.asian;
            console.log('Using Asian population stats');
            break;
        case 'african':
            stats = populationStats.african;
            console.log('Using African population stats');
            break;
        case 'european':
            stats = populationStats.european;
            console.log('Using European population stats');
            break;
        case 'latin-american':
            stats = populationStats.latinAmerican;
            console.log('Using Latin American population stats');
            break;
        case 'plssize-me':
            console.log('Fetching PlsSize.Me stats...');
            getPlsSizeMeStats().then(fetchedStats => {
                stats = fetchedStats;
                console.log('PlsSize.Me stats fetched:', stats);
                console.log('Number of data points:', stats.dataPoints);
                console.log('Last updated:', stats.lastUpdated);
                updateGeneralStats();
            });
            return; // Exit the function early to wait for async fetch
        default:
            stats = populationStats.global;
            console.log('Using default global population stats');
    }

    console.log('Current stats:', stats);
    updateGeneralStats();
}

async function getPlsSizeMeStats() {
    const url = 'https://api.github.com/repos/APSCPLM/User-Data/contents/visitor_data.json';
    const TOKEN = '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';

    try {
        console.log('Fetching PlsSize.Me data from GitHub...');
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3.raw',
                'Authorization': `token ${TOKEN}`
            }
        });

        if (response.status === 404) {
            console.log('Visitor data file not found. Using default values.');
            return getDefaultStats();
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const visitorData = await response.json();
        console.log('Visitor data fetched successfully');

        if (!visitorData.visitors || Object.keys(visitorData.visitors).length === 0) {
            console.log('No visitor data available. Using default values.');
            return getDefaultStats();
        }

        console.log(`Number of data points: ${Object.keys(visitorData.visitors).length}`);

        // Calculate averages and standard deviations
        const stats = {
            cm: {
                erectLength: calculateStats(Object.values(visitorData.visitors).map(data => parseFloat(data.erectLength))),
                erectGirth: calculateStats(Object.values(visitorData.visitors).map(data => parseFloat(data.erectGirth))),
                flaccidLength: calculateStats(Object.values(visitorData.visitors).map(data => parseFloat(data.flaccidLength))),
                flaccidGirth: calculateStats(Object.values(visitorData.visitors).map(data => parseFloat(data.flaccidGirth)))
            },
            dataPoints: Object.keys(visitorData.visitors).length,
            lastUpdated: new Date().toISOString()
        };

        // Convert cm stats to inches
        stats.in = {
            erectLength: convertToInches(stats.cm.erectLength),
            erectGirth: convertToInches(stats.cm.erectGirth),
            flaccidLength: convertToInches(stats.cm.flaccidLength),
            flaccidGirth: convertToInches(stats.cm.flaccidGirth)
        };

        console.log('PlsSize.Me stats calculated:', stats);
        return stats;
    } catch (error) {
        console.error('Error fetching visitor data:', error);
        return getDefaultStats();
    }
}

function getDefaultStats() {
    return {
        cm: {
            erectLength: { avg: 0, stdDev: 0 },
            erectGirth: { avg: 0, stdDev: 0 },
            flaccidLength: { avg: 0, stdDev: 0 },
            flaccidGirth: { avg: 0, stdDev: 0 }
        },
        in: {
            erectLength: { avg: 0, stdDev: 0 },
            erectGirth: { avg: 0, stdDev: 0 },
            flaccidLength: { avg: 0, stdDev: 0 },
            flaccidGirth: { avg: 0, stdDev: 0 }
        }
    };
}

function convertToInches(cmStats) {
    return {
        avg: cmStats.avg / 2.54,
        stdDev: cmStats.stdDev / 2.54
    };
}

function calculateStats(values) {
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length);
    return { avg, stdDev };
}

function updateLabels() {
    const unit = document.getElementById('unit-selector').value;
    const unitLabels = document.getElementsByClassName('unit');
    for (let label of unitLabels) {label.textContent = unit;}
    updateGeneralStats();
}

function updateGeneralStats() {
    const unit = document.getElementById('unit-selector').value;
    const statsList = document.getElementById('general-stats');
    statsList.innerHTML = '';
    for (let [key, value] of Object.entries(stats[unit])) {
        const li = document.createElement('li');
        li.textContent = `Average ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${value.avg.toFixed(2)} ${unit} (±${value.stdDev.toFixed(2)} ${unit})`;
        statsList.appendChild(li);
    }
}