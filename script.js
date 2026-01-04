let questions = [];
let allArchetypes = [];
let currentQuestionIndex = 0;
let archetypeScores = {};
let gateScores = {};

// Initialize scores once archetypes load
function initScores() {
    allArchetypes.forEach(archetype => {
        archetypeScores[archetype.slug] = 0;
    });
}

// 1. Load Data with corrected path for your JSON structure
Promise.all([
    fetch('questions.json').then(res => res.json()),
    fetch('human_design_logic.json').then(res => res.json())
]).then(([qData, lData]) => {
    questions = qData.questions;
    // Pointing to your specific JSON nesting
    allArchetypes = lData.human_design_test.archetypes; 
    initScores();
    displayQuestion();
}).catch(err => console.error("Error loading JSON files:", err));

function displayQuestion() {
    const question = questions[currentQuestionIndex];
    if (!question) {
        showResults();
        return;
    }

    document.getElementById("question-text").innerText = question.text;
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    document.getElementById("progress-fill").style.width = `${progress}%`;
}

function handleAnswer(value) {
    const q = questions[currentQuestionIndex];
    
    // Logic for Reversed Questions
    let adjustedValue = q.reversed ? (6 - value) : value;
    const totalPoints = adjustedValue * (q.weight || 1);

    // Update Archetype Scores
    if (archetypeScores.hasOwnProperty(q.archetype)) {
        archetypeScores[q.archetype] += totalPoints;
    }

    // Update Gate Scores
    q.impacted_gates.forEach(gate => {
        gateScores[gate] = (gateScores[gate] || 0) + totalPoints;
    });

    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("results-box").style.display = "block";

    // Sort to find winners
    const sorted = Object.entries(archetypeScores).sort(([, a], [, b]) => b - a);
    const [w1, s1] = sorted[0];
    const [w2, s2] = sorted[1];

    // Threshold for Hybrid: 2nd place within 15% of 1st place
    if (s1 - s2 <= (s1 * 0.15)) {
        renderHybridResult(w1, w2);
    } else {
        renderSingleResult(w1);
    }
}

// Logic to find the specific highest-scoring channel within an archetype
function findWinningChannel(archetypeSlug) {
    const archetype = allArchetypes.find(a => a.slug === archetypeSlug);
    if (!archetype || !archetype.channels) return { id: "N/A", name: "Channel Not Found" };
    
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
    const channel = findWinningChannel(winnerSlug);

    document.getElementById("archetype-result").innerText = archetypeData.title;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p>${archetypeData.description}</p>
            <hr>
            <h3>Core Energetic Frequency:</h3>
            <p><span class="channel-pill">${channel.id}</span> <strong>${channel.name}</strong></p>
        </div>
    `;
}

function renderHybridResult(pSlug, sSlug) {
    const pData = allArchetypes.find(a => a.slug === pSlug);
    const sData = allArchetypes.find(a => a.slug === sSlug);
    const pChannel = findWinningChannel(pSlug);
    const sChannel = findWinningChannel(sSlug);

    document.getElementById("archetype-result").innerText = `${pData.title} + ${sData.title}`;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p><strong>Primary Profile:</strong> ${pData.description}</p>
            <p><strong>Supporting Trait:</strong> ${sData.secondary_description}</p>
            <hr>
            <h3>Core Channels:</h3>
            <p><span class="channel-pill">${pChannel.id}</span> ${pChannel.name}</p>
            <p><span class="channel-pill">${sChannel.id}</span> ${sChannel.name}</p>
        </div>
    `;
}

function restartTest() {
    location.reload();
}