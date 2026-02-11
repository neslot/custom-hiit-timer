const API_BASE = "";
const PREFS_KEY = "hiit_timer_prefs_v4";

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
        subtitle: "30/20/10 with mid-block recovery",
        settings: {
            warmup: 120,
            cooldown: 60,
            blockRest: 120,
            easy: 30,
            steady: 20,
            sprint: 10,
            rounds: 5,
            blocks: 2
        }
    },
    norwegian: {
        id: "norwegian",
        name: "Norwegian 4x4 Style",
        subtitle: "Long hard intervals with recovery",
        settings: {
            warmup: 300,
            cooldown: 180,
            blockRest: 180,
            easy: 90,
            steady: 30,
            sprint: 150,
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
            blockRest: 60,
            easy: 10,
            steady: 1,
            sprint: 20,
            rounds: 8,
            blocks: 1
        }
    }
};

const HOME_VARIANTS = ['v1', 'v2', 'v3'];
const START_VARIANTS = ['s1', 's2', 's3'];

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
    recovery: {
        color: "#7bb6ff",
        bg: "radial-gradient(circle at 20% 14%, #8dd3ff 0%, #2a5f9b 44%, #091428 100%)",
        overlay: 0.06,
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
let homeRange = 7;
let storageBackend = "local";
let toastTimer = null;
let connectionAlerted = false;
let sessionProtocolId = currentMethodologyId;
let sessionProtocolLabel = METHODOLOGIES[currentMethodologyId].name;
let homeVariant = 'v1';
let startVariant = 's1';
let logMode = 'session';

const statsState = {
    user: selectedUser,
    metric: "calories",
    range: 30,
    equipment: "all",
    protocol: "all"
};

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
    progress: document.getElementById('progress-bar'),
    voiceToggleWrap: document.getElementById('voice-toggle-wrap'),
    voiceToggle: document.getElementById('voice-toggle'),
    introVoiceBtn: document.getElementById('intro-voice-link'),
    voiceStateText: document.getElementById('voice-state-text'),
    settingsWrap: document.getElementById('settings-wrap'),
    settingsPanel: document.getElementById('settings-panel'),
    watchTime: document.getElementById('watch-time'),
    watchMethodology: document.getElementById('watch-methodology'),
    introUserSelect: document.getElementById('intro-user-select'),
    methodologyGrid: document.getElementById('methodology-grid'),
    methodologyNote: document.getElementById('methodology-note'),
    homeStatsUser: document.getElementById('home-stats-user'),
    homeKpis: document.getElementById('home-stat-kpis'),
    homeList: document.getElementById('home-performances-list'),
    homeRangeTabs: document.getElementById('home-range-tabs'),
    storageBadge: document.getElementById('storage-badge'),
    toast: document.getElementById('toast'),
    statsPage: document.getElementById('stats-page'),
    statsUserSelect: document.getElementById('stats-user-select'),
    statsMetricSelect: document.getElementById('stats-metric-select'),
    statsRangeSelect: document.getElementById('stats-range-select'),
    statsEquipmentToggles: document.getElementById('stats-equipment-toggles'),
    statsProtocolToggles: document.getElementById('stats-protocol-toggles'),
    statsLineTitle: document.getElementById('stats-line-title'),
    statsSummaryList: document.getElementById('stats-summary-list'),
    statsSessionsList: document.getElementById('stats-sessions-list'),
    statsLineCanvas: document.getElementById('stats-line-canvas'),
    statsMixCanvas: document.getElementById('stats-mix-canvas')
};

ui.homeBtn = document.getElementById('btn-home');
ui.statsBtn = document.getElementById('btn-stats');
ui.settingsBtn = document.getElementById('btn-settings');

const logUi = {
    modal: document.getElementById('workout-log'),
    instrument: document.getElementById('log-instrument'),
    calories: document.getElementById('log-calories'),
    avgHr: document.getElementById('log-avg-hr'),
    dateInput: document.getElementById('log-date'),
    durationMin: document.getElementById('log-duration-min'),
    metricsWrap: document.getElementById('log-metrics'),
    userContext: document.getElementById('log-user-context'),
    modeContext: document.getElementById('log-mode-context'),
    protocolContext: document.getElementById('log-protocol-context'),
    list: document.getElementById('recent-logs-list')
};

function cloneSettings(settings) {
    return {
        warmup: settings.warmup,
        cooldown: settings.cooldown,
        blockRest: settings.blockRest,
        easy: settings.easy,
        steady: settings.steady,
        sprint: settings.sprint,
        rounds: settings.rounds,
        blocks: settings.blocks
    };
}

