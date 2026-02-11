const API_BASE = "";

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

function playChime(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    if (type === 'high') {
        createTone(880, t, 0.85);
        createTone(1108, t, 0.85);
        createTone(1318, t, 0.85);
    }
}

function createTone(freq, t, duration = 0.9) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
}

function playCountdownClick() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(820, t + 0.06);

    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 1.2;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.17, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.start(t);
    osc.stop(t + 0.1);
}

function speak(text) {
    if (!window.speechSynthesis || voiceMuted) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.08;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.name.includes('Samantha') || v.name.includes('Google US English'));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
}

const USERS = ["Toby", "Anna"];

const METHODOLOGIES = {
    copenhagen: {
        id: "copenhagen",
        name: "University of Copenhagen",
        subtitle: "30/20/10 protocol",
        settings: {
            warmup: 180,
            cooldown: 120,
            easy: 30,
            steady: 20,
            sprint: 10,
            rounds: 5,
            blocks: 2
        }
    },
    norwegian: {
        id: "norwegian",
        name: "Norwegian 4x4",
        subtitle: "4 rounds with strong sustained efforts",
        settings: {
            warmup: 300,
            cooldown: 180,
            easy: 120,
            steady: 60,
            sprint: 60,
            rounds: 4,
            blocks: 1
        }
    },
    tabata: {
        id: "tabata",
        name: "Tabata",
        subtitle: "20/10 burst intervals",
        settings: {
            warmup: 180,
            cooldown: 120,
            easy: 10,
            steady: 1,
            sprint: 20,
            rounds: 8,
            blocks: 1
        }
    }
};

const PHASE_THEME = {
    warmup: {
        color: "#263665",
        bg: "radial-gradient(circle at 20% 15%, #4b63b8 0%, #1a2a50 43%, #0a1020 100%)",
        overlay: 0.1,
        cooldownGlow: 0
    },
    easy: {
        color: "#19c38f",
        bg: "radial-gradient(circle at 18% 17%, #34dba5 0%, #14745d 45%, #061813 100%)",
        overlay: 0,
        cooldownGlow: 0
    },
    steady: {
        color: "#32a8ff",
        bg: "radial-gradient(circle at 18% 17%, #60beff 0%, #195f9e 45%, #07111c 100%)",
        overlay: 0,
        cooldownGlow: 0
    },
    sprint: {
        color: "#ff4f63",
        bg: "radial-gradient(circle at 20% 14%, #ff7a75 0%, #a91931 44%, #19050b 100%)",
        overlay: 0.9,
        cooldownGlow: 0
    },
    cooldown: {
        color: "#3c84d3",
        bg: "radial-gradient(circle at 20% 14%, #62c1ff 0%, #2e68c6 42%, #0b1735 100%)",
        overlay: 0,
        cooldownGlow: 1
    }
};

const instrumentMetrics = {
    running: [
        { key: "distanceKm", label: "Distance (km)", type: "number", min: "0", step: "0.01", placeholder: "e.g. 5.0" },
        { key: "pace", label: "Avg Pace (min/km)", type: "text", placeholder: "e.g. 5:10", metricOnly: true }
    ],
    rowing: [
        { key: "distanceM", label: "Distance (m)", type: "number", min: "0", step: "1", placeholder: "e.g. 1500" },
        { key: "level", label: "Level (0-10)", type: "number", min: "0", max: "10", step: "1", placeholder: "0-10" }
    ],
    riding: [
        { key: "distanceKm", label: "Distance (km)", type: "number", min: "0", step: "0.1", placeholder: "e.g. 16.4" },
        { key: "level", label: "Resistance (0-10)", type: "number", min: "0", max: "10", step: "1", placeholder: "0-10" }
    ],
    spin: [
        { key: "distanceKm", label: "Distance (km)", type: "number", min: "0", step: "0.1", placeholder: "e.g. 12.2" },
        { key: "cadence", label: "Avg Cadence (RPM)", type: "number", min: "0", step: "1", placeholder: "e.g. 90" }
    ]
};

let currentMethodologyId = "copenhagen";
let pendingMethodologyId = currentMethodologyId;
let workoutSettings = cloneSettings(METHODOLOGIES[currentMethodologyId].settings);
let timeline = buildTimeline(workoutSettings);

let currentIndex = 0;
let timeLeft = timeline[0].time;
let timerInterval = null;
let isRunning = false;
let isPaused = false;
let voiceMuted = false;
let sessionLogged = false;
let selectedUser = USERS[0];
let totalTime = timeline.reduce((sum, step) => sum + step.time, 0);
let elapsed = 0;
let cachedLogs = [];

