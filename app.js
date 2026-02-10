        const API_BASE = "";

        // --- AUDIO ENGINE (The "Sexier" Part) ---
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();

        // High-quality synthesizer chime
        function playChime(type) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const t = audioCtx.currentTime;

            // "Sleek" sound profile
            if (type === 'high') {
                // Major Chord (C6) for Phase Change
                createTone(880, t); // A5
                createTone(1108, t); // C#6
                createTone(1318, t); // E6
            }
        }

        function createTone(freq, t, duration = 1.2) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine'; // Sine waves are smoother/sexier than square waves
            osc.frequency.setValueAtTime(freq, t);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(t);
            // Smooth decay (envelope)
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
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
            osc.frequency.exponentialRampToValueAtTime(780, t + 0.06);
            filter.type = 'bandpass';
            filter.frequency.value = 1400;
            filter.Q.value = 1.2;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

            osc.start(t);
            osc.stop(t + 0.1);
        }

        // Voice Announcer
        function speak(text) {
            if (!window.speechSynthesis) return;
            if (voiceMuted) return;
            // Cancel previous speech to avoid overlapping
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1; // Slightly faster
            utterance.pitch = 1.0; 
            
            // Try to find a nice voice (Apple often has 'Samantha' or similar high quality voices)
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English'));
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }


        // --- WORKOUT LOGIC ---
        
        // Colors
        const C_WARMUP = "#2d3436"; // Dark Slate
        const C_EASY = "#00b894";   // Mint Green
        const C_MOD = "#fdcb6e";    // Bright Mustard
        const C_MAX = "#d63031";    // Intense Red

        let workoutSettings = {
            warmup: 180,
            cooldown: 120,
            easy: 30,
            steady: 20,
            sprint: 10,
            rounds: 5,
            blocks: 2
        };

        function formatClock(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        const createBlock = (settings) => {
            let steps = [];
            for (let i = 0; i < settings.rounds; i++) {
                steps.push({ time: settings.easy, phase: "EASY", color: C_EASY, overlay: 0, speech: "Recover. Easy spin.", instr: "Breathe & Spin" });
                steps.push({ time: settings.steady, phase: "STEADY", color: C_MOD, overlay: 0, speech: "Pick it up.", instr: "Moderate Pace (60%)" });
                steps.push({ time: settings.sprint, phase: "SPRINT", color: C_MAX, overlay: 0, speech: "Max effort!", instr: "EXPLODE (100%)" });
            }
            return steps;
        };

        function buildTimeline(settings) {
            let tl = [{ time: settings.warmup, phase: "WARM UP", color: C_WARMUP, overlay: 0, speech: "Warm up.", instr: "Just Ride" }];
            for (let i = 0; i < settings.blocks; i++) tl = tl.concat(createBlock(settings));
            tl.push({ time: settings.cooldown, phase: "COOL DOWN", color: "#1f6fb2", overlay: 0, speech: "Cool down. Slow and smooth.", instr: "Relax. Deep Breathing." });
            return tl;
        }

        let timeline = buildTimeline(workoutSettings);

        let currentIndex = 0;
        let timeLeft = timeline[0].time;
        let timerInterval = null;
        let isRunning = false;
        let isPaused = false;
        let voiceMuted = false;
        let totalTime = timeline.reduce((sum, step) => sum + step.time, 0);
        let elapsed = 0;

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
            restartBtn: document.getElementById('btn-restart'),
            progress: document.getElementById('progress-bar'),
            voiceToggle: document.getElementById('voice-toggle'),
            introVoiceBtn: document.getElementById('intro-voice-link'),
            settingsWrap: document.getElementById('settings-wrap'),
            settingsPanel: document.getElementById('settings-panel'),
            watchTime: document.getElementById('watch-time')
        };
        const logUi = {
            modal: document.getElementById('workout-log'),
            calories: document.getElementById('log-calories'),
            avgHr: document.getElementById('log-avg-hr'),
            list: document.getElementById('recent-logs-list')
        };

        function hexToRgb(hex) {
            const c = hex.replace('#', '');
            return {
                r: parseInt(c.substring(0, 2), 16),
                g: parseInt(c.substring(2, 4), 16),
                b: parseInt(c.substring(4, 6), 16)
            };
        }

        function mixHexColor(c1, c2, t) {
            const a = hexToRgb(c1);
            const b = hexToRgb(c2);
            const m = (x, y) => Math.round(x + (y - x) * t);
            return `rgb(${m(a.r, b.r)}, ${m(a.g, b.g)}, ${m(a.b, b.b)})`;
        }

        function updateUI() {
            const currentStep = timeline[currentIndex];
            
            // Color Handling
            ui.body.classList.toggle('cooldown', currentStep.phase === "COOL DOWN");
            if (currentStep.phase === "EASY" && timeLeft <= 3 && timeLeft > 0) {
                // Fade easy into neutral gray in last 3 seconds.
                const ratio = (3 - timeLeft + 1) / 3;
                ui.body.style.backgroundColor = mixHexColor(currentStep.color, "#808080", ratio);
            } else if (currentStep.phase !== "COOL DOWN") {
                ui.body.style.backgroundColor = currentStep.color;
            }
            ui.overlay.style.opacity = currentStep.overlay; // Triggers the warm gradient fade
            ui.cooldownOverlay.style.opacity = currentStep.phase === "COOL DOWN" ? 1 : 0;
            
            ui.phase.innerText = currentStep.phase;
            ui.instr.innerText = currentStep.instr;
            
            ui.timer.innerText = formatClock(timeLeft);

            // Progress Bar
            let pct = (elapsed / totalTime) * 100;
            ui.progress.style.width = `${pct}%`;
        }

        function startWorkout() {
            if (isRunning) return;
            if (audioCtx.state === 'suspended') audioCtx.resume();
            if (currentIndex !== 0 || elapsed !== 0 || timeLeft !== timeline[0].time) {
                resetWorkout(false);
            }

            isRunning = true;
            isPaused = false;
            ui.startBtn.classList.add('hidden');
            ui.settingsWrap.classList.add('hidden');
            ui.settingsPanel.classList.add('hidden');
            ui.pauseBtn.classList.remove('hidden');
            ui.restartBtn.classList.remove('hidden');
            ui.pauseBtn.innerText = "PAUSE";
            ui.intro.classList.add('hidden');
            
            // Initial Announce
            speak(timeline[0].speech);
            updateUI();

            timerInterval = setInterval(() => {
                elapsed++;
                timeLeft--;

                // Countdown logic (Last 3 seconds)
                if (timeLeft > 0 && timeLeft <= 3) {
                    playCountdownClick(); 
                }

                if (timeLeft < 0) {
                    // Phase Switch
                    currentIndex++;
                    if (currentIndex >= timeline.length) {
                        endWorkout();
                        return;
                    }
                    
                    const nextStep = timeline[currentIndex];
                    timeLeft = nextStep.time;
                    
                    // Audio Cues
                    playChime('high');
                    speak(nextStep.speech);
                    
                    updateUI();
                } else {
                    updateUI();
                }
            }, 1000);
        }

        function endWorkout() {
            clearInterval(timerInterval);
            isRunning = false;
            isPaused = false;
            speak("Workout Complete.");
            ui.phase.innerText = "DONE";
            ui.timer.innerText = "0:00";
            ui.pauseBtn.classList.add('hidden');
            ui.restartBtn.classList.remove('hidden');
            ui.startBtn.classList.remove('hidden');
            ui.startBtn.innerText = "START AGAIN";
            ui.settingsWrap.classList.remove('hidden');
            showLogModal();
        }

        function togglePause() {
            if (!isRunning) return;
            isPaused = !isPaused;
            if (isPaused) {
                clearInterval(timerInterval);
                ui.pauseBtn.innerText = "RESUME";
                speak("Paused.");
            } else {
                ui.pauseBtn.innerText = "PAUSE";
                speak("Resumed.");
                timerInterval = setInterval(() => {
                    elapsed++;
                    timeLeft--;

                    if (timeLeft > 0 && timeLeft <= 3) {
                        playCountdownClick();
                    }

                    if (timeLeft < 0) {
                        currentIndex++;
                        if (currentIndex >= timeline.length) {
                            endWorkout();
                            return;
                        }

                        const nextStep = timeline[currentIndex];
                        timeLeft = nextStep.time;
                        playChime('high');
                        speak(nextStep.speech);
                        updateUI();
                    } else {
                        updateUI();
                    }
                }, 1000);
            }
        }

        function resetWorkout(fullReset = false) {
            clearInterval(timerInterval);
            isRunning = false;
            isPaused = false;
            currentIndex = 0;
            timeLeft = timeline[0].time;
            elapsed = 0;
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            ui.startBtn.classList.remove('hidden');
            ui.startBtn.innerText = "START SESSION";
            ui.pauseBtn.classList.add('hidden');
            ui.restartBtn.classList.add('hidden');
            ui.settingsWrap.classList.remove('hidden');
            ui.body.style.backgroundColor = "#1a1a1a";
            ui.body.classList.remove('cooldown');
            ui.overlay.style.opacity = 0;
            ui.cooldownOverlay.style.opacity = 0;
            ui.phase.innerText = "READY";
            ui.timer.innerText = formatClock(totalTime);
            ui.instr.innerText = "Turn up volume & Tap Start";
            ui.progress.style.width = "0%";
            closeLogModal();
            if (fullReset) ui.intro.classList.remove('hidden');
        }

        function restartWorkout() {
            resetWorkout(true);
        }

        function toggleSettings(forceOpen) {
            const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : ui.settingsPanel.classList.contains('hidden');
            ui.settingsPanel.classList.toggle('hidden', !shouldOpen);
        }

        function syncVoiceUi() {
            ui.voiceToggle.checked = voiceMuted;
            if (ui.introVoiceBtn) {
                ui.introVoiceBtn.innerText = voiceMuted ? "VOICE: OFF" : "VOICE: ON";
            }
        }

        function toggleVoiceMute() {
            voiceMuted = !voiceMuted;
            if (voiceMuted && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            syncVoiceUi();
        }

        function showLogModal() {
            logUi.modal.classList.remove('hidden');
            logUi.calories.value = "";
            logUi.avgHr.value = "";
            fetchLogs().then(renderLogs);
        }

        function closeLogModal() {
            logUi.modal.classList.add('hidden');
        }

        async function fetchLogs() {
            try {
                const res = await fetch(`${API_BASE}/api/logs`);
                if (!res.ok) throw new Error("Failed to fetch logs");
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        }

        function renderLogs(logs) {
            if (!logUi.list) return;
            logUi.list.innerHTML = "";
            if (!logs.length) {
                const li = document.createElement("li");
                li.innerText = "No sessions yet.";
                logUi.list.appendChild(li);
                return;
            }
            logs.slice(0, 10).forEach((entry) => {
                const li = document.createElement("li");
                const date = new Date(entry.date).toLocaleDateString();
                li.innerText = `${date} - ${entry.calories || 0} cal - ${entry.avgHr || 0} avg HR`;
                logUi.list.appendChild(li);
            });
        }

        async function saveWorkoutLog() {
            const entry = {
                date: new Date().toISOString(),
                durationSec: elapsed,
                calories: parseInt(logUi.calories.value || "0", 10),
                avgHr: parseInt(logUi.avgHr.value || "0", 10)
            };
            try {
                const res = await fetch(`${API_BASE}/api/logs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(entry)
                });
                if (!res.ok) throw new Error("Failed to save log");
            } catch (err) {
                console.error(err);
                alert("Could not save log. Make sure server is running.");
                return;
            }
            renderLogs(await fetchLogs());
            closeLogModal();
        }

        function refreshSettingsInputs() {
            document.getElementById('set-warmup').value = workoutSettings.warmup;
            document.getElementById('set-cooldown').value = workoutSettings.cooldown;
            document.getElementById('set-easy').value = workoutSettings.easy;
            document.getElementById('set-steady').value = workoutSettings.steady;
            document.getElementById('set-sprint').value = workoutSettings.sprint;
            document.getElementById('set-rounds').value = workoutSettings.rounds;
            document.getElementById('set-blocks').value = workoutSettings.blocks;
        }

        function applySettings() {
            const next = {
                warmup: Math.max(0, parseInt(document.getElementById('set-warmup').value, 10) || 0),
                cooldown: Math.max(0, parseInt(document.getElementById('set-cooldown').value, 10) || 0),
                easy: Math.max(1, parseInt(document.getElementById('set-easy').value, 10) || 30),
                steady: Math.max(1, parseInt(document.getElementById('set-steady').value, 10) || 20),
                sprint: Math.max(1, parseInt(document.getElementById('set-sprint').value, 10) || 10),
                rounds: Math.max(1, parseInt(document.getElementById('set-rounds').value, 10) || 5),
                blocks: Math.max(1, parseInt(document.getElementById('set-blocks').value, 10) || 2)
            };
            workoutSettings = next;
            timeline = buildTimeline(workoutSettings);
            totalTime = timeline.reduce((sum, step) => sum + step.time, 0);
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

        document.querySelector('.watch-face').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startWorkout();
            }
        });

        ui.watchTime.innerText = formatClock(totalTime);
        ui.timer.innerText = formatClock(totalTime);
        refreshSettingsInputs();
        syncVoiceUi();
        fetchLogs().then(renderLogs);
