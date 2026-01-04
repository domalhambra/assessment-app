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
    
    // Safety check: if question is undefined, stop and show results
    if (!question) {
        showResults();
        return;
    }

    document.getElementById("question-text").innerText = question.text;
    document.getElementById("progress-fill").style.width = 
        `${((currentQuestionIndex) / questions.length) * 100}%`;
}

function handleAnswer(value) {
    const q = questions[currentQuestionIndex];
    
    // Logic: If the question is reversed, flip the value (1 becomes 5, 2 becomes 4, etc.)
    // Calculation: 6 - 1 = 5 | 6 - 5 = 1
    let adjustedValue = q.reversed ? (6 - value) : value;
    
    const totalPoints = adjustedValue * q.weight;

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

function findWinningChannel(archetypeSlug) {
    const archetype = allArchetypes.find(a => a.slug === archetypeSlug);
    if (!archetype) return { id: "N/A", name: "Channel Not Found" };
    
    let bestChannel = archetype.channels[0];
    let maxScore = -1;

    archetype.channels.forEach(channel => {
        const score = channel.gates.reduce((sum, gate) => sum + (gateScores[gate] || 0), 0);
        if (score > maxScore) {
            maxScore = score;
            bestChannel = channel;
        }
    });
    return bestChannel;
}

function renderSingleResult(winnerSlug) {
    const archetypeData = allArchetypes.find(a => a.slug === winnerSlug);
    const specificChannel = findWinningChannel(winnerSlug);
    document.getElementById("archetype-result").innerText = archetypeData.title;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p>${archetypeData.description}</p>
            <hr>
            <h3>Primary Energy Frequency:</h3>
            <p><span class="channel-pill">${specificChannel.id}</span> <strong>${specificChannel.name}</strong></p>
        </div>`;
}

function renderHybridResult(pSlug, sSlug) {
    const pData = allArchetypes.find(a => a.slug === pSlug);
    const sData = allArchetypes.find(a => a.slug === sSlug);
    const pChannel = findWinningChannel(pSlug);
    const sChannel = findWinningChannel(sSlug);
    document.getElementById("archetype-result").innerText = `${pData.title} + ${sData.title}`;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p><strong>Primary:</strong> ${pData.description}</p>
            <p><strong>Supporting:</strong> ${sData.secondary_description}</p>
            <hr>
            <h3>Core Channels:</h3>
            <p><span class="channel-pill">${pChannel.id}</span> ${pChannel.name}</p>
            <p><span class="channel-pill">${sChannel.id}</span> ${sChannel.name}</p>
        </div>`;
}

function showResults() {
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("results-box").style.display = "block";

    const sortedArchetypes = Object.entries(archetypeScores)
        .sort(([, a], [, b]) => b - a);

    const [winner1, score1] = sortedArchetypes[0];
    const [winner2, score2] = sortedArchetypes[1];

    // If 2nd place is within 15% of the winner, show Hybrid
    if (score1 - score2 <= (score1 * 0.15)) {
        renderHybridResult(winner1, winner2);
    } else {
        renderSingleResult(winner1);
    }
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