const ui = {
    body: document.body,
    intro: document.getElementById('intro'),
    overlay: document.getElementById('bg-overlay'),
    cooldownOverlay: document.getElementById('cooldown-overlay'),
    phase: document.getElementById('phase'),
    timer: document.getElementById('timer'),
    instr: document.getElementById('instruction'),
    startBtn: document.getElementById('btn-start'),
    pauseBtn: document.getElementById('btn-pause'),
    logBtn: document.getElementById('btn-log'),
    restartBtn: document.getElementById('btn-restart'),
    progress: document.getElementById('progress-bar'),
    voiceToggleWrap: document.getElementById('voice-toggle-wrap'),
    voiceToggle: document.getElementById('voice-toggle'),
    introVoiceBtn: document.getElementById('intro-voice-link'),
    settingsWrap: document.getElementById('settings-wrap'),
    settingsPanel: document.getElementById('settings-panel'),
    watchTime: document.getElementById('watch-time'),
    watchMethodology: document.getElementById('watch-methodology'),
    introUserSelect: document.getElementById('intro-user-select'),
    methodologyGrid: document.getElementById('methodology-grid'),
    methodologyNote: document.getElementById('methodology-note'),
    homeStatsUser: document.getElementById('home-stats-user'),
    homeKpis: document.getElementById('home-stat-kpis'),
    homeList: document.getElementById('home-performances-list')
};

const logUi = {
    modal: document.getElementById('workout-log'),
    instrument: document.getElementById('log-instrument'),
    calories: document.getElementById('log-calories'),
    avgHr: document.getElementById('log-avg-hr'),
    metricsWrap: document.getElementById('log-metrics'),
    userContext: document.getElementById('log-user-context'),
    list: document.getElementById('recent-logs-list')
};

function cloneSettings(settings) {
    return {
        warmup: settings.warmup,
        cooldown: settings.cooldown,
        easy: settings.easy,
        steady: settings.steady,
        sprint: settings.sprint,
        rounds: settings.rounds,
        blocks: settings.blocks
    };
}

function formatClock(seconds) {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

function sanitizeUser(user) {
    return USERS.includes(user) ? user : USERS[0];
}

function sanitizeInstrument(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'running' || normalized === 'rowing' || normalized === 'riding' || normalized === 'spin') {
        return normalized;
    }
    return 'running';
}

function createBlock(settings) {
    const steps = [];
    for (let i = 0; i < settings.rounds; i++) {
        steps.push({
            time: settings.easy,
            phase: "EASY",
            theme: "easy",
            speech: "Recover. Easy spin.",
            instr: "Recover and control breathing"
        });
        steps.push({
            time: settings.steady,
            phase: "STEADY",
            theme: "steady",
            speech: "Steady effort.",
            instr: "Hold strong tempo"
        });
        steps.push({
            time: settings.sprint,
            phase: "SPRINT",
            theme: "sprint",
            speech: "Max effort now!",
            instr: "All out"
        });
    }
    return steps;
}

function buildTimeline(settings) {
    let tl = [{
        time: settings.warmup,
        phase: "WARM UP",
        theme: "warmup",
        speech: "Warm up.",
        instr: "Get loose and ready"
    }];

    for (let i = 0; i < settings.blocks; i++) {
        tl = tl.concat(createBlock(settings));
    }

    tl.push({
        time: settings.cooldown,
        phase: "COOL DOWN",
        theme: "cooldown",
        speech: "Cool down. Breathe easy.",
        instr: "Ease down and recover"
    });

    return tl;
}

function getCurrentMethodology() {
    if (currentMethodologyId && METHODOLOGIES[currentMethodologyId]) {
        return METHODOLOGIES[currentMethodologyId];
    }
    return null;
}

function detectMethodology(settings) {
    const values = Object.values(METHODOLOGIES);
    for (let i = 0; i < values.length; i++) {
        const preset = values[i];
        if (
            preset.settings.warmup === settings.warmup &&
            preset.settings.cooldown === settings.cooldown &&
            preset.settings.easy === settings.easy &&
            preset.settings.steady === settings.steady &&
            preset.settings.sprint === settings.sprint &&
            preset.settings.rounds === settings.rounds &&
            preset.settings.blocks === settings.blocks
        ) {
            return preset.id;
        }
    }
    return "custom";
}

