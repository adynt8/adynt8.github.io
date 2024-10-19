document.addEventListener('DOMContentLoaded', async function() {
    const supabaseUrl = 'https://lcayhsjrmjkwxekutiih.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjYXloc2pybWprd3hla3V0aWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzMjQzNjMsImV4cCI6MjA0MDkwMDM2M30.HO8ykfrFvwxjhFt5XuDJ1aMvbbIRpnvYO4n18NqXqLc';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Fetching data from Supabase...');

        const { data, error } = await supabaseClient
            .from('visitor_data')
            .select('*');

        if (error) {
            throw new Error(`Failed to fetch data: ${error.message}`);
        }

        console.log('Data fetched successfully:', data);

        // Add sorting dropdown
        const sortSelect = document.createElement('select');
        sortSelect.id = 'sortSelect';
        const sortOptions = [
            { value: 'id', text: 'ID' },
            { value: 'erectLength', text: 'Erect Length' },
            { value: 'erectGirth', text: 'Erect Girth' },
            { value: 'flaccidLength', text: 'Flaccid Length' },
            { value: 'flaccidGirth', text: 'Flaccid Girth' }
        ];
        sortOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            sortSelect.appendChild(optionElement);
        });
        document.querySelector('.container').insertBefore(sortSelect, document.getElementById('databaseTable'));

        // Function to update the table
        function updateTable(sortedData) {
            const tableBody = document.getElementById('databaseTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Clear existing rows

            let totalErectLength = 0, totalErectGirth = 0, totalFlaccidLength = 0, totalFlaccidGirth = 0;
            let count = 0;

            sortedData.forEach((entry, index) => {
                if (entry.erectLength && entry.erectGirth && entry.flaccidLength && entry.flaccidGirth) {
                    const row = tableBody.insertRow();
                    row.insertCell(0).innerText = index + 1;
                    row.insertCell(1).innerText = entry.visitorId;
                    row.insertCell(2).innerText = entry.unit; // Added unit column
                    row.insertCell(3).innerText = entry.erectLength;
                    row.insertCell(4).innerText = entry.erectGirth;
                    row.insertCell(5).innerText = entry.flaccidLength;
                    row.insertCell(6).innerText = entry.flaccidGirth;

                    totalErectLength += entry.erectLength;
                    totalErectGirth += entry.erectGirth;
                    totalFlaccidLength += entry.flaccidLength;
                    totalFlaccidGirth += entry.flaccidGirth;
                    count++;
                }
            });

            // Update averages
            if (count > 0) {
                document.getElementById('avgErectLength').innerText = (totalErectLength / count).toFixed(2);
                document.getElementById('avgErectGirth').innerText = (totalErectGirth / count).toFixed(2);
                document.getElementById('avgFlaccidLength').innerText = (totalFlaccidLength / count).toFixed(2);
                document.getElementById('avgFlaccidGirth').innerText = (totalFlaccidGirth / count).toFixed(2);
            }
        }

        // Initial table update
        updateTable(data);

        // Sort function
        function sortData(data, sortBy) {
            return [...data].sort((a, b) => {
                if (sortBy === 'id') {
                    return a.visitorId.localeCompare(b.visitorId);
                } else {
                    return b[sortBy] - a[sortBy];
                }
            });
        }

        // Add event listener for sorting
        sortSelect.addEventListener('change', function() {
            const sortedData = sortData(data, this.value);
            updateTable(sortedData);
        });

        console.log('Table updated and sorting functionality added.');
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});

