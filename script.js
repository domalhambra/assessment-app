let questions = [];
let allArchetypes = [];
let currentQuestionIndex = 0;
let archetypeScores = {};
let gateScores = {};

/**
 * 1. INITIALIZATION & DATA LOADING
 * Fetches data and builds the dynamic scoring table
 */
async function loadTestData() {
    try {
        const [qRes, lRes] = await Promise.all([
            fetch('questions.json'),
            fetch('human_design_logic.json')
        ]);

        const qData = await qRes.json();
        const lData = await lRes.json();
        
        questions = qData.questions;
        allArchetypes = lData.human_design_test.archetypes;
        
        // Dynamically build the score tracking for whatever archetypes exist in JSON
        allArchetypes.forEach(archetype => {
            archetypeScores[archetype.id] = 0;
        });

        displayQuestion(); 
    } catch (error) {
        console.error("Data loading error:", error);
    }
}

loadTestData();

/**
 * 2. QUIZ FLOW LOGIC
 */
function displayQuestion() {
    const question = questions[currentQuestionIndex];
    
    // Safety check for end of quiz
    if (!question) {
        showResults();
        return;
    }

    document.getElementById("question-text").innerText = question.text;

    // Update Progress Bar
    const progressPercent = (currentQuestionIndex / questions.length) * 100;
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;
}

function handleAnswer(value) {
    const q = questions[currentQuestionIndex];
    
    // Process Reversed Logic: (1 becomes 5, 5 becomes 1)
    let adjustedValue = q.reversed ? (6 - value) : value;
    const totalPoints = adjustedValue * (q.weight || 1);

    // Add points to Archetype (via ID)
    if (archetypeScores.hasOwnProperty(q.archetype_id)) {
        archetypeScores[q.archetype_id] += totalPoints;
    }

    // Add points to individual Gates
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

/**
 * 3. SCORING & CHANNEL CALCULATION
 */
function findWinningChannel(archetypeObj) {
    if (!archetypeObj || !archetypeObj.channels) return null;
    
    let topChannel = archetypeObj.channels[0];
    let highestChannelScore = -1;

    archetypeObj.channels.forEach(channel => {
        // Calculate channel score based on sum of its two gates
        const currentScore = channel.gates.reduce((sum, gate) => sum + (gateScores[gate] || 0), 0);

        if (currentScore > highestChannelScore) {
            highestChannelScore = currentScore;
            topChannel = channel;
        }
    });

    return topChannel;
}

/**
 * 4. RESULT RENDERING
 */
function showResults() {
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("results-box").style.display = "block";

    // Sort archetypes by score descending
    const sorted = Object.entries(archetypeScores).sort(([, a], [, b]) => b - a);
    
    // Get Winner IDs
    const winner1Id = parseInt(sorted[0][0]);
    const winner2Id = parseInt(sorted[1][0]);
    const score1 = sorted[0][1];
    const score2 = sorted[1][1];

    // Look up actual data from allArchetypes
    const winner1Data = allArchetypes.find(a => a.id === winner1Id);
    const winner2Data = allArchetypes.find(a => a.id === winner2Id);

    // Hybrid Threshold: 15%
    if (score1 - score2 <= (score1 * 0.15)) {
        renderHybridResult(winner1Data, winner2Data);
    } else {
        renderSingleResult(winner1Data);
    }
}

function renderSingleResult(winner) {
    const channel = findWinningChannel(winner);
    document.getElementById("archetype-result").innerText = winner.title;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p>${winner.description}</p>
            <hr>
            <h3>Core Energetic Frequency:</h3>
            <p><span class="channel-pill">${channel.id}</span> <strong>${channel.name}</strong></p>
        </div>
    `;
}

function renderHybridResult(pWinner, sWinner) {
    const pChannel = findWinningChannel(pWinner);
    const sChannel = findWinningChannel(sWinner);

    document.getElementById("archetype-result").innerText = `${pWinner.title} + ${sWinner.title}`;
    document.getElementById("channel-result").innerHTML = `
        <div class="description-box">
            <p><strong>Primary Profile:</strong> ${pWinner.description}</p>
            <p><strong>Supporting Trait:</strong> ${sWinner.secondary_description}</p>
            <hr>
            <h3>Core Channels:</h3>
            <p><span class="channel-pill">${pChannel.id}</span> ${pChannel.name}</p>
            <p><span class="channel-pill">${sChannel.id}</span> ${sChannel.name}</p>
        </div>
    `;
}

/**
 * 5. UTILITY FUNCTIONS
 */
function restartTest() {
    location.reload();
}

function shareResults() {
    const archetype = document.getElementById("archetype-result").innerText;
    const url = window.location.href;
    const text = `🧬 My Human Design Archetype is: ${archetype}! Find yours here: ${url}`;

    if (navigator.share) {
        navigator.share({ title: 'My Results', text: text, url: url });
    } else {
        navigator.clipboard.writeText(text);
        alert("Results copied to clipboard!");
    }
}