function normalizeSettings(raw, fallback = METHODOLOGIES.copenhagen.settings) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        warmup: Math.max(0, parseInt(source.warmup, 10) || fallback.warmup),
        cooldown: Math.max(0, parseInt(source.cooldown, 10) || fallback.cooldown),
        blockRest: Math.max(0, parseInt(source.blockRest, 10) || fallback.blockRest),
        easy: Math.max(1, parseInt(source.easy, 10) || fallback.easy),
        steady: Math.max(1, parseInt(source.steady, 10) || fallback.steady),
        sprint: Math.max(1, parseInt(source.sprint, 10) || fallback.sprint),
        rounds: Math.max(1, parseInt(source.rounds, 10) || fallback.rounds),
        blocks: Math.max(1, parseInt(source.blocks, 10) || fallback.blocks)
    };
}

function persistPreferences() {
    try {
        const payload = {
            selectedUser,
            voiceMuted,
            homeRange,
            workoutSettings,
            currentMethodologyId,
            statsState,
            homeVariant,
            startVariant
        };
        localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
    } catch {
        // Ignore localStorage errors.
    }
}

function loadPreferences() {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        selectedUser = sanitizeUser(parsed.selectedUser);
        voiceMuted = !!parsed.voiceMuted;
        homeRange = parsed.homeRange === 'all' ? 'all' : Math.max(1, parseInt(parsed.homeRange, 10) || 7);
        workoutSettings = normalizeSettings(parsed.workoutSettings, METHODOLOGIES.copenhagen.settings);
        currentMethodologyId = detectMethodology(workoutSettings);
        pendingMethodologyId = currentMethodologyId;
        if (parsed.statsState && typeof parsed.statsState === 'object') {
            statsState.user = sanitizeUser(parsed.statsState.user || selectedUser);
            statsState.metric = parsed.statsState.metric || statsState.metric;
            statsState.range = parsed.statsState.range === 'all' ? 'all' : Math.max(1, parseInt(parsed.statsState.range, 10) || 30);
            statsState.equipment = parsed.statsState.equipment || 'all';
            statsState.protocol = parsed.statsState.protocol || 'all';
        }
        homeVariant = sanitizeHomeVariant(parsed.homeVariant);
        startVariant = sanitizeStartVariant(parsed.startVariant);
    } catch {
        // Ignore malformed preference payloads.
    }
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

function sanitizeProtocol(value) {
    const normalized = String(value || '').toLowerCase();
    if (METHODOLOGIES[normalized]) return normalized;
    if (normalized === 'custom') return 'custom';
    return 'unknown';
}

function sanitizeHomeVariant(value) {
    const normalized = String(value || '').toLowerCase();
    return HOME_VARIANTS.includes(normalized) ? normalized : 'v1';
}

function sanitizeStartVariant(value) {
    const normalized = String(value || '').toLowerCase();
    return START_VARIANTS.includes(normalized) ? normalized : 's1';
}

function collectVariantTokens() {
    const tokens = [];
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    pathSegments.forEach((segment) => tokens.push(segment.toLowerCase()));

    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
        hash
            .split(/[\/|,]+/)
            .map((segment) => segment.trim().toLowerCase())
            .filter(Boolean)
            .forEach((segment) => tokens.push(segment));
    }
    return tokens;
}

function readVariantsFromLocation() {
    const result = {};
    const tokens = collectVariantTokens();

    tokens.forEach((token) => {
        if (/^v[1-3]$/.test(token)) {
            result.home = token;
        }
        if (/^s[1-3]$/.test(token)) {
            result.start = token;
        }
    });

    return result;
}

function applyVisualVariants() {
    HOME_VARIANTS.forEach((id) => ui.body.classList.remove(`home-${id}`));
    START_VARIANTS.forEach((id) => ui.body.classList.remove(`start-${id}`));
    ui.body.classList.add(`home-${homeVariant}`);
    ui.body.classList.add(`start-${startVariant}`);
}

function syncVariantsFromLocation(options = {}) {
    const announce = options.announce !== false;
    const parsed = readVariantsFromLocation();
    let changed = false;

    if (parsed.home) {
        const nextHome = sanitizeHomeVariant(parsed.home);
        if (nextHome !== homeVariant) {
            homeVariant = nextHome;
            changed = true;
        }
    }

    if (parsed.start) {
        const nextStart = sanitizeStartVariant(parsed.start);
        if (nextStart !== startVariant) {
            startVariant = nextStart;
            changed = true;
        }
    }

    applyVisualVariants();
    if (changed && announce) {
        persistPreferences();
        showToast(`Style ${homeVariant.toUpperCase()} / ${startVariant.toUpperCase()}`);
        return;
    }

    if (changed) {
        persistPreferences();
    }
}

