import { updateLabels, updateGeneralStats, stats } from './populationStats.js';

// Make stats globally accessible (if not already done in populationStats.js)
window.stats = stats;

// Make these functions available globally
window.viewSizeChart = viewSizeChart;
window.viewCalculations = viewCalculations;
window.checkForHorse = checkForHorse;
window.loadStoredValues = loadStoredValues;

function loadStoredValues() {
    const unit = localStorage.getItem('penisCalcUnit');
    if (unit) {
        document.getElementById('unit-selector').value = unit;
        updateLabels();
    }

    const erectLength = localStorage.getItem('penisCalcErectLength');
    const flaccidLength = localStorage.getItem('penisCalcFlaccidLength');
    const erectGirth = localStorage.getItem('penisCalcErectGirth');
    const flaccidGirth = localStorage.getItem('penisCalcFlaccidGirth');

    if (erectLength) document.getElementById('erect-length').value = erectLength;
    if (flaccidLength) document.getElementById('flaccid-length').value = flaccidLength;
    if (erectGirth) document.getElementById('erect-girth').value = erectGirth;
    if (flaccidGirth) document.getElementById('flaccid-girth').value = flaccidGirth;

    if (erectLength || flaccidLength || erectGirth || flaccidGirth) {
        calculateAdvanced();
    }
}

function viewSizeChart() {
    const unit = document.getElementById('unit-selector').value;
    const erectLength = document.getElementById('erect-length').value;
    const erectGirth = document.getElementById('erect-girth').value;

    const encodedParams = btoa(`${unit},${erectLength},,${erectGirth},`);
    window.location.href = `size-chart.html?d=${encodedParams}`;
}

function viewCalculations() {
    window.location.href = 'calculations.html';
}