function renderMethodologyButtons() {
    if (!ui.methodologyGrid) return;
    ui.methodologyGrid.innerHTML = "";

    Object.values(METHODOLOGIES).forEach((methodology) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'methodology-btn';
        btn.dataset.methodologyId = methodology.id;
        btn.innerHTML = `<strong>${methodology.name}</strong><span>${methodology.subtitle}</span>`;
        btn.addEventListener('click', () => {
            pendingMethodologyId = methodology.id;
            populateSettingsInputs(cloneSettings(methodology.settings));
            renderMethodologySelection();
            updateWatchDurationPreview();
        });
        ui.methodologyGrid.appendChild(btn);
    });

    renderMethodologySelection();
}

function renderMethodologySelection() {
    const pendingMethod = pendingMethodologyId === 'custom' ? null : METHODOLOGIES[pendingMethodologyId];
    const appliedMethod = getCurrentMethodology();
    let label = pendingMethod ? `${pendingMethod.name} (${pendingMethod.subtitle})` : "Custom";

    if (pendingMethodologyId === 'custom') {
        label = "Custom";
    }

    ui.methodologyNote.innerText = `Methodology: ${label}`;

    if (ui.watchMethodology) {
        ui.watchMethodology.innerText = appliedMethod ? appliedMethod.name : "Custom";
    }

    const buttons = ui.methodologyGrid.querySelectorAll('.methodology-btn');
    buttons.forEach((btn) => {
        const isActive = btn.dataset.methodologyId === pendingMethodologyId;
        btn.classList.toggle('active', isActive);
    });
}

function syncUserUi() {
    selectedUser = sanitizeUser(selectedUser);
    ui.introUserSelect.value = selectedUser;
    logUi.userContext.innerText = `User: ${selectedUser}`;
    ui.homeStatsUser.innerText = selectedUser;
    renderHomeStats(cachedLogs);
}

function updateLogButtonVisibility(currentStep = timeline[currentIndex]) {
    const shouldShow = currentStep && currentStep.phase === "COOL DOWN" && (isRunning || isPaused);
    ui.logBtn.classList.toggle('hidden', !shouldShow);
}

function applyTheme(step) {
    const theme = PHASE_THEME[step.theme] || PHASE_THEME.warmup;
    ui.body.style.background = theme.bg;
    ui.overlay.style.opacity = theme.overlay;
    ui.cooldownOverlay.style.opacity = theme.cooldownGlow;
}

function updateUI() {
    const currentStep = timeline[currentIndex];
    applyTheme(currentStep);

    ui.phase.innerText = currentStep.phase;
    ui.instr.innerText = currentStep.instr;
    ui.timer.innerText = formatClock(timeLeft);

    const pct = Math.min(100, (elapsed / totalTime) * 100);
    ui.progress.style.width = `${pct}%`;

    updateLogButtonVisibility(currentStep);
}

function runTimerTick() {
    elapsed += 1;
    timeLeft -= 1;

    if (timeLeft > 0 && timeLeft <= 3) {
        playCountdownClick();
    }

    if (timeLeft < 0) {
        currentIndex += 1;

        if (currentIndex >= timeline.length) {
            endWorkout();
            return;
        }

        const nextStep = timeline[currentIndex];
        timeLeft = nextStep.time;
        playChime('high');
        speak(nextStep.speech);
    }

    updateUI();
}

function startTimerLoop() {
    timerInterval = setInterval(runTimerTick, 1000);
}

function showWorkoutControls() {
    ui.voiceToggleWrap.classList.remove('hidden');
    ui.settingsWrap.classList.add('hidden');
}

function showHomeControls() {
    ui.voiceToggleWrap.classList.add('hidden');
    ui.settingsWrap.classList.remove('hidden');
}

function startWorkout() {
    if (isRunning) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (currentIndex !== 0 || elapsed !== 0 || timeLeft !== timeline[0].time) {
        resetWorkout(false);
    }

    isRunning = true;
    isPaused = false;
    sessionLogged = false;

    ui.intro.classList.add('hidden');
    ui.startBtn.classList.add('hidden');
    ui.pauseBtn.classList.remove('hidden');
    ui.restartBtn.classList.remove('hidden');
    ui.pauseBtn.innerText = "PAUSE";
    ui.settingsPanel.classList.add('hidden');

    showWorkoutControls();

    speak(timeline[0].speech);
    updateUI();
    startTimerLoop();
}