function getProtocolLabel(protocolId, fallbackLabel) {
    const id = sanitizeProtocol(protocolId);
    if (fallbackLabel && typeof fallbackLabel === 'string' && fallbackLabel.trim()) {
        return fallbackLabel.trim();
    }
    if (METHODOLOGIES[id]) return METHODOLOGIES[id].name;
    if (id === 'custom') return 'Custom';
    return 'Unknown';
}

function createBlock(settings) {
    const steps = [];
    for (let i = 0; i < settings.rounds; i++) {
        steps.push({
            time: settings.easy,
            phase: "EASY",
            theme: "easy",
            speech: "Recover. Easy effort.",
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
        if (i < settings.blocks - 1 && settings.blockRest > 0) {
            tl.push({
                time: settings.blockRest,
                phase: "RECOVERY",
                theme: "recovery",
                speech: "Recovery block. Breathe.",
                instr: "Easy recovery before next block"
            });
        }
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
            preset.settings.blockRest === settings.blockRest &&
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
    if (ui.statsUserSelect) {
        ui.statsUserSelect.value = sanitizeUser(statsState.user || selectedUser);
    }
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
    updateTopActionButtons();
}

function showHomeControls() {
    ui.voiceToggleWrap.classList.add('hidden');
    updateTopActionButtons();
}

function updateTopActionButtons() {
    if (!ui.settingsWrap) return;

    const introVisible = !ui.intro.classList.contains('hidden');
    if (introVisible) {
        ui.settingsWrap.classList.add('hidden');
        return;
    }

    if (isRunning && !isPaused) {
        ui.settingsWrap.classList.add('hidden');
        return;
    }

    ui.settingsWrap.classList.remove('hidden');

    if (isPaused) {
        if (ui.homeBtn) ui.homeBtn.classList.remove('hidden');
        if (ui.statsBtn) ui.statsBtn.classList.remove('hidden');
        if (ui.settingsBtn) ui.settingsBtn.classList.add('hidden');
        return;
    }

    if (ui.homeBtn) ui.homeBtn.classList.add('hidden');
    if (ui.statsBtn) ui.statsBtn.classList.remove('hidden');
    if (ui.settingsBtn) ui.settingsBtn.classList.remove('hidden');
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
    sessionProtocolId = currentMethodologyId;
    sessionProtocolLabel = getProtocolLabel(currentMethodologyId);
    window.scrollTo(0, 0);

    ui.intro.classList.add('hidden');
    ui.body.classList.add('is-workout');
    ui.startBtn.classList.add('hidden');
    ui.pauseBtn.classList.remove('hidden');
    ui.pauseBtn.classList.remove('is-paused');
    ui.pauseBtn.innerText = "Pause";
    ui.settingsPanel.classList.add('hidden');
    closeStatsPage();

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

    ui.phase.innerText = "Done";
    ui.timer.innerText = "0:00";
    ui.pauseBtn.classList.add('hidden');
    ui.pauseBtn.classList.remove('is-paused');
    ui.logBtn.classList.add('hidden');
    ui.startBtn.classList.remove('hidden');
    ui.startBtn.innerText = "Start Again";

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
        ui.pauseBtn.innerText = "Resume";
        ui.pauseBtn.classList.add('is-paused');
        speak("Paused.");
        updateTopActionButtons();
        return;
    }

    ui.pauseBtn.innerText = "Pause";
    ui.pauseBtn.classList.remove('is-paused');
    speak("Resumed.");
    updateTopActionButtons();
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
    ui.startBtn.innerText = "Start Session";
    ui.pauseBtn.classList.add('hidden');
    ui.pauseBtn.classList.remove('is-paused');
    ui.logBtn.classList.add('hidden');

    ui.phase.innerText = "Ready";
    ui.timer.innerText = formatClock(totalTime);
    ui.instr.innerText = "Turn up volume and tap start.";
    ui.progress.style.width = "0%";

    applyTheme(timeline[0]);
    ui.body.classList.remove('is-workout');
    closeLogModal();

    if (fullReset) {
        ui.intro.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    showHomeControls();
}

function goHomeFromWorkout() {
    closeStatsPage();
    resetWorkout(true);
}

function toggleSettings(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : ui.settingsPanel.classList.contains('hidden');
    ui.settingsPanel.classList.toggle('hidden', !shouldOpen);
    ui.body.classList.toggle('settings-open', shouldOpen);
    if (shouldOpen) {
        closeStatsPage();
        refreshSettingsInputs();
    } else {
        ui.watchTime.innerText = formatClock(totalTime);
        pendingMethodologyId = currentMethodologyId;
        renderMethodologySelection();
        updateTopActionButtons();
    }
}

function syncVoiceUi() {
    ui.voiceToggle.checked = voiceMuted;
    if (ui.voiceStateText) {
        ui.voiceStateText.innerText = voiceMuted ? "Off" : "On";
    }
}

function toggleVoiceMute() {
    voiceMuted = !voiceMuted;
    if (voiceMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    syncVoiceUi();
    persistPreferences();
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

function toDatetimeLocalValue(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
}

function parseDatetimeLocalToIso(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function normalizeLogEntry(entry) {
    const user = sanitizeUser(entry.user);
    const instrument = sanitizeInstrument(entry.instrument);
    const protocolId = sanitizeProtocol(entry.protocolId || entry.protocol || 'unknown');
    const protocolLabel = getProtocolLabel(protocolId, entry.protocolLabel);
    return {
        ...entry,
        user,
        instrument,
        protocolId,
        protocolLabel,
        calories: Math.max(0, Number(entry.calories || 0)),
        avgHr: Math.max(0, Number(entry.avgHr || 0)),
        durationSec: Math.max(0, Number(entry.durationSec || 0)),
        metrics: entry.metrics && typeof entry.metrics === 'object' ? entry.metrics : {}
    };
}

function getDistanceKm(entry) {
    const instrument = sanitizeInstrument(entry.instrument);
    const metrics = entry.metrics || {};
    if (instrument === 'rowing') {
        const meters = Number(metrics.distanceM);
        return Number.isFinite(meters) ? meters / 1000 : 0;
    }
    const km = Number(metrics.distanceKm);
    return Number.isFinite(km) ? km : 0;
}

function toDayKey(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function dayKeyMinusOne(dayKey) {
    const d = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() - 1);
    return toDayKey(d);
}

function computeStreakDays(entries) {
    const uniqueDays = new Set(entries.map((entry) => toDayKey(entry.date)).filter(Boolean));
    if (!uniqueDays.size) return 0;

    const sortedDays = Array.from(uniqueDays).sort((a, b) => b.localeCompare(a));
    let cursor = sortedDays[0];
    let streak = 0;

    while (cursor && uniqueDays.has(cursor)) {
        streak += 1;
        cursor = dayKeyMinusOne(cursor);
    }

    return streak;
}

function inRange(dateValue, range) {
    if (range === 'all') return true;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - Number(range));
    return d >= cutoff;
}

function renderRangeTabs() {
    if (!ui.homeRangeTabs) return;
    const tabs = ui.homeRangeTabs.querySelectorAll('.range-tab');
    tabs.forEach((tab) => {
        const isActive = tab.dataset.range === String(homeRange);
        tab.classList.toggle('active', isActive);
    });
}

function setStorageBadge(mode) {
    storageBackend = mode;
    if (!ui.storageBadge) return;
    ui.storageBadge.innerText = "Manual Log";
}

function showToast(message, tone = 'good') {
    if (!ui.toast) return;
    ui.toast.innerText = message;
    ui.toast.classList.remove('hidden', 'good', 'bad');
    ui.toast.classList.add(tone === 'bad' ? 'bad' : 'good');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        ui.toast.classList.add('hidden');
    }, 1900);
}

function renderHomeStats(logs) {
    if (!ui.homeKpis || !ui.homeList) return;

    const userLogs = logs.filter((entry) => sanitizeUser(entry.user) === selectedUser);
    const rangeLogs = userLogs.filter((entry) => inRange(entry.date, homeRange));
    const lastFive = rangeLogs.slice(0, 5);

    const totalSessions = rangeLogs.length;
    const totalMinutes = rangeLogs.reduce((sum, entry) => sum + ((Number(entry.durationSec) || 0) / 60), 0);
    const hrEntries = rangeLogs.filter((entry) => Number(entry.avgHr) > 0);
    const streak = computeStreakDays(userLogs);
    const avgHr = hrEntries.length
        ? Math.round(hrEntries.reduce((sum, entry) => sum + Number(entry.avgHr), 0) / hrEntries.length)
        : 0;

    ui.homeKpis.innerHTML = `
        <div class="kpi-card"><strong>${totalSessions}</strong><span>Sessions</span></div>
        <div class="kpi-card"><strong>${Math.round(totalMinutes)}</strong><span>Total Min</span></div>
        <div class="kpi-card"><strong>${avgHr || '--'}</strong><span>Avg HR</span></div>
        <div class="kpi-card"><strong>${streak}</strong><span>Streak</span></div>
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
        const hrText = Number(entry.avgHr) > 0 ? `${Number(entry.avgHr)} bpm` : "--";
        const protocolText = getProtocolLabel(entry.protocolId, entry.protocolLabel);

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="row-top"><span>${formatEntryDate(entry.date)}</span><span>${duration}</span></div>
            <div class="row-main"><span>${capitalize(instrument)}</span><span>${calories} cal</span></div>
            <div class="row-sub">HR ${hrText} | ${protocolText}${metricSummary ? ` | ${metricSummary}` : ''}</div>
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
        const protocolText = getProtocolLabel(entry.protocolId, entry.protocolLabel);

        li.innerText = `${date} - ${user} - ${capitalize(instrument)} - ${entry.calories || 0} cal - ${entry.avgHr || 0} avg HR - ${protocolText}${metricSummary ? ` - ${metricSummary}` : ""}`;
        logUi.list.appendChild(li);
    });
}

async function fetchLogs() {
    try {
        const res = await fetch(`${API_BASE}/api/logs`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        const logs = await res.json();
        if (!Array.isArray(logs)) return [];
        const normalized = logs.map(normalizeLogEntry);
        if (storageBackend === 'offline') {
            setStorageBadge('local');
        }
        connectionAlerted = false;
        return normalized;
    } catch (err) {
        console.error(err);
        setStorageBadge('offline');
        if (!connectionAlerted) {
            showToast('Cannot reach server', 'bad');
            connectionAlerted = true;
        }
        return [];
    }
}

async function refreshStorageMode() {
    try {
        const res = await fetch(`${API_BASE}/api/storage`);
        if (!res.ok) throw new Error('Failed storage check');
        const payload = await res.json();
        if (payload && payload.backend) {
            setStorageBadge(payload.backend);
            return;
        }
    } catch (err) {
        console.error(err);
    }
    if (storageBackend !== 'offline') {
        setStorageBadge('local');
    }
}

async function refreshLogs() {
    cachedLogs = await fetchLogs();
    renderLogs(cachedLogs);
    renderHomeStats(cachedLogs);
    renderStatsPage();
}

function openStatsPage() {
    if (!ui.statsPage) return;
    ui.statsPage.classList.remove('hidden');
    renderStatsPage();
}

function closeStatsPage() {
    if (!ui.statsPage) return;
    ui.statsPage.classList.add('hidden');
}

function buildChip(container, value, label, current, onSelect) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.innerText = label;
    btn.classList.toggle('active', current === value);
    btn.addEventListener('click', () => onSelect(value));
    container.appendChild(btn);
}

function renderStatsEquipmentToggles() {
    if (!ui.statsEquipmentToggles) return;
    ui.statsEquipmentToggles.innerHTML = '';
    buildChip(ui.statsEquipmentToggles, 'all', 'All', statsState.equipment, (value) => {
        statsState.equipment = value;
        renderStatsPage();
        persistPreferences();
    });
    ['running', 'rowing', 'riding', 'spin'].forEach((eq) => {
        buildChip(ui.statsEquipmentToggles, eq, capitalize(eq), statsState.equipment, (value) => {
            statsState.equipment = value;
            renderStatsPage();
            persistPreferences();
        });
    });
}

function protocolOptionsFromLogs(logs) {
    const found = new Set(logs.map((entry) => sanitizeProtocol(entry.protocolId)));
    const ordered = ['copenhagen', 'norwegian', 'tabata', 'custom', 'unknown'];
    const options = ['all'];
    ordered.forEach((id) => {
        if (id === 'unknown' && !found.has('unknown')) return;
        if (id !== 'custom' && id !== 'unknown' && !found.has(id) && !METHODOLOGIES[id]) return;
        options.push(id);
    });
    return options;
}

function protocolLabelForFilter(id) {
    if (id === 'all') return 'All';
    if (METHODOLOGIES[id]) return METHODOLOGIES[id].name;
    if (id === 'custom') return 'Custom';
    return 'Unknown';
}

function renderStatsProtocolToggles(logs) {
    if (!ui.statsProtocolToggles) return;
    const options = protocolOptionsFromLogs(logs);
    if (!options.includes(statsState.protocol)) statsState.protocol = 'all';
    ui.statsProtocolToggles.innerHTML = '';
    options.forEach((id) => {
        buildChip(ui.statsProtocolToggles, id, protocolLabelForFilter(id), statsState.protocol, (value) => {
            statsState.protocol = value;
            renderStatsPage();
            persistPreferences();
        });
    });
}

function getStatsFilteredLogs() {
    return cachedLogs
        .filter((entry) => sanitizeUser(entry.user) === statsState.user)
        .filter((entry) => inRange(entry.date, statsState.range))
        .filter((entry) => statsState.equipment === 'all' || sanitizeInstrument(entry.instrument) === statsState.equipment)
        .filter((entry) => statsState.protocol === 'all' || sanitizeProtocol(entry.protocolId) === statsState.protocol)
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getMetricValue(entry, metric) {
    if (metric === 'calories') return Number(entry.calories) || 0;
    if (metric === 'avgHr') return Number(entry.avgHr) || 0;
    if (metric === 'durationSec') return (Number(entry.durationSec) || 0) / 60;
    if (metric === 'distance') return getDistanceKm(entry);
    return 0;
}

function getMetricLabel(metric) {
    if (metric === 'calories') return 'Calories';
    if (metric === 'avgHr') return 'Avg Heart Rate';
    if (metric === 'durationSec') return 'Duration (min)';
    if (metric === 'distance') return 'Distance (km)';
    return 'Metric';
}

function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(200, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
}

function drawNoData(canvas, text) {
    const { ctx, width, height } = setupCanvas(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(230,239,255,0.65)';
    ctx.font = '13px Manrope';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, height / 2);
}

function drawLineChart(canvas, entries, metric) {
    if (!entries.length) {
        drawNoData(canvas, 'No data for filters');
        return;
    }

    const points = entries.map((entry) => ({
        x: new Date(entry.date).getTime(),
        y: getMetricValue(entry, metric)
    })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (!points.length) {
        drawNoData(canvas, 'No numeric values');
        return;
    }

    const { ctx, width, height } = setupCanvas(canvas);
    const left = 44;
    const right = 14;
    const top = 14;
    const bottom = 30;

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minYRaw = Math.min(...points.map((p) => p.y));
    const maxYRaw = Math.max(...points.map((p) => p.y));
    const minY = Math.min(0, minYRaw);
    const maxY = maxYRaw === minY ? minY + 1 : maxYRaw;

    const xScale = (value) => {
        if (maxX === minX) return left + ((width - left - right) / 2);
        return left + ((value - minX) / (maxX - minX)) * (width - left - right);
    };
    const yScale = (value) => top + ((maxY - value) / (maxY - minY)) * (height - top - bottom);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(195,214,246,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - right, height - bottom);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(117,219,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, index) => {
        const x = xScale(point.x);
        const y = yScale(point.y);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#7ad9ff';
    points.forEach((point) => {
        const x = xScale(point.x);
        const y = yScale(point.y);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = 'rgba(230,239,255,0.7)';
    ctx.font = '11px Manrope';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxY.toFixed(1)}`, 6, yScale(maxY) + 4);
    ctx.fillText(`${minY.toFixed(1)}`, 6, yScale(minY) + 4);
}

function drawBarChart(canvas, entries) {
    const counts = { running: 0, rowing: 0, riding: 0, spin: 0 };
    entries.forEach((entry) => {
        const instrument = sanitizeInstrument(entry.instrument);
        if (counts[instrument] !== undefined) counts[instrument] += 1;
    });

    const labels = Object.keys(counts);
    const values = labels.map((label) => counts[label]);
    const total = values.reduce((sum, v) => sum + v, 0);
    if (!total) {
        drawNoData(canvas, 'No sessions for filters');
        return;
    }

    const { ctx, width, height } = setupCanvas(canvas);
    const left = 40;
    const right = 12;
    const top = 18;
    const bottom = 30;
    const maxY = Math.max(...values, 1);
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const slot = chartWidth / labels.length;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(195,214,246,0.25)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - right, height - bottom);
    ctx.stroke();

    labels.forEach((label, index) => {
        const val = values[index];
        const barHeight = (val / maxY) * chartHeight;
        const x = left + index * slot + slot * 0.18;
        const y = height - bottom - barHeight;
        const w = slot * 0.64;
        ctx.fillStyle = 'rgba(117,219,255,0.85)';
        ctx.fillRect(x, y, w, barHeight);
        ctx.fillStyle = 'rgba(230,239,255,0.75)';
        ctx.textAlign = 'center';
        ctx.font = '11px Manrope';
        ctx.fillText(String(val), x + (w / 2), y - 6);
        ctx.fillText(capitalize(label), x + (w / 2), height - 8);
    });
}

function renderStatsSummary(entries) {
    if (!ui.statsSummaryList) return;
    ui.statsSummaryList.innerHTML = '';
    if (!entries.length) {
        const li = document.createElement('li');
        li.innerText = 'No sessions for current filters.';
        ui.statsSummaryList.appendChild(li);
        return;
    }
    const total = entries.length;
    const totalCalories = entries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
    const avgHrEntries = entries.filter((e) => Number(e.avgHr) > 0);
    const avgHr = avgHrEntries.length ? Math.round(avgHrEntries.reduce((sum, e) => sum + Number(e.avgHr), 0) / avgHrEntries.length) : 0;
    const totalDistance = entries.reduce((sum, e) => sum + getDistanceKm(e), 0);
    const totalMinutes = entries.reduce((sum, e) => sum + ((Number(e.durationSec) || 0) / 60), 0);

    [
        `Sessions: ${total}`,
        `Total minutes: ${Math.round(totalMinutes)}`,
        `Total calories: ${Math.round(totalCalories)}`,
        `Average HR: ${avgHr || '--'} bpm`,
        `Total distance: ${totalDistance.toFixed(1)} km`
    ].forEach((row) => {
        const li = document.createElement('li');
        li.innerText = row;
        ui.statsSummaryList.appendChild(li);
    });
}

function renderStatsSessions(entries) {
    if (!ui.statsSessionsList) return;
    ui.statsSessionsList.innerHTML = '';
    if (!entries.length) {
        const li = document.createElement('li');
        li.innerText = 'No matching sessions.';
        ui.statsSessionsList.appendChild(li);
        return;
    }
    entries.slice().reverse().slice(0, 40).forEach((entry) => {
        const li = document.createElement('li');
        const date = new Date(entry.date).toLocaleDateString();
        const protocolText = getProtocolLabel(entry.protocolId, entry.protocolLabel);
        li.innerText = `${date} - ${capitalize(sanitizeInstrument(entry.instrument))} - ${entry.calories || 0} cal - ${entry.avgHr || '--'} bpm - ${protocolText}`;
        ui.statsSessionsList.appendChild(li);
    });
}

function renderStatsPage() {
    if (!ui.statsPage) return;
    if (ui.statsUserSelect) ui.statsUserSelect.value = statsState.user;
    if (ui.statsMetricSelect) ui.statsMetricSelect.value = statsState.metric;
    if (ui.statsRangeSelect) ui.statsRangeSelect.value = String(statsState.range);

    renderStatsEquipmentToggles();
    renderStatsProtocolToggles(cachedLogs);

    const filtered = getStatsFilteredLogs();
    if (ui.statsLineTitle) ui.statsLineTitle.innerText = `${getMetricLabel(statsState.metric)} Trend`;
    if (ui.statsLineCanvas) drawLineChart(ui.statsLineCanvas, filtered, statsState.metric);
    if (ui.statsMixCanvas) drawBarChart(ui.statsMixCanvas, filtered);
    renderStatsSummary(filtered);
    renderStatsSessions(filtered);
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

function showLogModal(mode = 'session') {
    logMode = mode === 'manual' ? 'manual' : 'session';
    logUi.modal.classList.remove('hidden');
    logUi.instrument.value = 'running';
    logUi.calories.value = '';
    logUi.avgHr.value = '';
    const defaultDate = toDatetimeLocalValue(new Date());
    if (logUi.dateInput) {
        logUi.dateInput.value = defaultDate;
    }
    if (logUi.durationMin) {
        const sessionMinutes = Math.max(1, Math.round((elapsed || totalTime) / 60));
        logUi.durationMin.value = logMode === 'manual' ? sessionMinutes : sessionMinutes;
    }
    if (logUi.modeContext) {
        logUi.modeContext.innerText = logMode === 'manual' ? "Mode: Custom Log" : "Mode: Session Summary";
    }
    syncUserUi();
    if (logUi.protocolContext) {
        logUi.protocolContext.innerText = `Protocol: ${sessionProtocolLabel}`;
    }
    renderLogMetrics(logUi.instrument.value);
    renderLogs(cachedLogs);
}

function openCustomLog() {
    if (isRunning) {
        showToast('Finish current workout first', 'bad');
        return;
    }
    sessionProtocolId = currentMethodologyId;
    sessionProtocolLabel = getProtocolLabel(currentMethodologyId);
    showLogModal('manual');
}

function closeLogModal() {
    logUi.modal.classList.add('hidden');
}

async function saveWorkoutLog() {
    const dateIso = parseDatetimeLocalToIso(logUi.dateInput ? logUi.dateInput.value : '');
    if (!dateIso) {
        showToast('Date is required', 'bad');
        return;
    }

    const instrument = sanitizeInstrument(logUi.instrument.value || 'running');
    const durationInputValue = Number(logUi.durationMin ? logUi.durationMin.value : 0);
    const durationSec = Number.isFinite(durationInputValue) && durationInputValue > 0
        ? Math.round(durationInputValue * 60)
        : Math.max(0, elapsed);

    const entry = {
        date: dateIso,
        durationSec,
        user: sanitizeUser(selectedUser),
        instrument,
        calories: parseInt(logUi.calories.value || '0', 10),
        avgHr: parseInt(logUi.avgHr.value || '0', 10),
        protocolId: sanitizeProtocol(sessionProtocolId),
        protocolLabel: sessionProtocolLabel,
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
        showToast('Save failed', 'bad');
        return;
    }

    if (logMode === 'session') {
        sessionLogged = true;
    }
    await refreshLogs();
    await refreshStorageMode();
    showToast('Session saved');
    persistPreferences();
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
    document.getElementById('set-block-rest').value = settings.blockRest;
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
        blockRest: Math.max(0, parseInt(document.getElementById('set-block-rest').value, 10) || 0),
        easy: Math.max(1, parseInt(document.getElementById('set-easy').value, 10) || 30),
        steady: Math.max(1, parseInt(document.getElementById('set-steady').value, 10) || 20),
        sprint: Math.max(1, parseInt(document.getElementById('set-sprint').value, 10) || 10),
        rounds: Math.max(1, parseInt(document.getElementById('set-rounds').value, 10) || 5),
        blocks: Math.max(1, parseInt(document.getElementById('set-blocks').value, 10) || 2)
    };
}

function computeTotalTime(settings) {
    const block = (settings.easy + settings.steady + settings.sprint) * settings.rounds;
    const rests = settings.blockRest * Math.max(0, settings.blocks - 1);
    return settings.warmup + settings.cooldown + (block * settings.blocks) + rests;
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
    persistPreferences();

    resetWorkout(true);
    toggleSettings(false);
}

ui.voiceToggle.addEventListener('change', (e) => {
    voiceMuted = e.target.checked;
    if (voiceMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    syncVoiceUi();
    persistPreferences();
});

logUi.instrument.addEventListener('change', (e) => {
    renderLogMetrics(sanitizeInstrument(e.target.value));
});

ui.introUserSelect.addEventListener('change', (e) => {
    selectedUser = sanitizeUser(e.target.value);
    statsState.user = selectedUser;
    syncUserUi();
    persistPreferences();
});

if (ui.statsUserSelect) {
    ui.statsUserSelect.addEventListener('change', (e) => {
        statsState.user = sanitizeUser(e.target.value);
        renderStatsPage();
        persistPreferences();
    });
}

if (ui.statsMetricSelect) {
    ui.statsMetricSelect.addEventListener('change', (e) => {
        statsState.metric = e.target.value;
        renderStatsPage();
        persistPreferences();
    });
}

if (ui.statsRangeSelect) {
    ui.statsRangeSelect.addEventListener('change', (e) => {
        const raw = e.target.value;
        statsState.range = raw === 'all' ? 'all' : Math.max(1, parseInt(raw, 10) || 30);
        renderStatsPage();
        persistPreferences();
    });
}

const watchMethodologyLink = document.querySelector('.watch-methodology-link');
if (watchMethodologyLink) {
    watchMethodologyLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            toggleSettings(true);
        }
    });
}