function showFirstVisitPopup() {
    if (!localStorage.getItem('firstVisitPopupShown')) {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.innerHTML = `
            <div class="popup-content">
                <h2>Welcome to PlsSize.Me!</h2>
                <p>We use anonymized measurements to create a public dataset for more accurate statistics. No personally identifiable information is collected.</p>
                <p><strong>By contributing your anonymous measurements, you will help improve the accuracy of our dataset and benefit the community.</strong></p>
                <p>Would you like to contribute your anonymous measurements to our public dataset, which may be used for research and analysis?</p>
                <p>If you click "No", the sharing feature will be disabled.</p>
                <button id="acceptButton" class="button button-yes">Yes, Help Improve Accuracy</button>
                <button id="declineButton" class="button button-no">No, Maybe Later</button>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('acceptButton').addEventListener('click', function() {
            popup.classList.add('fade-out');
            setTimeout(() => {
                popup.remove();
            }, 500);
            localStorage.setItem('firstVisitPopupShown', 'true');
            localStorage.setItem('shareMeasurements', 'true');
        });

        document.getElementById('declineButton').addEventListener('click', function() {
            popup.classList.add('fade-out');
            setTimeout(() => {
                popup.remove();
            }, 500);
            localStorage.setItem('firstVisitPopupShown', 'true');
            localStorage.setItem('shareMeasurements', 'false');
        });

        // Add styles for the popup
        const style = document.createElement('style');
        style.textContent = `
            .popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                animation: fadeIn 0.5s ease-out forwards;
            }
            .popup-content {
                background-color: #fff;
                padding: 30px;
                border-radius: 8px;
                max-width: 80%;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transform: scale(0.9);
                animation: scaleIn 0.3s ease-out 0.2s forwards;
            }
            .popup-content h2 {
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .popup-content p {
                margin-bottom: 15px;
                color: #333;
            }
            .button {
                margin-top: 20px;
                padding: 12px 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.3s;
                font-size: 16px;
                margin-right: 10px;
            }
            .button-yes {
                background-color: #28a745;
                color: #fff;
                font-size: 18px;
            }
            .button-yes:hover {
                background-color: #218838;
            }
            .button-no {
                background-color: #dc3545;
                color: #fff;
            }
            .button-no:hover {
                background-color: #c82333;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.9); }
                to { transform: scale(1); }
            }
            .fade-out {
                animation: fadeOut 0.5s ease-out forwards;
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

async function getUserCountry() {
    try {
        const response = await fetch('http://ip-api.com/json/');
        if (!response.ok) {
            throw new Error('Failed to fetch country information');
        }
        const geoData = await response.json();
        console.log('User country:', geoData.country); // Print the country to log
        return geoData.country;
    } catch (error) {
        console.error('Error fetching country information:', error);
        return 'Unknown';
    }
}

function updateStats() {
    const population = document.getElementById('population-selector').value;
    const unit = document.getElementById('unit-selector').value;
    const generalStats = document.getElementById('general-stats');
    
    let statsHTML = '';
    
    if (population === 'plssize-me') {
        // Handle PlsSize.Me dataset
        const plsSizeMeStats = getPlsSizeMeStats(unit);
        if (plsSizeMeStats) {
            statsHTML += `<li>Average Erect Length: ${plsSizeMeStats.erectLength.toFixed(2)} ${unit}</li>`;
            statsHTML += `<li>Average Erect Girth: ${plsSizeMeStats.erectGirth.toFixed(2)} ${unit}</li>`;
            statsHTML += `<li>Average Flaccid Length: ${plsSizeMeStats.flaccidLength.toFixed(2)} ${unit}</li>`;
            statsHTML += `<li>Average Flaccid Girth: ${plsSizeMeStats.flaccidGirth.toFixed(2)} ${unit}</li>`;
        } else {
            statsHTML += '<li>PlsSize.Me dataset is currently unavailable.</li>';
        }
    } else {
        // Handle other populations
        for (let [key, value] of Object.entries(stats[unit])) {
            if (population in value) {
                statsHTML += `<li>Average ${capitalizeFirstLetter(key.replace(/([A-Z])/g, ' $1').toLowerCase())}: ${value[population].avg.toFixed(2)} ${unit}</li>`;
            }
        }
    }
    
    generalStats.innerHTML = statsHTML;
}

function getPlsSizeMeStats(unit) {
    return {
        erectLength: 14.5,
        erectGirth: 12.5,
        flaccidLength: 9.5,
        flaccidGirth: 9.0
    };
}

function checkForHorse() {
    const erectLength = parseFloat(document.getElementById('erect-length').value);
    const unit = document.getElementById('unit-selector').value;
    
    // Convert to cm if in inches
    const lengthInCm = unit === 'in' ? erectLength * 2.54 : erectLength;

    if (lengthInCm >= 22) {
        const horse = document.createElement('img');
        horse.src = 'horse.png';
        horse.style.position = 'fixed';
        horse.style.top = '50%';
        horse.style.left = '-100px';
        horse.style.transform = 'translateY(-50%)';
        horse.style.width = '100px';
        horse.style.zIndex = '9999';
        document.body.appendChild(horse);

        let position = -100;
        const animate = () => {
            position += 5;
            horse.style.left = `${position}px`;
            if (position < window.innerWidth + 100) {
                requestAnimationFrame(animate);
            } else {
                document.body.removeChild(horse);
            }
        };
        animate();
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    updateLabels();
    await window.updateStats(); // Use the global updateStats function
    loadStoredValues();
    showFirstVisitPopup(); // Add this line to show the popup on first visit

    // Fetch and store the user's country
    const country = await getUserCountry();
    localStorage.setItem('userCountry', country);

    // Add event listener for erect length input
    document.getElementById('erect-length').addEventListener('input', checkForHorse);

    // Add event listeners for population and unit selectors
    document.getElementById('population-selector').addEventListener('change', async () => {
        await window.updateStats();
        window.calculateAdvanced(); // Call calculateAdvanced after updating stats
    });
    document.getElementById('unit-selector').addEventListener('change', async () => {
        updateGeneralStats();
        window.calculateAdvanced(); // Call calculateAdvanced after changing units
    });
});

// Add this function at the end of the file
function printJokeToConsole() {
    const jokes = [
        "Why did the ruler feel inadequate? It was never quite up to the measure!",
        "What do you call a mathematician who's always talking about penis size? An algeBRO!",
        "Why was the statistician embarrassed? His sample size was too small!",
        "What did one tape measure say to the other? 'Don't worry, size isn't everything!'",
        "Why did the penis go to therapy? It had too many hang-ups!"
    ];
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    console.log(randomJoke);
}

// Call this function after all other initializations
window.addEventListener('load', () => {
    // ... any existing load event listeners ...
    
    // Add this line at the end
    setTimeout(printJokeToConsole, 1000); // Print joke after a 1-second delay
});