function endWorkout() {
    clearInterval(timerInterval);
    isRunning = false;
    isPaused = false;

    speak("Workout complete.");

    ui.phase.innerText = "DONE";
    ui.timer.innerText = "0:00";
    ui.pauseBtn.classList.add('hidden');
    ui.logBtn.classList.add('hidden');
    ui.restartBtn.classList.remove('hidden');
    ui.startBtn.classList.remove('hidden');
    ui.startBtn.innerText = "START AGAIN";

    showHomeControls();

    if (!sessionLogged) {
        showLogModal();
    }
}

function togglePause() {
    if (!isRunning) return;

    isPaused = !isPaused;

    if (isPaused) {
        clearInterval(timerInterval);
        ui.pauseBtn.innerText = "RESUME";
        speak("Paused.");
        return;
    }

    ui.pauseBtn.innerText = "PAUSE";
    speak("Resumed.");
    startTimerLoop();
}

function resetWorkout(fullReset = false) {
    clearInterval(timerInterval);

    isRunning = false;
    isPaused = false;
    currentIndex = 0;
    timeLeft = timeline[0].time;
    elapsed = 0;
    sessionLogged = false;

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    ui.startBtn.classList.remove('hidden');
    ui.startBtn.innerText = "START SESSION";
    ui.pauseBtn.classList.add('hidden');
    ui.logBtn.classList.add('hidden');
    ui.restartBtn.classList.add('hidden');

    ui.phase.innerText = "READY";
    ui.timer.innerText = formatClock(totalTime);
    ui.instr.innerText = "Turn up volume and tap start.";
    ui.progress.style.width = "0%";

    applyTheme(timeline[0]);
    closeLogModal();

    if (fullReset) {
        ui.intro.classList.remove('hidden');
    }

    showHomeControls();
}

function restartWorkout() {
    resetWorkout(true);
}

function toggleSettings(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : ui.settingsPanel.classList.contains('hidden');
    ui.settingsPanel.classList.toggle('hidden', !shouldOpen);
    if (shouldOpen) {
        refreshSettingsInputs();
    } else {
        ui.watchTime.innerText = formatClock(totalTime);
        pendingMethodologyId = currentMethodologyId;
        renderMethodologySelection();
    }
}

function syncVoiceUi() {
    ui.voiceToggle.checked = voiceMuted;
    ui.introVoiceBtn.innerText = voiceMuted ? "VOICE: OFF" : "VOICE: ON";
}

function toggleVoiceMute() {
    voiceMuted = !voiceMuted;
    if (voiceMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    syncVoiceUi();
}

function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMetricSummary(instrument, metrics) {
    if (!metrics || typeof metrics !== 'object') return "";

    if (instrument === "running") {
        const parts = [];
        if (metrics.distanceKm !== undefined && metrics.distanceKm !== null && metrics.distanceKm !== "") parts.push(`${metrics.distanceKm} km`);
        if (metrics.pace) parts.push(`${metrics.pace} min/km`);
        return parts.join(", ");
    }

    if (instrument === "rowing") {
        const parts = [];
        if (metrics.distanceM !== undefined && metrics.distanceM !== null && metrics.distanceM !== "") parts.push(`${metrics.distanceM} m`);
        if (metrics.level !== undefined && metrics.level !== null && metrics.level !== "") parts.push(`L${metrics.level}`);
        return parts.join(", ");
    }

    if (instrument === "riding") {
        const parts = [];
        if (metrics.distanceKm !== undefined && metrics.distanceKm !== null && metrics.distanceKm !== "") parts.push(`${metrics.distanceKm} km`);
        if (metrics.level !== undefined && metrics.level !== null && metrics.level !== "") parts.push(`R${metrics.level}`);
        return parts.join(", ");
    }

    if (instrument === "spin") {
        const parts = [];
        if (metrics.distanceKm !== undefined && metrics.distanceKm !== null && metrics.distanceKm !== "") parts.push(`${metrics.distanceKm} km`);
        if (metrics.cadence !== undefined && metrics.cadence !== null && metrics.cadence !== "") parts.push(`${metrics.cadence} rpm`);
        return parts.join(", ");
    }

    return "";
}

function formatEntryDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0m";
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m <= 0) return `${s}s`;
    return `${m}m ${s}s`;
}