['set-warmup', 'set-cooldown', 'set-block-rest', 'set-easy', 'set-steady', 'set-sprint', 'set-rounds', 'set-blocks'].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
        const pending = readSettingsInputs();
        pendingMethodologyId = detectMethodology(pending);
        renderMethodologySelection();
        updateWatchDurationPreview();
    });
});

if (ui.homeRangeTabs) {
    ui.homeRangeTabs.querySelectorAll('.range-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const value = tab.dataset.range === 'all' ? 'all' : parseInt(tab.dataset.range || '7', 10);
            homeRange = value === 'all' ? 'all' : Math.max(1, value || 7);
            renderRangeTabs();
            renderHomeStats(cachedLogs);
            persistPreferences();
        });
    });
}

document.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!logUi.modal.classList.contains('hidden')) {
        const card = logUi.modal.querySelector('.card');
        if (card && !card.contains(target)) {
            closeLogModal();
        }
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!logUi.modal.classList.contains('hidden')) {
        closeLogModal();
        return;
    }
    if (!ui.settingsPanel.classList.contains('hidden')) {
        toggleSettings(false);
        return;
    }
    if (ui.statsPage && !ui.statsPage.classList.contains('hidden')) {
        closeStatsPage();
    }
});

window.addEventListener('resize', () => {
    if (ui.statsPage && !ui.statsPage.classList.contains('hidden')) {
        renderStatsPage();
    }
});

window.addEventListener('hashchange', () => {
    syncVariantsFromLocation({ announce: true });
});

window.addEventListener('popstate', () => {
    syncVariantsFromLocation({ announce: true });
});

loadPreferences();
applyVisualVariants();
syncVariantsFromLocation({ announce: false });
statsState.user = sanitizeUser(statsState.user || selectedUser);
timeline = buildTimeline(workoutSettings);
totalTime = timeline.reduce((sum, step) => sum + step.time, 0);
currentIndex = 0;
timeLeft = timeline[0].time;
elapsed = 0;

ui.watchTime.innerText = formatClock(totalTime);
ui.timer.innerText = formatClock(totalTime);
applyTheme(timeline[0]);
renderMethodologyButtons();
refreshSettingsInputs();
syncVoiceUi();
syncUserUi();
renderRangeTabs();
setStorageBadge(storageBackend);
updateTopActionButtons();
renderLogMetrics(logUi.instrument.value || 'running');
updateLogButtonVisibility();
refreshLogs();
refreshStorageMode();
setInterval(refreshLogs, 30000);
setInterval(refreshStorageMode, 45000);
