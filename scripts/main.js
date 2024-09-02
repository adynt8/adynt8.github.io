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
    // This function should retrieve the PlsSize.Me dataset
    // You'll need to implement this based on how you're storing/retrieving the data
    // For now, let's return a placeholder object
    return {
        erectLength: 14.5,
        erectGirth: 12.5,
        flaccidLength: 9.5,
        flaccidGirth: 9.0
    };
}

document.addEventListener('DOMContentLoaded', async function() {
    updateLabels();
    updateStats();
    loadStoredValues();
    showFirstVisitPopup(); // Add this line to show the popup on first visit

    // Fetch and store the user's country
    const country = await getUserCountry();
    localStorage.setItem('userCountry', country);
});