function renderHomeStats(logs) {
    if (!ui.homeKpis || !ui.homeList) return;

    const filtered = logs.filter((entry) => sanitizeUser(entry.user) === selectedUser);
    const lastFive = filtered.slice(0, 5);

    const totalSessions = filtered.length;
    const totalMinutes = filtered.reduce((sum, entry) => sum + ((Number(entry.durationSec) || 0) / 60), 0);
    const hrEntries = filtered.filter((entry) => Number(entry.avgHr) > 0);
    const avgHr = hrEntries.length
        ? Math.round(hrEntries.reduce((sum, entry) => sum + Number(entry.avgHr), 0) / hrEntries.length)
        : 0;

    ui.homeKpis.innerHTML = `
        <div class="kpi-card"><strong>${totalSessions}</strong><span>Sessions</span></div>
        <div class="kpi-card"><strong>${Math.round(totalMinutes)}</strong><span>Total Min</span></div>
        <div class="kpi-card"><strong>${avgHr || '--'}</strong><span>Avg HR</span></div>
    `;

    ui.homeList.innerHTML = "";

    if (!lastFive.length) {
        const li = document.createElement('li');
        li.innerHTML = '<div class="row-main">No workouts logged yet.</div><div class="row-sub">Complete a session and save the log to populate this panel.</div>';
        ui.homeList.appendChild(li);
        return;
    }

    lastFive.forEach((entry) => {
        const instrument = sanitizeInstrument(entry.instrument);
        const metricSummary = formatMetricSummary(instrument, entry.metrics || {});
        const calories = Number(entry.calories) || 0;
        const duration = formatDuration(Number(entry.durationSec) || 0);

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="row-top"><span>${formatEntryDate(entry.date)}</span><span>${duration}</span></div>
            <div class="row-main"><span>${capitalize(instrument)}</span><span>${calories} cal</span></div>
            <div class="row-sub">${metricSummary || 'No extra metrics'}</div>
        `;
        ui.homeList.appendChild(li);
    });
}

function renderLogs(logs) {
    if (!logUi.list) return;

    logUi.list.innerHTML = "";

    if (!logs.length) {
        const li = document.createElement('li');
        li.innerText = "No sessions yet.";
        logUi.list.appendChild(li);
        return;
    }

    logs.slice(0, 10).forEach((entry) => {
        const li = document.createElement('li');
        const user = sanitizeUser(entry.user || USERS[0]);
        const instrument = sanitizeInstrument(entry.instrument || 'running');
        const date = new Date(entry.date).toLocaleDateString();
        const metricSummary = formatMetricSummary(instrument, entry.metrics || {});

        li.innerText = `${date} - ${user} - ${capitalize(instrument)} - ${entry.calories || 0} cal - ${entry.avgHr || 0} avg HR${metricSummary ? ` - ${metricSummary}` : ""}`;
        logUi.list.appendChild(li);
    });
}

async function fetchLogs() {
    try {
        const res = await fetch(`${API_BASE}/api/logs`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        const logs = await res.json();
        if (!Array.isArray(logs)) return [];
        return logs;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function refreshLogs() {
    cachedLogs = await fetchLogs();
    renderLogs(cachedLogs);
    renderHomeStats(cachedLogs);
}

function renderLogMetrics(instrument, values = {}) {
    const fields = instrumentMetrics[instrument] || [];
    logUi.metricsWrap.innerHTML = "";

    fields.forEach((field) => {
        const label = document.createElement('label');
        label.innerText = field.label;
        if (field.metricOnly) label.classList.add('metric-only');

        const input = document.createElement('input');
        input.type = field.type;
        input.dataset.metricKey = field.key;

        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        if (field.step !== undefined) input.step = field.step;

        if (values[field.key] !== undefined && values[field.key] !== null) {
            input.value = values[field.key];
        }

        label.appendChild(input);
        logUi.metricsWrap.appendChild(label);
    });
}

function collectLogMetrics() {
    const data = {};
    const inputs = logUi.metricsWrap.querySelectorAll('input[data-metric-key]');

    inputs.forEach((input) => {
        const key = input.dataset.metricKey;
        if (!key) return;

        const raw = input.value.trim();
        if (raw === '') {
            data[key] = null;
            return;
        }

        if (input.type === 'number') {
            const n = Number(raw);
            data[key] = Number.isFinite(n) ? n : null;
            return;
        }

        data[key] = raw;
    });

    return data;
}

function showLogModal() {
    logUi.modal.classList.remove('hidden');
    logUi.instrument.value = 'running';
    logUi.calories.value = '';
    logUi.avgHr.value = '';
    syncUserUi();
    renderLogMetrics(logUi.instrument.value);
    renderLogs(cachedLogs);
}

function closeLogModal() {
    logUi.modal.classList.add('hidden');
}

async function saveWorkoutLog() {
    const instrument = sanitizeInstrument(logUi.instrument.value || 'running');
    const entry = {
        date: new Date().toISOString(),
        durationSec: elapsed,
        user: sanitizeUser(selectedUser),
        instrument,
        calories: parseInt(logUi.calories.value || '0', 10),
        avgHr: parseInt(logUi.avgHr.value || '0', 10),
        metrics: collectLogMetrics()
    };

    try {
        const res = await fetch(`${API_BASE}/api/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        if (!res.ok) throw new Error('Failed to save log');
    } catch (err) {
        console.error(err);
        alert('Could not save log. Make sure server is running.');
        return;
    }

    sessionLogged = true;
    await refreshLogs();
    closeLogModal();
}

function refreshSettingsInputs() {
    populateSettingsInputs(workoutSettings);
    pendingMethodologyId = currentMethodologyId;
    renderMethodologySelection();
    updateWatchDurationPreview();
}

function populateSettingsInputs(settings) {
    document.getElementById('set-warmup').value = settings.warmup;
    document.getElementById('set-cooldown').value = settings.cooldown;
    document.getElementById('set-easy').value = settings.easy;
    document.getElementById('set-steady').value = settings.steady;
    document.getElementById('set-sprint').value = settings.sprint;
    document.getElementById('set-rounds').value = settings.rounds;
    document.getElementById('set-blocks').value = settings.blocks;
}

function readSettingsInputs() {
    return {
        warmup: Math.max(0, parseInt(document.getElementById('set-warmup').value, 10) || 0),
        cooldown: Math.max(0, parseInt(document.getElementById('set-cooldown').value, 10) || 0),
        easy: Math.max(1, parseInt(document.getElementById('set-easy').value, 10) || 30),
        steady: Math.max(1, parseInt(document.getElementById('set-steady').value, 10) || 20),
        sprint: Math.max(1, parseInt(document.getElementById('set-sprint').value, 10) || 10),
        rounds: Math.max(1, parseInt(document.getElementById('set-rounds').value, 10) || 5),
        blocks: Math.max(1, parseInt(document.getElementById('set-blocks').value, 10) || 2)
    };
}

function computeTotalTime(settings) {
    const block = (settings.easy + settings.steady + settings.sprint) * settings.rounds;
    return settings.warmup + settings.cooldown + (block * settings.blocks);
}

function updateWatchDurationPreview() {
    const pendingSettings = readSettingsInputs();
    ui.watchTime.innerText = formatClock(computeTotalTime(pendingSettings));
}

function applySettings() {
    const next = readSettingsInputs();
    currentMethodologyId = detectMethodology(next);
    pendingMethodologyId = currentMethodologyId;
    workoutSettings = next;

    timeline = buildTimeline(workoutSettings);
    totalTime = timeline.reduce((sum, step) => sum + step.time, 0);

    renderMethodologySelection();
    ui.watchTime.innerText = formatClock(totalTime);

    resetWorkout(true);
    toggleSettings(false);
}

ui.voiceToggle.addEventListener('change', (e) => {
    voiceMuted = e.target.checked;
    if (voiceMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    syncVoiceUi();
});

logUi.instrument.addEventListener('change', (e) => {
    renderLogMetrics(sanitizeInstrument(e.target.value));
});

ui.introUserSelect.addEventListener('change', (e) => {
    selectedUser = sanitizeUser(e.target.value);
    syncUserUi();
});

document.querySelector('.watch-shell').addEventListener('keydown', (e) => {
    const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    if (targetTag === 'select' || targetTag === 'input' || targetTag === 'button') return;

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startWorkout();
    }
});

['set-warmup', 'set-cooldown', 'set-easy', 'set-steady', 'set-sprint', 'set-rounds', 'set-blocks'].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
        const pending = readSettingsInputs();
        pendingMethodologyId = detectMethodology(pending);
        renderMethodologySelection();
        updateWatchDurationPreview();
    });
});

ui.watchTime.innerText = formatClock(totalTime);
ui.timer.innerText = formatClock(totalTime);
applyTheme(timeline[0]);
renderMethodologyButtons();
refreshSettingsInputs();
syncVoiceUi();
syncUserUi();
renderLogMetrics(logUi.instrument.value || 'running');
updateLogButtonVisibility();
refreshLogs();
setInterval(refreshLogs, 30000);