// Updated kink test questions and categories
export const kinkCategories = [
    {
        name: "Rope Bondage",
        questions: [
            "How interested are you in being tied up with rope?",
            "How much do you enjoy tying others up with rope?",
            "How interested are you in intricate rope patterns and designs?",
            "How much do you like the idea of suspension bondage?",
        ]
    },
    {
        name: "Restraints",
        questions: [
            "How interested are you in using handcuffs or shackles?",
            "How much do you enjoy being restrained to furniture?",
            "How interested are you in using spreader bars?",
            "How much do you like the idea of full-body restraint suits?",
        ]
    },
    {
        name: "Dominance",
        questions: [
            "How interested are you in taking control in sexual situations?",
            "How much do you enjoy giving orders to a submissive partner?",
            "How interested are you in training or 'molding' a submissive?",
            "How much do you like the idea of strict protocols and rules?",
        ]
    },
    {
        name: "Submission",
        questions: [
            "How interested are you in giving up control in sexual situations?",
            "How much do you enjoy following orders from a dominant partner?",
            "How interested are you in being 'trained' or 'molded' by a dominant?",
            "How much do you like the idea of strict protocols and rules?",
        ]
    },
    {
        name: "Impact Play",
        questions: [
            "How interested are you in spanking?",
            "How much do you enjoy using paddles or floggers?",
            "How interested are you in caning?",
            "How much do you like the idea of whipping?",
        ]
    },
    {
        name: "Sensation Play",
        questions: [
            "How interested are you in temperature play (ice, wax)?",
            "How much do you enjoy sensory deprivation (blindfolds, earplugs)?",
            "How interested are you in electrostimulation?",
            "How much do you like the idea of sensation overload?",
        ]
    },
    {
        name: "Exhibitionism",
        questions: [
            "How interested are you in being watched during intimate activities?",
            "How much do you enjoy the idea of public nudity?",
            "How interested are you in performing sexual acts in semi-public places?",
            "How much do you like the idea of posting explicit content online?",
        ]
    },
    {
        name: "Voyeurism",
        questions: [
            "How interested are you in watching others during intimate activities?",
            "How much do you enjoy watching pornography?",
            "How interested are you in attending sex parties or BDSM events as an observer?",
            "How much do you like the idea of secretly watching others?",
        ]
    },
    {
        name: "Role-play",
        questions: [
            "How interested are you in power exchange scenarios (e.g., teacher/student)?",
            "How much do you enjoy age play (consenting adults only)?",
            "How interested are you in fantasy or sci-fi themed role-play?",
            "How much do you like the idea of animal role-play (furry, pet play)?",
        ]
    },
    {
        name: "Humiliation",
        questions: [
            "How interested are you in verbal humiliation?",
            "How much do you enjoy physical humiliation?",
            "How interested are you in public humiliation?",
            "How much do you like the idea of online or digital humiliation?",
        ]
    },
    {
        name: "Sadism",
        questions: [
            "How interested are you in inflicting pain on a consenting partner?",
            "How much do you enjoy the idea of leaving marks on a partner?",
            "How interested are you in psychological sadism?",
            "How much do you like the idea of controlling a partner's pain and pleasure?",
        ]
    },
    {
        name: "Masochism",
        questions: [
            "How interested are you in receiving pain from a consenting partner?",
            "How much do you enjoy being marked by a partner?",
            "How interested are you in psychological masochism?",
            "How much do you like the idea of having your pain and pleasure controlled?",
        ]
    },
    {
        name: "Fetishism",
        questions: [
            "How interested are you in specific body parts (e.g., feet, hands)?",
            "How much do you enjoy specific materials or clothing (e.g., leather, latex)?",
            "How interested are you in transformation fantasies?",
            "How much do you like the idea of objectification or furniture roleplay?",
        ]
    },
    {
        name: "Group Play",
        questions: [
            "How interested are you in threesomes?",
            "How much do you enjoy the idea of orgies or sex parties?",
            "How interested are you in gangbangs?",
            "How much do you like the idea of cuckolding or hotwifing?",
        ]
    },
    {
        name: "Power Exchange",
        questions: [
            "How interested are you in 24/7 power exchange relationships?",
            "How much do you enjoy orgasm control or chastity play?",
            "How interested are you in consensual blackmail or coercion scenarios?",
            "How much do you like the idea of financial domination?",
        ]
    },
    {
        name: "Extreme Play",
        questions: [
            "How interested are you in edge play or risky BDSM activities?",
            "How much do you enjoy the idea of consensual non-consent scenarios?",
            "How interested are you in blood play?",
            "How much do you like the idea of knife play?",
        ]
    },
    {
        name: "Consensual Non-Monogamy",
        questions: [
            "How interested are you in open relationships?",
            "How much do you enjoy the idea of polyamory?",
            "How interested are you in swinging with other couples?",
            "How much do you like the idea of casual encounters outside a primary relationship?",
        ]
    },
    {
        name: "Body Modification",
        questions: [
            "How interested are you in tattoos or piercings for sexual purposes?",
            "How much do you enjoy the idea of temporary body modifications during play?",
            "How interested are you in corseting or waist training?",
            "How much do you like the idea of scarification for aesthetic or sexual reasons?",
        ]
    },
    {
        name: "Primal Play",
        questions: [
            "How interested are you in animalistic or primal sexual behavior?",
            "How much do you enjoy the idea of hunting/chasing or being hunted/chased?",
            "How interested are you in biting or scratching during intimate activities?",
            "How much do you like the idea of raw, instinctual sexual encounters?",
        ]
    },
    {
        name: "Sensory Exploration",
        questions: [
            "How interested are you in food play during intimate activities?",
            "How much do you enjoy experimenting with different textures on skin?",
            "How interested are you in sensation play using various implements?",
            "How much do you like the idea of sensory deprivation combined with touch?",
        ]
    },
    {
        name: "Beastiality", 
        questions: [
            "How interested are you in beastiality-themed role-play scenarios?", // Updated question
            "How much do you enjoy the idea of embodying animalistic traits?", // Updated question
            "How interested are you in exploring untamed instincts?", // Updated question
            "How much do you like the idea of using animal like sex toys??" // Updated question
        ]
    },
    {
        name: "CNC", // New CNC category
        questions: [
            "How interested are you in consensual non-consent scenarios?",
            "How much do you enjoy the idea of role-playing non-consent situations?",
            "How interested are you in exploring boundaries within a safe context?",
            "How much do you like the idea of pre-negotiated non-consent play?"
        ]
    },
    {
        name: "Age Play",
        questions: [
            "How interested are you in age play scenarios?",
            "How much do you enjoy role-playing as a different age?",
            "How interested are you in using age-related props or costumes?",
            "How much do you like the idea of age regression or progression?"
        ]
    },
    {
        name: "Incest Role-play",
        questions: [
            "How interested are you in role-playing family dynamics?",
            "How much do you enjoy taboo scenarios involving family roles?",
            "How interested are you in exploring power dynamics in family settings?",
            "How much do you like the idea of forbidden family role-play?"
        ]
    },
    {
        name: "Pet Play",
        questions: [
            "How interested are you in role-playing as a pet or owner?",
            "How much do you enjoy using pet-related props or costumes?",
            "How interested are you in exploring pet-like behaviors?",
            "How much do you like the idea of being cared for as a pet?"
        ]
    },
    {
        name: "Medical Play",
        questions: [
            "How interested are you in medical examination role-play?",
            "How much do you enjoy using medical props or costumes?",
            "How interested are you in exploring doctor-patient dynamics?",
            "How much do you like the idea of medical procedures in play?"
        ]
    },
    {
        name: "Water Sports",
        questions: [
            "How interested are you in incorporating water sports into play?",
            "How much do you enjoy the idea of fluid exchange?",
            "How interested are you in exploring boundaries with water sports?",
            "How much do you like the idea of using water sports in a controlled setting?"
        ]
    }
];

