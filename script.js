let questions = [];
let allArchetypes = []; // Add this to store your logic

async function loadTestData() {
    try {
        // Fetch both files at the same time
        const [qRes, lRes] = await Promise.all([
            fetch('questions.json'),
            fetch('human_design_logic.json')
        ]);

        const qData = await qRes.json();
        const lData = await lRes.json();
        
        questions = qData.questions;
        allArchetypes = lData.human_design_test.archetypes; // Save archetypes here
        
        displayQuestion(); 
    } catch (error) {
        console.error("Data loading error:", error);
    }
}

loadTestData();

let currentQuestionIndex = 0;
let archetypeScores = {
    "individualist": 0, "truth-seeker": 0, "steward": 0, 
    "logic-master": 0, "storyteller": 0, "catalyst": 0
};
let gateScores = {}; // We will store scores for each gate number here

function displayQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById("question-text").innerText = question.text;

    // Update Progress Bar
    const progressPercent = (currentQuestionIndex / questions.length) * 100;
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;
}

function handleAnswer(value) {
    const q = questions[currentQuestionIndex];
    const totalPoints = value * q.weight;

    // 1. Add to Archetype Score
    archetypeScores[q.archetype] += totalPoints;

    // 2. Add to individual Gate Scores
    q.impacted_gates.forEach(gate => {
        gateScores[gate] = (gateScores[gate] || 0) + totalPoints;
    });

    // 3. Move to next question or show results
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    // Hide the question box and show the results box
    document.getElementById("question-box").style.display = "none";
    document.getElementById("results-box").style.display = "block";

    const sorted = Object.entries(archetypeScores).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0];   
    const secondary = sorted[1]; 

    const margin = primary[1] * 0.10; 
    const isHybrid = (primary[1] - secondary[1]) <= margin;

    if (isHybrid) {
        renderHybridResult(primary[0], secondary[0]);
    } else {
        renderSingleResult(primary[0]);
    }
}

function renderSingleResult(winnerSlug) {
    const archetypeData = allArchetypes.find(a => a.slug === winnerSlug);
    const specificChannel = findWinningChannel(winnerSlug);

    document.getElementById("archetype-result").innerText = archetypeData.title;
    
    // Target the newly created 'channel-result' div
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box" style="color: #1f2937;">
            <p>${archetypeData.description}</p>
            <hr>
            <h3>Core Channel: ${specificChannel.name} (${specificChannel.id})</h3>
        </div>
    `;
}

function renderHybridResult(pSlug, sSlug) {
    // 1. Point the slugs to the actual objects in your JSON
    const pData = allArchetypes.find(a => a.slug === pSlug);
    const sData = allArchetypes.find(a => a.slug === sSlug);
    
    // 2. Find the top channels for both
    const pChannel = findWinningChannel(pSlug);
    const sChannel = findWinningChannel(sSlug);

    // 3. Update the UI using the .title and .secondary_description fields
    document.getElementById("archetype-result").innerText = `${pData.title} + ${sData.title}`;

    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p><strong>Primary:</strong> ${pData.description}</p>
            <p><strong>Supporting Trait:</strong> ${sData.secondary_description}</p>
            <hr>
            <h3>Active Channels:</h3>
            <p>Main: ${pChannel.name} (${pChannel.id})</p>
            <p>Secondary: ${sChannel.name} (${sChannel.id})</p>
        </div>
    `;
}

function findWinningChannel(archetypeSlug) {
    // 1. Find the archetype object in our JSON data
    const archetype = allArchetypes.find(a => a.slug === archetypeSlug);
    
    let topChannel = null;
    let highestChannelScore = -1;

    // 2. Loop through only the channels belonging to this archetype
    archetype.channels.forEach(channel => {
        const [gateA, gateB] = channel.gates;
        
        // Sum the scores of the two gates (default to 0 if no points were earned)
        const currentScore = (gateScores[gateA] || 0) + (gateScores[gateB] || 0);

        if (currentScore > highestChannelScore) {
            highestChannelScore = currentScore;
            topChannel = channel;
        }
    });

    return topChannel; // Returns { id: "61-24", name: "Awareness", ... }
}

// Initialize the first question
displayQuestion();

function shareResults() {
    const archetype = document.getElementById("archetype-result").innerText;
    const channel = document.getElementById("channel-result").innerText;
    const url = "https://yourwebsite.com"; // Change this to your actual URL

    const shareText = `🧬 My Human Design Archetype is: ${archetype}\n✨ Core Channel: ${channel}\n\nFind your archetype here: ${url}`;

    navigator.clipboard.writeText(shareText).then(() => {
        alert("Results copied to clipboard! Share them on social media.");
    });
}

function restartTest() {
    // 1. Reset all tracking variables
    currentQuestionIndex = 0;
    
    // Reset Archetype Scores
    for (let key in archetypeScores) {
        archetypeScores[key] = 0;
    }
    
    // Reset Gate Scores
    gateScores = {};

    // 2. Toggle the UI back
    document.getElementById("results-box").style.display = "none";
    document.getElementById("question-box").style.display = "block";

    // 3. Start the first question again
    displayQuestion();
}