export function processKinkTestResults(answers, isShortVersion, categoriesToUse) {
    const results = [];
    let dominantScore = 0;
    let submissiveScore = 0;
    let experimentalScore = 0;
    let tabooScore = 0;

    categoriesToUse.forEach((category, index) => {
        const categoryScores = answers.slice(
            index * (isShortVersion ? 2 : 4),
            (index + 1) * (isShortVersion ? 2 : 4)
        );
        const averageScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
        const percentage = (averageScore / 7) * 100;

        // Calculate dominant and submissive scores
        if (category.name === "Dominance" || category.name === "Sadism") {
            dominantScore += averageScore;
        } else if (category.name === "Submission" || category.name === "Masochism") {
            submissiveScore += averageScore;
        }

        // Calculate experimental and taboo scores
        if (category.name === "Sensory Exploration" || category.name === "Primal Play") {
            experimentalScore += averageScore;
        } else if (category.name === "Incest Role-play" || category.name === "CNC" || category.name === "Beastiality") {
            tabooScore += averageScore;
        }

        results.push({ 
            category: category.name, 
            score: percentage.toFixed(2) + '%',
            rawScore: percentage
        });
    });

    // Calculate overall percentages for each metric
    const totalCategories = categoriesToUse.length;
    const dominantPercentage = ((dominantScore / totalCategories) / 7) * 100;
    const submissivePercentage = ((submissiveScore / totalCategories) / 7) * 100;
    const experimentalPercentage = ((experimentalScore / totalCategories) / 7) * 100;
    const tabooPercentage = ((tabooScore / totalCategories) / 7) * 100;

    // Add additional metrics to results
    results.push({
        category: "Dominant Tendencies",
        score: dominantPercentage.toFixed(2) + '%',
        rawScore: dominantPercentage
    });

    results.push({
        category: "Submissive Tendencies",
        score: submissivePercentage.toFixed(2) + '%',
        rawScore: submissivePercentage
    });

    results.push({
        category: "Experimental Tendencies",
        score: experimentalPercentage.toFixed(2) + '%',
        rawScore: experimentalPercentage
    });

    results.push({
        category: "Taboo Tendencies",
        score: tabooPercentage.toFixed(2) + '%',
        rawScore: tabooPercentage
    });

    // Sort results by score in descending order
    results.sort((a, b) => b.rawScore - a.rawScore);

    return results;
}
