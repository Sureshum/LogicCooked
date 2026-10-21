        let soundEnabled = true;
        let sfxEnabled = true;
        let audioCtx = null;

        // ---- Música de fondo (YouTube IFrame API, volumen 5%) ----
        const bgMusic = { player: null, ready: false, started: false, videoId: 'odfBLx170k8', volume: 5, adminMuted: false };

        function startBackgroundMusic() {
            bgMusic.started = true;
            resumeBackgroundMusic();
        }

        function resumeBackgroundMusic() {
            if (!bgMusic.player || !bgMusic.ready) return;
            if (!bgMusic.started || !soundEnabled || bgMusic.adminMuted) return;
            try { bgMusic.player.playVideo(); } catch (e) { }
        }

        function playSFX(type) {
            if (!soundEnabled || !sfxEnabled) return;
            try {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const now = audioCtx.currentTime;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);

                if (type === 'pickup') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(520, now);
                    osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.start(now); osc.stop(now + 0.1);
                } else if (type === 'laser') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(920, now);
                    osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);
                    gain.gain.setValueAtTime(0.14, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    osc.start(now); osc.stop(now + 0.15);
                } else if (type === 'success') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(523.25, now);
                    osc.frequency.setValueAtTime(659.25, now + 0.08);
                    osc.frequency.setValueAtTime(1046.5, now + 0.16);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
                    osc.start(now); osc.stop(now + 0.36);
                } else if (type === 'error') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(165, now);
                    osc.frequency.exponentialRampToValueAtTime(115, now + 0.12);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                    osc.start(now); osc.stop(now + 0.28);
                } else if (type === 'shot') {
                    // Banguido del revólver (Duelo)
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.exponentialRampToValueAtTime(48, now + 0.26);
                    gain.gain.setValueAtTime(0.28, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                    osc.start(now); osc.stop(now + 0.34);
                    const noise = audioCtx.createBufferSource();
                    const nbuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.28, audioCtx.sampleRate);
                    const ch = nbuf.getChannelData(0);
                    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
                    noise.buffer = nbuf;
                    const ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.22, now);
                    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                    noise.connect(ng); ng.connect(audioCtx.destination);
                    noise.start(now); noise.stop(now + 0.3);
                } else if (type === 'click') {
                    // Clic seco del cilindro: recámara vacía
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(1400, now);
                    osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                    osc.start(now); osc.stop(now + 0.07);
                }
            } catch (e) { }
        }

        function toggleAudio() {
            soundEnabled = !soundEnabled;
            document.getElementById('icon-audio').className = soundEnabled
                ? 'fa-solid fa-volume-high text-xs'
                : 'fa-solid fa-volume-xmark text-xs text-slate-500';
            if (bgMusic.player) {
                try {
                    if (soundEnabled) resumeBackgroundMusic();
                    else bgMusic.player.pauseVideo();
                } catch (e) { }
            }
        }

        function setSFXEnabled(enabled) {
            sfxEnabled = !!enabled;
        }

        const modeScores = { overcooked: 0, aim: 0, connect: 0, millonario: 0, duelo: 0 };
        let globalStreak = 0;
        let statHits = 0;
        let statMisses = 0;
        let roundTimer = 45;
        let kitchenRoundTime = 120;
        let kitchenGameOver = false;
        let aimGameOver = false;
        let connectGameOver = false;
        let awaitingStart = true;
        const LEADERBOARD_LIMIT = 10;
        // Nombres y dificultades para generar 3 puntajes de ejemplo aleatorios
        const LEADERBOARD_SEED_NAMES = [
            'Boole3D', 'AdaChef', 'DeMorgan', 'SniperLog', 'Axioma', 'Ray3D',
            'CableKing', 'Equivalente', 'NodoPro', 'VennMaster', 'Tautología',
            'ModusPonens', 'Karnaught', 'Conjunta', 'BitWise', 'Álgebra',
            'TuringChef', 'LógicaViva', 'Cuantor', 'Subconjunto'
        ];
        const LEADERBOARD_SEED_DIFFICULTIES = ['easy', 'normal', 'hard'];

        // Genera 3 puntajes aleatorios (siempre por debajo de shum, para no quitarle el 1° puesto).
        function randomDefaultLeaderboard(mode) {
            const names = LEADERBOARD_SEED_NAMES.slice();
            const picks = [];
            for (let i = 0; i < 3; i++) {
                const name = names.splice(Math.floor(Math.random() * names.length), 1)[0];
                const entry = { name, score: 200 + Math.floor(Math.random() * 750) };
                if (mode === 'overcooked') {
                    entry.difficulty = LEADERBOARD_SEED_DIFFICULTIES[Math.floor(Math.random() * LEADERBOARD_SEED_DIFFICULTIES.length)];
                }
                picks.push(entry);
            }
            return picks.sort((a, b) => b.score - a.score);
        }
        const MODE_LABELS = { overcooked: 'Cocina 3D', aim: 'Rayo Lógico', connect: 'Cables Lógicos', millonario: 'Millonario Lógico', duelo: 'Duelo Revólver' };
        const KITCHEN_TIMES = [60, 120, 180];
        const DIFFICULTY_LABELS = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
        const DIFFICULTY_CLASSES = {
            easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
            normal: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
            hard: 'bg-rose-500/15 text-rose-300 border-rose-500/40'
        };
        const KITCHEN_WALK = {
            easy: { halfX: 7.2, halfZ: 4.4 },
            normal: { halfX: 9.2, halfZ: 6.6 },
            hard: { halfX: 11.0, halfZ: 8.2 }
        };
        let leaderboardTimeView = 120;
        const SHUM_TOP_NAME = 'shum';
        const SHUM_TOP_SCORE = 1067;
        const PLAYER_NAME_KEY = 'LogicCooked3D_PlayerName';

        function getPlayerName() {
            const saved = localStorage.getItem(PLAYER_NAME_KEY);
            return (saved && saved.trim()) || 'Chef3D';
        }

        function refreshPlayerNameDisplay() {
            const el = document.getElementById('playerNameDisplay');
            if (el) el.textContent = getPlayerName();
        }

        function streakMultiplier(streak) {
            if (streak >= 10) return 4;
            if (streak >= 6) return 3;
            if (streak >= 3) return 2;
            return 1;
        }

        // Call of Duty-style floating popup in the center of the screen
        function showHitPopup(mainText, isSuccess, subText, duration = 950) {
            const layer = document.getElementById('hit-feedback');
            if (!layer) return;
            const wrap = document.createElement('div');
            wrap.className = 'absolute flex flex-col items-center ' + (isSuccess ? 'text-[#15803d]' : 'text-rose-500');
            wrap.style.left = '50%';
            wrap.style.top = '46%';
            wrap.style.transform = 'translate(-50%, -50%)';
            wrap.style.textShadow = isSuccess ? '0 0 14px rgba(21,128,61,0.85), 0 2px 0 rgba(0,0,0,0.35)' : '0 0 18px rgba(244,63,94,0.9)';
            const main = document.createElement('div');
            main.className = 'mono-font font-extrabold leading-none';
            main.style.fontSize = isSuccess ? '3.5rem' : '2.75rem';
            main.textContent = mainText;
            wrap.appendChild(main);
            if (subText) {
                const sub = document.createElement('div');
                sub.className = 'mono-font font-extrabold text-lg mt-0.5 tracking-widest';
                sub.textContent = subText;
                wrap.appendChild(sub);
            }
            layer.appendChild(wrap);
            const anim = wrap.animate([
                { transform: 'translate(-50%, -30%) scale(0.5)', opacity: 0 },
                { transform: 'translate(-50%, -50%) scale(1.18)', opacity: 1, offset: 0.22 },
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.6 },
                { transform: 'translate(-50%, -95%) scale(0.95)', opacity: 0 }
            ], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
            anim.onfinish = () => wrap.remove();
        }

        function recordOutcome(basePoints, isSuccess, formalExplanation) {
            const consoleEl = document.getElementById('validation-console');
            if (isSuccess) {
                playSFX('success');
                globalStreak += 1;
                const mult = streakMultiplier(globalStreak);
                const pts = basePoints * mult;
                modeScores[currentMode] = (modeScores[currentMode] || 0) + pts;
                statHits++;
                showHitPopup(`+${pts}`, true, mult > 1 ? `x${mult} COMBO` : '');
                consoleEl.className = 'bg-emerald-950/85 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-[11px] mono-font text-emerald-300 truncate flex-1';
                consoleEl.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> [VÁLIDO x${mult} +${pts}] ${formalExplanation}`;
            } else {
                playSFX('error');
                modeScores[currentMode] = Math.max(0, (modeScores[currentMode] || 0) - 25);
                globalStreak = 0;
                statMisses++;
                showHitPopup('-25', false, 'FALLO');
                consoleEl.className = 'bg-rose-950/85 border border-rose-500/40 rounded-lg px-2.5 py-1 text-[11px] mono-font text-rose-300 truncate flex-1';
                consoleEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> [ERROR -25] ${formalExplanation}`;
            }

            document.getElementById('hud-score').textContent = modeScores[currentMode] || 0;
            document.getElementById('hud-streak').textContent = `x${streakMultiplier(globalStreak)}`;
            document.getElementById('hud-accuracy-stats').textContent = `✔ ${statHits} | ✖ ${statMisses}`;
            autoUpdateLeaderboard();
        }

        function activeLeaderboardTime() {
            return currentMode === 'overcooked' ? kitchenRoundTime : null;
        }

        function leaderboardKey(mode, time) {
            if (mode === 'overcooked') return `LogicCooked3D_Top_v1_overcooked_${time || kitchenRoundTime}`;
            return 'LogicCooked3D_Top_v1_' + mode;
        }

        function withTopSeed(list, mode) {
            const seed = { name: SHUM_TOP_NAME, score: SHUM_TOP_SCORE };
            if (mode === 'overcooked') seed.difficulty = 'hard';
            const rest = list
                .filter(p => p && p.name && p.name.toLowerCase() !== SHUM_TOP_NAME)
                .sort((a, b) => b.score - a.score);
            return [seed, ...rest].slice(0, LEADERBOARD_LIMIT);
        }

        function getLeaderboard(mode, time) {
            const key = leaderboardKey(mode, time);
            const raw = localStorage.getItem(key);
            if (!raw) {
                const list = withTopSeed(randomDefaultLeaderboard(mode), mode);
                localStorage.setItem(key, JSON.stringify(list));
                return list;
            }
            try { return withTopSeed(JSON.parse(raw) || [], mode); } catch { return withTopSeed([], mode); }
        }

        function difficultyBadge(diff) {
            if (!diff) return '';
            const label = DIFFICULTY_LABELS[diff] || diff;
            const cls = DIFFICULTY_CLASSES[diff] || 'bg-slate-700/40 text-slate-300 border-slate-600/40';
            return `<span class="px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${cls}">${label}</span>`;
        }

        function savePlayerToLeaderboard() {
            playSFX('pickup');
            const playerName = getPlayerName();
            refreshPlayerNameDisplay();
            const mode = currentMode;
            const score = modeScores[mode] || 0;
            const time = activeLeaderboardTime();
            let list = getLeaderboard(mode, time);
            const entry = { name: playerName, score };
            if (mode === 'overcooked') entry.difficulty = kitchenDifficulty;
            const existing = list.findIndex(p => p.name.toLowerCase() === playerName.toLowerCase());
            if (existing >= 0) {
                list[existing] = entry;
            } else {
                list.push(entry);
            }
            list.sort((a, b) => b.score - a.score);
            list = withTopSeed(list, mode);
            localStorage.setItem(leaderboardKey(mode, time), JSON.stringify(list));
            renderLeaderboardUI();
        }

        function autoUpdateLeaderboard() {
            const mode = currentMode;
            const score = modeScores[mode] || 0;
            if (score <= 0) return;
            const playerName = getPlayerName();
            const time = activeLeaderboardTime();
            let list = getLeaderboard(mode, time);
            if (list.length < LEADERBOARD_LIMIT || score > list[list.length - 1].score || list.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
                savePlayerToLeaderboard();
            }
        }

        function renderLeaderboardUI() {
            const isKitchen = currentMode === 'overcooked';
            const miniList = getLeaderboard(currentMode, isKitchen ? kitchenRoundTime : null);
            const list = getLeaderboard(currentMode, isKitchen ? leaderboardTimeView : null);

            const mini = document.getElementById('mini-podium-list');
            const colors = ['text-amber-300', 'text-slate-300', 'text-amber-600'];
            mini.innerHTML = miniList.slice(0, 3).map((p, idx) => `
                <span class="${colors[idx]} font-bold">${idx + 1}° ${p.name}: ${p.score}</span>
            `).join('<span class="text-slate-700">|</span>');

            const tabs = document.getElementById('leaderboard-time-tabs');
            if (tabs) {
                tabs.classList.toggle('hidden', !isKitchen);
                tabs.classList.toggle('flex', isKitchen);
                if (isKitchen) {
                    KITCHEN_TIMES.forEach(t => {
                        const b = document.getElementById('lb-tab-' + t);
                        if (!b) return;
                        b.className = t === leaderboardTimeView
                            ? 'px-3 py-1 rounded-lg text-[11px] font-bold transition bg-cyan-500 text-slate-950'
                            : 'px-3 py-1 rounded-lg text-[11px] font-bold transition text-slate-300 hover:bg-slate-800';
                    });
                }
            }

            const titleEl = document.getElementById('leaderboard-title');
            const subtitleEl = document.getElementById('leaderboard-subtitle');
            if (titleEl) titleEl.textContent = isKitchen
                ? `Clasificación Top 10 • Cocina 3D (${leaderboardTimeView}s)`
                : `Clasificación Top 10 • ${MODE_LABELS[currentMode] || ''}`;
            if (subtitleEl) subtitleEl.textContent = isKitchen
                ? 'Los 10 Mejores Chefs para este tiempo'
                : 'Los 10 Mejores Arquitectos Lógicos en 3D';

            const scoreText = (p) => {
                let s = p.score + ' pts';
                if (isKitchen && p.difficulty) s += ' · ' + (DIFFICULTY_LABELS[p.difficulty] || p.difficulty);
                return s;
            };

            const p1 = list[0] || { name: '---', score: 0 };
            const p2 = list[1] || { name: '---', score: 0 };
            const p3 = list[2] || { name: '---', score: 0 };
            document.getElementById('modal-p1-name').textContent = p1.name;
            document.getElementById('modal-p1-score').textContent = scoreText(p1);
            document.getElementById('modal-p2-name').textContent = p2.name;
            document.getElementById('modal-p2-score').textContent = scoreText(p2);
            document.getElementById('modal-p3-name').textContent = p3.name;
            document.getElementById('modal-p3-score').textContent = scoreText(p3);

            const rows = document.getElementById('modal-leaderboard-rows');
            const filled = list.slice(0, LEADERBOARD_LIMIT);
            while (filled.length < LEADERBOARD_LIMIT) filled.push(null);
            rows.innerHTML = filled.map((p, i) => {
                const name = p ? p.name : '---';
                const score = p ? `${p.score} pts` : '0 pts';
                const dim = p ? '' : ' opacity-50';
                const badge = (p && isKitchen) ? difficultyBadge(p.difficulty) : '';
                return `
                <div class="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs${dim}">
                    <span class="font-bold text-white flex items-center gap-2 min-w-0"><span class="truncate">${i + 1}° Lugar — ${name}</span> ${badge}</span>
                    <span class="mono-font font-extrabold text-amber-400 whitespace-nowrap">${score}</span>
                </div>
            `;
            }).join('');
        }

        function setLeaderboardTimeView(t) {
            leaderboardTimeView = t;
            renderLeaderboardUI();
        }

        function toggleLeaderboardDrawer() {
            const m = document.getElementById('leaderboardModal');
            m.classList.toggle('hidden');
            m.classList.toggle('flex');
            if (currentMode === 'overcooked') leaderboardTimeView = kitchenRoundTime;
            renderLeaderboardUI();
        }

        const container = document.getElementById('webgl-container');
        const labelsContainer = document.getElementById('labels-container');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827);
        scene.fog = new THREE.FogExp2(0x111827, 0.01);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.LinearToneMapping, toneMappingExposure: 0.9 });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xf2ece0, 0.58);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff0d9, 0.85);
        dirLight.position.set(12, 22, 14);
        dirLight.castShadow = true;
        scene.add(dirLight);
        scene.add(dirLight.target);

        function pointSunAt(x) {
            dirLight.position.set(x + 12, 22, 14);
            dirLight.target.position.set(x, 0, 0);
            dirLight.target.updateMatrixWorld();
        }

        const kitchenGroup = new THREE.Group();
        kitchenGroup.position.set(0, 0, 0);
        scene.add(kitchenGroup);

        const aimGroup = new THREE.Group();
        aimGroup.position.set(60, 0, 0);
        scene.add(aimGroup);

        // Duck Hunt backdrop (sky, hills, tree, clouds) lives with the aim arena
        const aimBackdrop = new THREE.Group();
        aimGroup.add(aimBackdrop);
        const aimClouds = [];
        const aimBullets = [];

        // Light-gun attached to the first-person camera (Duck Hunt style)
        const aimGun = new THREE.Group();
        let aimGunMuzzle = null;
        let aimGunFlash = null;
        let aimGunFlashUntil = 0;
        const aimPointerNdc = { x: 0, y: 0 };
        scene.add(camera);
        camera.add(aimGun);

        const connectGroup = new THREE.Group();
        connectGroup.position.set(-60, 0, 0);
        scene.add(connectGroup);

        // Playground / hub where the player walks between game zones
        const hubGroup = new THREE.Group();
        hubGroup.position.set(150, 0, 0);
        scene.add(hubGroup);
        const hubStations = [];       // { type, mode, position, mesh, label }
        const hubDecor = [];          // { cx, cz, r } colliders for decor
        const HUB_WALK = { halfX: 21, halfZ: 19 };
        let hubNearStation = null;
        let hubDecorMeshes = [];
        const hubAnimated = []; // { update(elapsed, dt) } animated hub props

        let currentMode = 'overcooked';
        Object.defineProperty(window, 'currentMode', { get: function () { return currentMode; } });
        const camTargetPos = new THREE.Vector3(0, 14.5, 14.2);
        const camLookAtPos = new THREE.Vector3(0, 0.2, 0.4);
        const currentLookAt = new THREE.Vector3(0, 0.2, 0.4);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const clickableMeshes = [];
        const tracked3DLabels = [];

        function create3DLabel(mesh, htmlContent, yOffset = 1.4, modeTag = 'overcooked') {
            const div = document.createElement('div');
            div.className = 'world-label';
            div.innerHTML = htmlContent;
            labelsContainer.appendChild(div);
            const item = { mesh, div, yOffset, modeTag };
            tracked3DLabels.push(item);
            return item;
        }

        function clearModeLabels(modeTag) {
            for (let i = tracked3DLabels.length - 1; i >= 0; i--) {
                if (tracked3DLabels[i].modeTag === modeTag) {
                    tracked3DLabels[i].div.remove();
                    tracked3DLabels.splice(i, 1);
                }
            }
        }

        function update3DLabels() {
            const widthHalf = window.innerWidth / 2;
            const heightHalf = window.innerHeight / 2;
            const tempVec = new THREE.Vector3();

            tracked3DLabels.forEach(item => {
                if (item.modeTag !== currentMode) {
                    item.div.style.display = 'none';
                    return;
                }
                item.mesh.getWorldPosition(tempVec);
                tempVec.y += item.yOffset;
                tempVec.project(camera);

                if (tempVec.z > 1) {
                    item.div.style.display = 'none';
                } else {
                    item.div.style.display = 'block';
                    const x = (tempVec.x * widthHalf) + widthHalf;
                    const y = -(tempVec.y * heightHalf) + heightHalf;
                    item.div.style.left = `${x}px`;
                    item.div.style.top = `${y}px`;
                }
            });
        }

        let chefMesh = null;
        let chefCarryGroup = null;
        let chefParts = null;
        let chefWalkPhase = 0;
        const chefKeys = { w: false, a: false, s: false, d: false };
        window.chefKeys = chefKeys;
        // Input analogico del joystick movil (x: -1..1 derecha, y: -1..1 abajo)
        window.mobileMove = { x: 0, y: 0 };
        const MOBILE_DEADZONE = 0.3;
        function mobileInputActive() {
            const mv = window.mobileMove;
            return !!(mv && (Math.abs(mv.x) > MOBILE_DEADZONE || Math.abs(mv.y) > MOBILE_DEADZONE));
        }
        function readChefInput() {
            let x = (chefKeys.d ? 1 : 0) - (chefKeys.a ? 1 : 0);
            let z = (chefKeys.s ? 1 : 0) - (chefKeys.w ? 1 : 0);
            const mv = window.mobileMove;
            if (mv) {
                if (Math.abs(mv.x) > MOBILE_DEADZONE) x = mv.x > 0 ? 1 : -1;
                if (Math.abs(mv.y) > MOBILE_DEADZONE) z = mv.y > 0 ? 1 : -1;
            }
            return { x: x, z: z };
        }
        const kitchenCrates = [];
        const interactableStations = [];
        let nearestStation = null;
        let proximityRingMesh = null;
        let proximityPromptLabel = null;
        const INTERACT_RADIUS = 3.25;

        // ---- Chef skins (used in the playground hub) ----
        let chefMaterials = null;
        let chefSkinIndex = 0;
        const CHEF_SKINS = [
            { name: 'Clásico', coat: 0xe5e7eb, apron: 0xf59e0b, hat: 0xd8d5cc, skin: 0xf3c99a, dark: 0x1f2937, shoe: 0x334155 },
            { name: 'Rojo',    coat: 0xef4444, apron: 0xfee2e2, hat: 0xdc2626, skin: 0xf3c99a, dark: 0x1f2937, shoe: 0x7f1d1d },
            { name: 'Verde',   coat: 0x22c55e, apron: 0xecfdf5, hat: 0x15803d, skin: 0xf3c99a, dark: 0x1f2937, shoe: 0x14532d },
            { name: 'Púrpura', coat: 0xa855f7, apron: 0xfaf5ff, hat: 0x7e22ce, skin: 0xf3c99a, dark: 0x1f2937, shoe: 0x581c87 },
            { name: 'Chef Noir', coat: 0x1e293b, apron: 0xfbbf24, hat: 0x0f172a, skin: 0xf3c99a, dark: 0x020617, shoe: 0xf59e0b },
            { name: 'Cian',    coat: 0x06b6d4, apron: 0xecfeff, hat: 0x0891b2, skin: 0xf3c99a, dark: 0x1f2937, shoe: 0x155e75 }
        ];
        const SPECIAL_START = CHEF_SKINS.length;
        const SPECIAL_SKINS = [
            { id: '67',   name: '67',   color: '#0e7490', text: '#ffffff', hint: '❓',    after: '💜 67',   talk: '67: "¡SÍGUEME EL RITMO!"', idle: '67: "SIX SEVEN 🎵"' },
            { id: 'oso',  name: 'Oso',  color: '#8d5524', text: '#ffffff', hint: '🐻',    after: '🐻 Oso',  talk: 'Oso: "¡Miel y fuerza, chef!"', idle: 'Oso: "Grrr..."' },
            { id: 'lobo', name: 'Lobo', color: '#94a3b8', text: '#0f172a', hint: '🐺',    after: '🐺 Lobo', talk: 'Lobo: "¡Aúuu! Únete a la manada."', idle: 'Lobo: "*olfatea*"' },
            { id: 'gato', name: 'Gato', color: '#f59e0b', text: '#0f172a', hint: '🐱',    after: '🐱 Gato', talk: 'Gato: "¡Miau! Llévame contigo."', idle: 'Gato: "*ronronea*"' },
            { id: 'tung', name: 'Tung', color: '#8b5a2b', text: '#ffffff', hint: '🪵',    after: '🪵 Tung', talk: 'Tung Tung Tung Sahur: "¡TUNG TUNG TUNG!" *golpea el bate*', idle: 'Tung: "*tung tung...*"' }
        ];
        const specialUnlocked = SPECIAL_SKINS.map(() => false);
        const chefSpecialFigures = {}; // id -> { group, body, legL, legR }
        let chefActiveSpecial = null;  // id of the currently worn special skin, or null

        // ---- Kitchen difficulty, movement & hazards ----
        let kitchenDifficulty = 'easy';
        let aimDifficulty = 'easy';
        let kitchenTableMesh = null;
        let kitchenPlateMesh = null;
        let kitchenDeliveryMesh = null;
        let kitchenTrashMesh = null;
        const kitchenExtrasGroup = new THREE.Group();
        const kitchenCrateMotion = []; // { crate, station, baseX, baseZ, phase }
        const kitchenBlockers = [];   // { mesh, cx, cz, hw, hd, moving, baseX, baseZ, axis, amp, speed, phase }
        const kitchenSurfaces = [];   // { type:'water'|'ice'|'fire', mesh, x, z, radius }
        let kitchenSliderObstacle = null;
        let kitchenCrowd = null;      // { phase:'idle'|'warning'|'crossing', timer, people:[], dir }
        const CROWD_WARN_TIME = 2.0;
        const CROWD_SPEED_MIN = 7.0;
        const CROWD_SPEED_MAX = 9.5;
        const kitchenArenaWalls = { back: null, left: null, right: null, windows: [], lamps: [] };
        const chefVel = new THREE.Vector3();
        let kitchenOnWater = false;
        let kitchenOnIce = false;
        let confuseTimer = 0;
        let gangnamTimer = 0;
        const confuseDir = new THREE.Vector3();
        let confuseFlip = 0;
        const CHEF_RADIUS = 0.5;
        const KITCHEN_CRATE_LAYOUTS = {
            easy: [
                { x: -6.2, z: -3.8 }, { x: -6.2, z: 0 }, { x: -6.2, z: 3.8 },
                { x: 6.2, z: -3.8 }, { x: 6.2, z: 0 }, { x: 6.2, z: 3.8 }
            ],
            normal: [
                { x: -6.2, z: -3.8 }, { x: -6.2, z: 0 }, { x: -6.2, z: 3.8 },
                { x: 6.2, z: -3.8 }, { x: 6.2, z: 0 }, { x: 6.2, z: 3.8 }
            ],
            hard: [
                { x: -7.5, z: -4.8 }, { x: -7.5, z: 4.8 }, { x: -4.0, z: -5.6 },
                { x: 7.5, z: -4.8 }, { x: 7.5, z: 4.8 }, { x: 4.0, z: -5.6 }
            ]
        };

        const plateCubesGroup = new THREE.Group();
        let activeKitchenOrder = null;
        const kitchenPlateSet = new Set();

        const INGREDIENT_COLORS = {
            1: { hex: 0xef4444, name: 'Tomate', emoji: '🍅' },
            2: { hex: 0xfacc15, name: 'Queso', emoji: '🧀' },
            3: { hex: 0xa855f7, name: 'Hongo', emoji: '🍄' },
            4: { hex: 0x22c55e, name: 'Lechuga', emoji: '🥬' },
            5: { hex: 0xf97316, name: 'Tocino', emoji: '🥓' },
            6: { hex: 0x06b6d4, name: 'Marisco', emoji: '🦐' }
        };

        function createNpcLeg(side, legColor, shoeColor) {
            const lg = new THREE.Group();
            lg.position.set(0.22 * side, 0.62, 0);
            const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.7 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.7 });
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.55, 12), legMat);
            leg.position.y = -0.3; leg.castShadow = true; lg.add(leg);
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.4), shoeMat);
            shoe.position.set(0, -0.56, 0.08); shoe.castShadow = true; lg.add(shoe);
            return lg;
        }

        function createNpcArm(side, armColor, handColor) {
            const armG = new THREE.Group();
            const armMat = new THREE.MeshStandardMaterial({ color: armColor, roughness: 0.7 });
            const handMat = new THREE.MeshStandardMaterial({ color: handColor, roughness: 0.7 });
            const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.62, 10), armMat);
            limb.position.y = -0.31; limb.castShadow = true; armG.add(limb);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), handMat);
            hand.position.y = -0.68; hand.castShadow = true; armG.add(hand);
            armG.rotation.z = 0.4 * side;
            armG.userData.baseZ = 0.4 * side;
            return armG;
        }

        function create67Figure(color = 0x22d3ee, emissive = 0x0891b2) {
            const group = new THREE.Group();
            const digitMat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.6, roughness: 0.4 });
            const body = new THREE.Group();
            const W = 0.62, H = 1.3, t = 0.2, depth = 0.3;
            const addSeg = (x, y, w, h) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), digitMat);
                m.position.set(x, y, 0);
                m.castShadow = true;
                body.add(m);
            };
            const digit = (cx, segs) => {
                const cy = 1.35;
                if (segs.a) addSeg(cx, cy + H / 2 - t / 2, W, t);
                if (segs.g) addSeg(cx, cy, W, t);
                if (segs.d) addSeg(cx, cy - H / 2 + t / 2, W, t);
                if (segs.f) addSeg(cx - W / 2 + t / 2, cy + H / 4, t, H / 2 - t);
                if (segs.b) addSeg(cx + W / 2 - t / 2, cy + H / 4, t, H / 2 - t);
                if (segs.e) addSeg(cx - W / 2 + t / 2, cy - H / 4, t, H / 2 - t);
                if (segs.c) addSeg(cx + W / 2 - t / 2, cy - H / 4, t, H / 2 - t);
            };
            digit(-0.45, { a: 1, f: 1, g: 1, e: 1, c: 1, d: 1 });   // "6"
            digit(0.45, { a: 1, b: 1, c: 1 });                        // "7"
            group.add(body);
            const armL = createNpcArm(-1, color, emissive);
            const armR = createNpcArm(1, color, emissive);
            armL.position.set(-0.82, 1.95, 0);
            armR.position.set(0.82, 1.95, 0);
            body.add(armL); body.add(armR);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
            const makeLeg = (side) => createNpcLeg(side, 0x0f172a, 0x334155);
            const legL = makeLeg(-1), legR = makeLeg(1);
            group.add(legL);
            group.add(legR);
            return { group, body, legL, legR, armL, armR };
        }

        // ---- Animal figures (wearable skins + hidden NPCs) ----
        function createBearFigure() {
            const group = new THREE.Group();
            const body = new THREE.Group();
            const fur = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.9 });
            const furLight = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.9 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
            const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), fur);
            torso.scale.set(1, 1.15, 0.9); torso.position.y = 1.4; torso.castShadow = true; body.add(torso);
            const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 14), furLight);
            belly.scale.set(1, 1.1, 0.55); belly.position.set(0, 1.3, 0.45); body.add(belly);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), fur);
            head.position.y = 2.32; head.castShadow = true; body.add(head);
            [-1, 1].forEach(s => {
                const ear = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), fur);
                ear.position.set(0.36 * s, 2.7, -0.02); body.add(ear);
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), dark);
                eye.position.set(0.18 * s, 2.4, 0.46); body.add(eye);
            });
            const snout = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), furLight);
            snout.scale.set(1.1, 0.8, 0.9); snout.position.set(0, 2.16, 0.44); body.add(snout);
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), dark);
            nose.position.set(0, 2.24, 0.68); body.add(nose);
            const armL = createNpcArm(-1, 0x8d5524, 0x5a3416);
            const armR = createNpcArm(1, 0x8d5524, 0x5a3416);
            armL.position.set(-0.68, 1.85, 0.05);
            armR.position.set(0.68, 1.85, 0.05);
            body.add(armL); body.add(armR);
            group.add(body);
            const legL = createNpcLeg(-1, 0x8d5524, 0x5a3416);
            const legR = createNpcLeg(1, 0x8d5524, 0x5a3416);
            group.add(legL); group.add(legR);
            return { group, body, legL, legR, armL, armR };
        }

        function createWolfFigure() {
            const group = new THREE.Group();
            const body = new THREE.Group();
            const fur = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 0.9 });
            const furLight = new THREE.MeshStandardMaterial({ color: 0xd7dde3, roughness: 0.9 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
            const torso = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 14), fur);
            torso.scale.set(1, 1.25, 0.85); torso.position.y = 1.4; torso.castShadow = true; body.add(torso);
            const chest = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), furLight);
            chest.scale.set(1, 1.2, 0.5); chest.position.set(0, 1.32, 0.42); body.add(chest);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.6), fur);
            head.position.y = 2.28; head.castShadow = true; body.add(head);
            const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.44), furLight);
            snout.position.set(0, 2.18, 0.5); body.add(snout);
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), dark);
            nose.position.set(0, 2.22, 0.72); body.add(nose);
            [-1, 1].forEach(s => {
                const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 8), fur);
                ear.position.set(0.24 * s, 2.68, -0.02); ear.rotation.z = -0.18 * s; body.add(ear);
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), dark);
                eye.position.set(0.2 * s, 2.36, 0.3); body.add(eye);
            });
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.95, 10), fur);
            tail.position.set(0, 1.2, -0.6); tail.rotation.x = -1.05; tail.castShadow = true; body.add(tail);
            const armL = createNpcArm(-1, 0x9aa5b1, 0x374151);
            const armR = createNpcArm(1, 0x9aa5b1, 0x374151);
            armL.position.set(-0.6, 1.85, 0.05);
            armR.position.set(0.6, 1.85, 0.05);
            body.add(armL); body.add(armR);
            group.add(body);
            const legL = createNpcLeg(-1, 0x9aa5b1, 0x374151);
            const legR = createNpcLeg(1, 0x9aa5b1, 0x374151);
            group.add(legL); group.add(legR);
            return { group, body, legL, legR, armL, armR };
        }

        function createCatFigure() {
            const group = new THREE.Group();
            const body = new THREE.Group();
            const fur = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.85 });
            const furLight = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
            const torso = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 14), fur);
            torso.scale.set(1, 1.2, 0.85); torso.position.y = 1.38; torso.castShadow = true; body.add(torso);
            const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), furLight);
            belly.scale.set(1, 1.1, 0.5); belly.position.set(0, 1.3, 0.42); body.add(belly);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), fur);
            head.position.y = 2.26; head.castShadow = true; body.add(head);
            [-1, 1].forEach(s => {
                const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 8), fur);
                ear.position.set(0.28 * s, 2.66, 0); ear.rotation.z = -0.15 * s; body.add(ear);
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), dark);
                eye.position.set(0.18 * s, 2.34, 0.44); body.add(eye);
            });
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.6 }));
            nose.position.set(0, 2.18, 0.52); body.add(nose);
            const whiskerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
            [-1, 1].forEach(s => {
                [0.12, 0].forEach((dy, wi) => {
                    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), whiskerMat);
                    w.position.set(0.28 * s, 2.16 + dy, 0.5); w.rotation.z = Math.PI / 2; w.rotation.y = -0.2 * s * (wi ? -1 : 1); body.add(w);
                });
            });
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.05, 10), fur);
            tail.position.set(0, 1.15, -0.58); tail.rotation.x = -0.9; tail.castShadow = true; body.add(tail);
            const armL = createNpcArm(-1, 0xf59e0b, 0xfef3c7);
            const armR = createNpcArm(1, 0xf59e0b, 0xfef3c7);
            armL.position.set(-0.58, 1.82, 0.05);
            armR.position.set(0.58, 1.82, 0.05);
            body.add(armL); body.add(armR);
            group.add(body);
            const legL = createNpcLeg(-1, 0xf59e0b, 0x7c2d12);
            const legR = createNpcLeg(1, 0xf59e0b, 0x7c2d12);
            group.add(legL); group.add(legR);
            return { group, body, legL, legR, armL, armR };
        }

        function createTungTungFigure() {
            const group = new THREE.Group();
            const body = new THREE.Group();
            const bark = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 });
            const barkDark = new THREE.MeshStandardMaterial({ color: 0x4a2c17, roughness: 0.95 });
            const woodCut = new THREE.MeshStandardMaterial({ color: 0xc19a6b, roughness: 0.8 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
            const cream = new THREE.MeshStandardMaterial({ color: 0xe7dfc9, roughness: 0.55 });

            // Main log trunk body
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 2.0, 16), bark);
            trunk.position.y = 1.4; trunk.castShadow = true; body.add(trunk);
            // Bark ring bands
            [0.65, 1.4, 2.15].forEach(y => {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.035, 8, 18), barkDark);
                ring.rotation.x = Math.PI / 2; ring.position.y = y; body.add(ring);
            });
            // Exposed wood cut on top
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 16), woodCut);
            top.position.y = 2.42; body.add(top);
            // Knots / wood rings detail
            [[0.3, 2.1], [-0.28, 1.5], [0.32, 0.9]].forEach(k => {
                const knot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), woodCut);
                knot.position.set(k[0], k[1], 0.5); body.add(knot);
            });

            // Carved face
            [-0.2, 0.2].forEach(sx => {
                const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), cream);
                eyeW.position.set(sx, 2.02, 0.46); eyeW.scale.set(1, 1, 0.55); body.add(eyeW);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), dark);
                pupil.position.set(sx, 2.02, 0.56); body.add(pupil);
            });
            // Big grinning mouth
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.18, 0.14), dark);
            mouth.position.set(0, 1.72, 0.48); body.add(mouth);
            for (let i = -1; i <= 1; i++) {
                const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.06), cream);
                tooth.position.set(i * 0.17, 1.77, 0.55); body.add(tooth);
            }

            // Left arm: shoulder pivot hanging down-out to the left
            const armL = new THREE.Group();
            armL.position.set(-0.45, 1.9, 0.05);
            const armLlimb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.85, 10), bark);
            armLlimb.position.y = -0.425; armLlimb.castShadow = true; armL.add(armLlimb);
            const handL = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), barkDark);
            handL.position.y = -0.9; armL.add(handL);
            armL.rotation.z = -0.45;
            armL.userData.baseZ = -0.45;
            body.add(armL);

            // Right arm: raised, hand grips the bat
            const armR = new THREE.Group();
            armR.position.set(0.32, 1.92, 0.1);
            const armRlimb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.85, 10), bark);
            armRlimb.position.y = -0.425; armRlimb.castShadow = true; armR.add(armRlimb);
            const handR = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), barkDark);
            handR.position.y = -0.9; armR.add(handR);
            armR.rotation.z = 1.84;
            armR.userData.baseZ = 1.84;
            body.add(armR);

            // Baseball bat resting over the shoulder (grip lands in the right hand)
            const batWood = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
            const bat = new THREE.Group();
            const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.055, 1.15, 12), batWood);
            batBody.position.y = 0.55; batBody.castShadow = true; bat.add(batBody);
            const batHead = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.09, 0.42, 12), batWood);
            batHead.position.y = 1.28; bat.add(batHead);
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), batWood);
            bat.add(knob);
            bat.position.set(1.0, 1.75, 0.12);
            bat.rotation.z = -0.45;
            body.add(bat);

            group.add(body);
            const legL = createNpcLeg(-1, 0x4a2c17, 0x2f1b0f);
            const legR = createNpcLeg(1, 0x4a2c17, 0x2f1b0f);
            group.add(legL); group.add(legR);
            return { group, body, legL, legR, armL, armR };
        }

        function buildSpecialSkinFigure(id) {
            if (id === '67') return create67Figure(0x22d3ee, 0x0891b2);
            if (id === 'oso') return createBearFigure();
            if (id === 'lobo') return createWolfFigure();
            if (id === 'gato') return createCatFigure();
            if (id === 'tung') return createTungTungFigure();
            return null;
        }

        function build3DKitchenArena() {
            kitchenGroup.add(kitchenExtrasGroup);

            const FLOOR_HALF_X = 12;
            const FLOOR_HALF_Z = 9;
            const floorGeo = new THREE.BoxGeometry(FLOOR_HALF_X * 2, 0.5, FLOOR_HALF_Z * 2);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.position.y = -0.25;
            floor.receiveShadow = true;
            kitchenGroup.add(floor);

            // Checkerboard tile floor for a cozy kitchen look
            const tileGroup = new THREE.Group();
            const tileMatA = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.62 });
            const tileMatB = new THREE.MeshStandardMaterial({ color: 0x52607a, roughness: 0.62 });
            const tileSize = 2;
            for (let tx = -FLOOR_HALF_X; tx < FLOOR_HALF_X; tx += tileSize) {
                for (let tz = -FLOOR_HALF_Z; tz < FLOOR_HALF_Z; tz += tileSize) {
                    const tile = new THREE.Mesh(new THREE.BoxGeometry(tileSize - 0.08, 0.06, tileSize - 0.08),
                        (Math.round(tx / tileSize) + Math.round(tz / tileSize)) % 2 === 0 ? tileMatA : tileMatB);
                    tile.position.set(tx + tileSize / 2, 0.03, tz + tileSize / 2);
                    tile.receiveShadow = true;
                    tileGroup.add(tile);
                }
            }
            kitchenGroup.add(tileGroup);

            // Back wall (with window panes) and side walls (repositioned per difficulty)
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a7a44, roughness: 0.86 });
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 0.4), wallMat);
            backWall.receiveShadow = true;
            kitchenGroup.add(backWall);
            kitchenArenaWalls.back = backWall;

            const windowMat = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x8fc2ff, emissiveIntensity: 0.28, roughness: 0.24 });
            kitchenArenaWalls.windows = [];
            [-2, -1, 0, 1, 2].forEach(() => {
                const win = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.15), windowMat);
                kitchenGroup.add(win);
                kitchenArenaWalls.windows.push(win);
            });

            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 1), wallMat);
            kitchenGroup.add(leftWall);
            kitchenArenaWalls.left = leftWall;
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 1), wallMat);
            kitchenGroup.add(rightWall);
            kitchenArenaWalls.right = rightWall;

            // Hanging lamps over the kitchen
            const lampMat = new THREE.MeshStandardMaterial({ color: 0xc8954a, emissive: 0xf0c27a, emissiveIntensity: 0.28 });
            const lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xede3c6, emissive: 0xf2dfbc, emissiveIntensity: 0.95 });
            kitchenArenaWalls.lamps = [];
            [-2, -1, 0, 1, 2].forEach(() => {
                const lamp = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 20), lampMat);
                kitchenGroup.add(lamp);
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), lampBulbMat);
                kitchenGroup.add(bulb);
                kitchenArenaWalls.lamps.push({ lamp, bulb });
            });
            positionKitchenArena('easy');

            const tableGroup = new THREE.Group();
            const steelMat = new THREE.MeshStandardMaterial({ color: 0x7f8ea3, roughness: 0.42, metalness: 0.22 });
            const counterMat = new THREE.MeshStandardMaterial({ color: 0x6f7f94, roughness: 0.45, metalness: 0.14 });
            const woodMat = new THREE.MeshStandardMaterial({ color: 0xb08944, roughness: 0.66 });

            const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 2.4), counterMat);
            tableTop.position.y = 0.96;
            tableTop.castShadow = true;
            tableTop.receiveShadow = true;
            tableGroup.add(tableTop);

            const tableTrim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.08, 2.52), steelMat);
            tableTrim.position.y = 0.86;
            tableGroup.add(tableTrim);

            [[-1.62, -1.0], [1.62, -1.0], [-1.62, 1.0], [1.62, 1.0]].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.87, 0.2), steelMat);
                leg.position.set(lx, 0.435, lz);
                leg.castShadow = true;
                tableGroup.add(leg);
            });

            const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 1.9), woodMat);
            shelf.position.y = 0.32;
            tableGroup.add(shelf);

            const cuttingBoard = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6), woodMat);
            cuttingBoard.position.set(-1.42, 1.09, -0.9);
            tableGroup.add(cuttingBoard);

            const bowl = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.22, 0.28, 18),
                new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.1 })
            );
            bowl.position.set(1.42, 1.2, -0.9);
            tableGroup.add(bowl);

            const jar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.2, 0.46, 14),
                new THREE.MeshStandardMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8, roughness: 0.2 })
            );
            jar.position.set(1.5, 1.29, 0.78);
            tableGroup.add(jar);

            tableGroup.position.set(0, 0, 0);
            kitchenGroup.add(tableGroup);
            kitchenTableMesh = tableGroup;

            const plateMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(1.1, 0.95, 0.18, 24),
                new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.2, roughness: 0.2 })
            );
            plateMesh.position.set(0, 1.15, 0);
            kitchenGroup.add(plateMesh);
            kitchenPlateMesh = plateMesh;

            plateCubesGroup.position.set(0, 1.35, 0);
            kitchenGroup.add(plateCubesGroup);

            create3DLabel(
                plateMesh,
                `<div class="px-3.5 py-1 rounded-full bg-slate-900/90 border-2 border-amber-400/60 text-base font-bold text-amber-300 shadow">Plato Conjunto</div>`,
                1.05,
                'overcooked'
            );

            const ringGeo = new THREE.RingGeometry(1.15, 1.42, 32);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
            proximityRingMesh = new THREE.Mesh(ringGeo, ringMat);
            proximityRingMesh.position.set(0, 0.06, 0);
            proximityRingMesh.visible = false;
            kitchenGroup.add(proximityRingMesh);

            proximityPromptLabel = create3DLabel(
                proximityRingMesh,
                `<div id="proximity-e-badge" class="key-prompt-badge px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xl border-2 border-white">
                    [E] Interactuar
                </div>`,
                2.55,
                'overcooked'
            );
            proximityPromptLabel.div.style.display = 'none';

            const cratePositions = [
                { id: 1, x: -6.2, z: -3.8 },
                { id: 2, x: -6.2, z: 0 },
                { id: 3, x: -6.2, z: 3.8 },
                { id: 4, x: 6.2, z: -3.8 },
                { id: 5, x: 6.2, z: 0 },
                { id: 6, x: 6.2, z: 3.8 }
            ];

            const crateLidMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
            const crateFrameMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

            cratePositions.forEach(pos => {
                const meta = INGREDIENT_COLORS[pos.id];
                const crateGroup = new THREE.Group();
                crateGroup.position.set(pos.x, 0.7, pos.z);

                const box = new THREE.Mesh(
                    new THREE.BoxGeometry(1.65, 1.35, 1.65),
                    new THREE.MeshStandardMaterial({ color: meta.hex, roughness: 0.35 })
                );
                box.userData = { type: 'kitchen_crate', elementId: pos.id };
                crateGroup.add(box);
                clickableMeshes.push(box);

                // Wooden crate frame: corner posts + horizontal bands + lid
                [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([cx, cz]) => {
                    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), crateFrameMat);
                    post.position.set(cx, 0, cz);
                    crateGroup.add(post);
                });
                [-0.42, 0.42].forEach(by => {
                    const band = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, 1.72), crateFrameMat);
                    band.position.y = by;
                    crateGroup.add(band);
                });
                const lid = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.16, 1.82), crateLidMat);
                lid.position.y = 0.7;
                lid.userData = { type: 'kitchen_crate', elementId: pos.id };
                crateGroup.add(lid);
                clickableMeshes.push(lid);

                const topper = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.42, 0),
                    new THREE.MeshStandardMaterial({ color: 0xe7dfc9, emissive: meta.hex, emissiveIntensity: 0.4 })
                );
                topper.position.y = 1.1;
                topper.userData = { type: 'kitchen_crate', elementId: pos.id };
                crateGroup.add(topper);
                clickableMeshes.push(topper);

                kitchenGroup.add(crateGroup);
                kitchenCrates.push({ id: pos.id, group: crateGroup, box, topper });

                interactableStations.push({
                    stationType: 'crate',
                    elementId: pos.id,
                    position: new THREE.Vector3(pos.x, 0, pos.z),
                    mesh: box,
                    promptText: () => kitchenPlateSet.has(pos.id) ? `Pulsa [E] Quitar #${pos.id} (${meta.emoji})` : `Pulsa [E] Agregar #${pos.id} (${meta.emoji})`
                });

                create3DLabel(
                    box,
                    `<div class="px-3 py-1 rounded-lg bg-slate-950/90 border-2 border-white/20 text-base font-bold text-white shadow">
                        ${meta.emoji} <span class="text-amber-300 mono-font">#${pos.id}</span>
                    </div>`,
                    1.45,
                    'overcooked'
                );
            });

            const deliveryCounter = new THREE.Mesh(
                new THREE.BoxGeometry(4.4, 1.15, 1.5),
                new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.25 })
            );
            deliveryCounter.position.set(0, 0.58, -5.2);
            deliveryCounter.userData = { type: 'kitchen_deliver' };
            kitchenGroup.add(deliveryCounter);
            clickableMeshes.push(deliveryCounter);
            kitchenDeliveryMesh = deliveryCounter;

            const counterTop = new THREE.Mesh(
                new THREE.BoxGeometry(4.7, 0.16, 1.7),
                new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.3, emissive: 0x059669, emissiveIntensity: 0.2 })
            );
            counterTop.position.y = 0.66;
            counterTop.userData = { type: 'kitchen_deliver' };
            deliveryCounter.add(counterTop);
            clickableMeshes.push(counterTop);

            const counterPanel = new THREE.Mesh(
                new THREE.BoxGeometry(3.9, 0.55, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.45 })
            );
            counterPanel.position.set(0, 0.02, 0.78);
            deliveryCounter.add(counterPanel);

            const bellBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.26, 0.06, 16),
                new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.2 })
            );
            bellBase.position.set(0, 0.78, 0.25);
            deliveryCounter.add(bellBase);
            const bell = new THREE.Mesh(
                new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.7, roughness: 0.15 })
            );
            bell.position.set(0, 0.78, 0.25);
            deliveryCounter.add(bell);

            interactableStations.push({
                stationType: 'deliver',
                position: new THREE.Vector3(0, 0, -5.2),
                mesh: deliveryCounter,
                promptText: () => `🔔 Pulsa [E] ¡Entregar Plato!`
            });

            create3DLabel(
                deliveryCounter,
                `<div class="px-3.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-base shadow">
                    🔔 Barra de Entrega
                </div>`,
                1.2,
                'overcooked'
            );

            const trashCounter = new THREE.Mesh(
                new THREE.BoxGeometry(2.6, 1.05, 1.4),
                new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x9f1239, emissiveIntensity: 0.25 })
            );
            trashCounter.position.set(0, 0.52, 5.2);
            trashCounter.userData = { type: 'kitchen_clear' };
            kitchenGroup.add(trashCounter);
            clickableMeshes.push(trashCounter);
            kitchenTrashMesh = trashCounter;

            const binRim = new THREE.Mesh(
                new THREE.BoxGeometry(2.75, 0.12, 1.55),
                new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.5 })
            );
            binRim.position.y = 0.55;
            trashCounter.add(binRim);

            const binLid = new THREE.Mesh(
                new THREE.CylinderGeometry(0.62, 0.66, 0.16, 20),
                new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.3 })
            );
            binLid.position.set(0, 0.66, 0);
            binLid.scale.set(1, 1, 0.72);
            trashCounter.add(binLid);

            const binPedal = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.1, 0.28),
                new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
            );
            binPedal.position.set(0, -0.45, 0.72);
            trashCounter.add(binPedal);

            interactableStations.push({
                stationType: 'clear',
                position: new THREE.Vector3(0, 0, 5.2),
                mesh: trashCounter,
                promptText: () => `🗑️ Pulsa [E] Vaciar Plato (∅)`
            });

            create3DLabel(
                trashCounter,
                `<div class="px-3.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-base shadow">
                    🗑️ Vaciar (∅)
                </div>`,
                1.1,
                'overcooked'
            );

            const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3c99a, roughness: 0.75 });
            const coatMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
            const apronMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
            const hatMat = new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.88 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
            chefMaterials = { skin: skinMat, coat: coatMat, apron: apronMat, hat: hatMat, dark: darkMat, shoe: shoeMat };

            chefMesh = new THREE.Group();
            chefMesh.position.set(0, 0, 2.6);

            const makeLeg = (side) => {
                const g = new THREE.Group();
                g.position.set(0.2 * side, 0.62, 0);
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.55, 12), darkMat);
                leg.position.y = -0.3;
                g.add(leg);
                const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.42), shoeMat);
                shoe.position.set(0, -0.56, 0.08);
                shoe.castShadow = true;
                g.add(shoe);
                return g;
            };
            const legL = makeLeg(-1);
            const legR = makeLeg(1);
            chefMesh.add(legL);
            chefMesh.add(legR);

            const chefUpper = new THREE.Group();
            chefMesh.add(chefUpper);

            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.92, 18), coatMat);
            torso.position.y = 1.08;
            torso.castShadow = true;
            chefUpper.add(torso);

            [-1, 1].forEach(sx => {
                const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), coatMat);
                shoulder.position.set(0.44 * sx, 1.45, 0);
                chefUpper.add(shoulder);
            });

            const apron = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.12), apronMat);
            apron.position.set(0, 0.95, 0.42);
            chefUpper.add(apron);
            const apronNeck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.08), apronMat);
            apronNeck.position.set(0, 1.32, 0.4);
            chefUpper.add(apronNeck);
            const apronStrapA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), apronMat);
            apronStrapA.position.set(-0.18, 1.4, 0.35);
            apronStrapA.rotation.z = 0.35;
            chefUpper.add(apronStrapA);
            const apronStrapB = apronStrapA.clone();
            apronStrapB.position.x = 0.18;
            apronStrapB.rotation.z = -0.35;
            chefUpper.add(apronStrapB);

            const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 18), skinMat);
            head.position.y = 1.82;
            head.castShadow = true;
            chefUpper.add(head);

            [-0.13, 0.13].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), darkMat);
                eye.position.set(ex, 1.87, 0.31);
                chefUpper.add(eye);
            });
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), skinMat);
            nose.position.set(0, 1.79, 0.35);
            chefUpper.add(nose);

            const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.35, 0.26, 18), hatMat);
            hatBand.position.y = 2.2;
            chefUpper.add(hatBand);
            const hatPuff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 18), hatMat);
            hatPuff.position.y = 2.5;
            hatPuff.scale.set(1, 0.85, 1);
            chefUpper.add(hatPuff);
            [[-0.3, 2.42, 0], [0.3, 2.42, 0], [0, 2.42, -0.3], [0, 2.46, 0.28]].forEach(([px, py, pz]) => {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), hatMat);
                puff.position.set(px, py, pz);
                chefUpper.add(puff);
            });

            const makeArm = (side) => {
                const g = new THREE.Group();
                g.position.set(0.52 * side, 1.42, 0);
                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.72, 12), coatMat);
                arm.position.y = -0.36;
                arm.castShadow = true;
                g.add(arm);
                const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), skinMat);
                hand.position.y = -0.74;
                g.add(hand);
                g.rotation.z = 0.12 * side;
                return g;
            };
            const armL = makeArm(-1);
            const armR = makeArm(1);
            chefUpper.add(armL);
            chefUpper.add(armR);

            chefCarryGroup = new THREE.Group();
            chefCarryGroup.position.set(0, 1.3, 0.62);
            chefUpper.add(chefCarryGroup);

            chefParts = { legL, legR, armL, armR, chefUpper };
            chefWalkPhase = 0;

            // Unlockable special skins (67, oso, lobo, gato), hidden until worn
            SPECIAL_SKINS.forEach(sp => {
                const fig = buildSpecialSkinFigure(sp.id);
                if (!fig) return;
                fig.group.visible = false;
                chefMesh.add(fig.group);
                chefSpecialFigures[sp.id] = fig;
            });

            kitchenGroup.add(chefMesh);

            kitchenExtrasGroup.position.set(0, 0, 0);
            applyKitchenDifficulty(kitchenDifficulty);
        }

        // ============================================================
        //  KITCHEN DIFFICULTY: layouts, obstacles & hazards
        // ============================================================
        function updateKitchenDifficultyButtons() {
            const defs = [
                { id: 'btn-diff-easy', active: 'bg-emerald-500 text-slate-950', key: 'easy' },
                { id: 'btn-diff-normal', active: 'bg-amber-500 text-slate-950', key: 'normal' },
                { id: 'btn-diff-hard', active: 'bg-rose-500 text-white', key: 'hard' }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === kitchenDifficulty
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function updateKitchenTimeButtons() {
            const defs = [
                { id: 'btn-time-60', active: 'bg-cyan-500 text-slate-950', key: 60 },
                { id: 'btn-time-120', active: 'bg-cyan-500 text-slate-950', key: 120 },
                { id: 'btn-time-180', active: 'bg-cyan-500 text-slate-950', key: 180 }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === kitchenRoundTime
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setKitchenRoundTime(sec) {
            kitchenRoundTime = sec;
            updateKitchenTimeButtons();
            if (currentMode === 'overcooked' && !kitchenGameOver) {
                roundTimer = sec;
                document.getElementById('hud-timer').textContent = `${sec}s`;
                updateBigTimer();
            }
            renderLeaderboardUI();
        }

        function currentRoundLimit() {
            if (currentMode === 'millonario') return MILL_TIMES[millDifficulty];
            if (currentMode === 'duelo') return DUEL_TIMES[duelDifficulty];
            return currentMode === 'overcooked' ? kitchenRoundTime : 45;
        }

        function updateBigTimer() {
            const valEl = document.getElementById('big-timer-value');
            if (!valEl) return;
            const barEl = document.getElementById('big-timer-bar');
            const pillEl = document.getElementById('big-timer-pill');
            const secs = Math.max(0, roundTimer);
            valEl.textContent = secs;
            const limit = currentRoundLimit() || 1;
            const pct = Math.max(0, Math.min(100, (secs / limit) * 100));
            const low = secs <= 10;
            if (barEl) {
                barEl.style.width = pct + '%';
                barEl.className = 'h-full rounded-full transition-[width] duration-1000 ease-linear ' + (low ? 'bg-rose-500' : 'bg-cyan-400');
            }
            valEl.className = 'mono-font text-4xl font-extrabold tabular-nums leading-none ' + (low ? 'text-rose-400' : 'text-cyan-300');
            if (pillEl) {
                pillEl.className = 'flex items-center gap-2.5 bg-slate-950/85 backdrop-blur border-2 rounded-2xl px-5 py-1.5 shadow-2xl ' + (low ? 'border-rose-500/60 animate-pulse' : 'border-cyan-500/50');
            }
            if (currentMode === 'millonario') {
                const mBar = document.getElementById('million-timer-bar');
                const mVal = document.getElementById('million-timer-val');
                if (mBar) {
                    mBar.style.width = pct + '%';
                    mBar.className = 'h-full rounded-full transition-[width] duration-1000 ease-linear ' + (low ? 'bg-rose-500' : 'bg-amber-400');
                }
                if (mVal) {
                    mVal.textContent = secs;
                    mVal.className = 'mono-font text-[11px] font-extrabold tabular-nums ' + (low ? 'text-rose-400' : 'text-amber-300');
                }
            }
            if (currentMode === 'duelo') {
                const dBar = document.getElementById('duel-timer-bar');
                const dVal = document.getElementById('duel-timer-val');
                if (dBar) {
                    dBar.style.width = pct + '%';
                    dBar.className = 'h-full rounded-full transition-[width] duration-1000 ease-linear ' + (low ? 'bg-rose-500' : 'bg-orange-400');
                }
                if (dVal) {
                    dVal.textContent = secs;
                    dVal.className = 'mono-font text-[11px] font-extrabold tabular-nums ' + (low ? 'text-rose-400' : 'text-orange-300');
                }
            }
        }

        function showStartHint() {
            const el = document.getElementById('start-hint');
            if (el) el.classList.remove('hidden');
        }

        function hideStartHint() {
            const el = document.getElementById('start-hint');
            if (el) el.classList.add('hidden');
        }

        function armStartHint() {
            awaitingStart = true;
            const txt = document.getElementById('start-hint-text');
            const icon = document.getElementById('start-hint-icon');
            const isTouchUI = document.documentElement.classList.contains('is-mobile');
            if (txt) {
                if (isTouchUI) {
                    txt.textContent = 'Toca la pantalla para comenzar';
                } else {
                    txt.textContent = currentMode === 'overcooked'
                        ? 'Presiona cualquier tecla para comenzar'
                        : 'Haz clic para comenzar';
                }
            }
            if (icon) {
                icon.className = isTouchUI
                    ? 'fa-solid fa-hand-pointer text-amber-300 text-4xl animate-bounce'
                    : (currentMode === 'overcooked'
                        ? 'fa-solid fa-keyboard text-amber-300 text-4xl animate-bounce'
                        : 'fa-solid fa-computer-mouse text-amber-300 text-4xl animate-bounce');
            }
            showStartHint();
        }

        function landingVisible() {
            const l = document.getElementById('landing-screen');
            return !!(l && !l.classList.contains('hidden'));
        }

        function hideKitchenGameOver() {
            const overlay = document.getElementById('kitchen-gameover');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        // Dismissing the panel should leave the kitchen run ready to play again
        function closeKitchenGameOver() {
            hideKitchenGameOver();
            if (currentMode === 'overcooked') startKitchenRun();
        }

        function startKitchenRun() {
            kitchenGameOver = false;
            modeScores.overcooked = 0;
            globalStreak = 0;
            roundTimer = kitchenRoundTime;
            document.getElementById('hud-score').textContent = '0';
            document.getElementById('hud-streak').textContent = 'x1';
            document.getElementById('hud-timer').textContent = `${kitchenRoundTime}s`;
            updateBigTimer();
            hideKitchenGameOver();
            setCrowdWarning(false);
            if (kitchenCrowd) {
                clearCrowdPeople();
                kitchenCrowd.phase = 'idle';
                kitchenCrowd.timer = randRange(7, 15);
                kitchenCrowd.dir = 1;
            }
            armStartHint();
            if (currentMode === 'overcooked') generateKitchenOrder();
        }

        function endKitchenGame() {
            if (kitchenGameOver) return;
            kitchenGameOver = true;
            roundTimer = 0;
            setCrowdWarning(false);
            document.getElementById('hud-timer').textContent = '0s';
            updateBigTimer();
            playSFX('error');
            const score = modeScores.overcooked || 0;
            const maxScore = getLeaderboard('overcooked', kitchenRoundTime).reduce((m, p) => Math.max(m, p.score), 0);
            savePlayerToLeaderboard();
            renderLeaderboardUI();
            const overlay = document.getElementById('kitchen-gameover');
            if (overlay) {
                const scoreEl = document.getElementById('gameover-score');
                const bestEl = document.getElementById('gameover-best');
                const msgEl = document.getElementById('gameover-msg');
                if (scoreEl) scoreEl.textContent = `${score} pts`;
                if (bestEl) bestEl.textContent = `${Math.max(maxScore, score)} pts`;
                if (msgEl) msgEl.textContent = score >= maxScore && score > 0
                    ? '¡Nuevo récord! Estás en la cima de la clasificación.'
                    : 'Se registró tu puntaje en el Top 10 de Cocina 3D.';
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        }

        function restartKitchenGame() {
            playSFX('pickup');
            applyKitchenDifficulty(kitchenDifficulty);
            startKitchenRun();
        }

        function hideAimGameOver() {
            const overlay = document.getElementById('aim-gameover');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        // Dismissing the game-over panel should leave the game ready to play again
        function closeAimGameOver() {
            hideAimGameOver();
            if (currentMode === 'aim') startAimRun();
        }

        function endAimGame() {
            if (aimGameOver) return;
            aimGameOver = true;
            roundTimer = 0;
            document.getElementById('hud-timer').textContent = '0s';
            updateBigTimer();
            playSFX('error');
            const score = modeScores.aim || 0;
            const maxScore = getLeaderboard('aim').reduce((m, p) => Math.max(m, p.score), 0);
            savePlayerToLeaderboard();
            renderLeaderboardUI();
            const overlay = document.getElementById('aim-gameover');
            if (overlay) {
                const scoreEl = document.getElementById('aim-gameover-score');
                const bestEl = document.getElementById('aim-gameover-best');
                const hitsEl = document.getElementById('aim-gameover-hits');
                const missesEl = document.getElementById('aim-gameover-misses');
                const accEl = document.getElementById('aim-gameover-acc');
                const msgEl = document.getElementById('aim-gameover-msg');
                const total = statHits + statMisses;
                const acc = total > 0 ? Math.round((statHits / total) * 100) : 0;
                if (scoreEl) scoreEl.textContent = `${score} pts`;
                if (bestEl) bestEl.textContent = `${Math.max(maxScore, score)} pts`;
                if (hitsEl) hitsEl.textContent = statHits;
                if (missesEl) missesEl.textContent = statMisses;
                if (accEl) accEl.textContent = `${acc}%`;
                if (msgEl) msgEl.textContent = score >= maxScore && score > 0
                    ? '¡Nuevo récord! Estás en la cima de Rayo Lógico 3D.'
                    : 'Se registró tu puntaje en el Top 10 de Rayo Lógico 3D.';
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        }

        function restartAimGame() {
            playSFX('pickup');
            startAimRun();
        }

        function hideConnectGameOver() {
            const overlay = document.getElementById('connect-gameover');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        function startConnectRun() {
            connectGameOver = false;
            modeScores.connect = 0;
            globalStreak = 0;
            statHits = 0;
            statMisses = 0;
            document.getElementById('hud-score').textContent = '0';
            document.getElementById('hud-streak').textContent = 'x1';
            document.getElementById('hud-accuracy-stats').textContent = '✔ 0 | ✖ 0';
            hideConnectGameOver();
            spawn3DConnectNodes();
            updateBigTimer();
            armStartHint();
        }

        function endConnectGame() {
            if (connectGameOver) return;
            connectGameOver = true;
            roundTimer = 0;
            document.getElementById('hud-timer').textContent = '0s';
            updateBigTimer();
            playSFX('error');
            const score = modeScores.connect || 0;
            const maxScore = getLeaderboard('connect').reduce((m, p) => Math.max(m, p.score), 0);
            savePlayerToLeaderboard();
            renderLeaderboardUI();
            const overlay = document.getElementById('connect-gameover');
            if (overlay) {
                const scoreEl = document.getElementById('connect-gameover-score');
                const bestEl = document.getElementById('connect-gameover-best');
                const hitsEl = document.getElementById('connect-gameover-hits');
                const missesEl = document.getElementById('connect-gameover-misses');
                const accEl = document.getElementById('connect-gameover-acc');
                const msgEl = document.getElementById('connect-gameover-msg');
                const total = statHits + statMisses;
                const acc = total > 0 ? Math.round((statHits / total) * 100) : 0;
                if (scoreEl) scoreEl.textContent = `${score} pts`;
                if (bestEl) bestEl.textContent = `${Math.max(maxScore, score)} pts`;
                if (hitsEl) hitsEl.textContent = statHits;
                if (missesEl) missesEl.textContent = statMisses;
                if (accEl) accEl.textContent = `${acc}%`;
                if (msgEl) msgEl.textContent = score >= maxScore && score > 0
                    ? '¡Nuevo récord! Estás en la cima de Cables Lógicos 3D.'
                    : 'Se registró tu puntaje en el Top 10 de Cables Lógicos 3D.';
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        }

        // Dismissing the panel should leave the connect run ready to play again
        function closeConnectGameOver() {
            hideConnectGameOver();
            if (currentMode === 'connect') startConnectRun();
        }

        function restartConnectGame() {
            playSFX('pickup');
            startConnectRun();
        }

        function randRange(a, b) {
            return a + Math.random() * (b - a);
        }

        function pickKitchenSpot(regions, occupied, radius) {
            for (let attempt = 0; attempt < 90; attempt++) {
                const r = regions[Math.floor(Math.random() * regions.length)];
                const x = randRange(r.minX, r.maxX);
                const z = randRange(r.minZ, r.maxZ);
                let ok = true;
                for (const o of occupied) {
                    if (Math.hypot(x - o.x, z - o.z) < radius + o.r) { ok = false; break; }
                }
                if (ok) return { x, z };
            }
            const r0 = regions[0];
            return { x: (r0.minX + r0.maxX) / 2, z: (r0.minZ + r0.maxZ) / 2 };
        }

        function generateKitchenCrates(diff, occupied) {
            if (diff === 'easy') {
                const base = KITCHEN_CRATE_LAYOUTS.easy.map(p => ({ x: p.x, z: p.z }));
                base.forEach(p => occupied.push({ x: p.x, z: p.z, r: 1.3 }));
                return base;
            }
            const leftNormal = [{ minX: -8.8, maxX: -4.6, minZ: -5.8, maxZ: 5.8 }];
            const rightNormal = [{ minX: 4.6, maxX: 8.8, minZ: -5.8, maxZ: 5.8 }];
            const leftBands = [
                { minX: -10.4, maxX: -2.6, minZ: -7.6, maxZ: -2.6 },
                { minX: -10.4, maxX: -2.6, minZ: 2.6, maxZ: 7.6 }
            ];
            const rightBands = [
                { minX: 2.6, maxX: 10.4, minZ: -7.6, maxZ: -2.6 },
                { minX: 2.6, maxX: 10.4, minZ: 2.6, maxZ: 7.6 }
            ];
            const out = [];
            for (let i = 0; i < 6; i++) {
                let regions;
                if (diff === 'hard') regions = (i < 3) ? leftBands : rightBands;
                else regions = (i % 2 === 0) ? leftNormal : rightNormal;
                const spot = pickKitchenSpot(regions, occupied, 1.3);
                out.push(spot);
                occupied.push({ x: spot.x, z: spot.z, r: 1.2 });
            }
            return out;
        }

        function layoutKitchenCrates(positions) {
            kitchenCrateMotion.length = 0;
            kitchenCrates.forEach((crate, i) => {
                const pos = positions[i] || { x: 0, z: 0 };
                crate.group.position.set(pos.x, 0.7, pos.z);
                const st = interactableStations.find(s => s.stationType === 'crate' && s.elementId === crate.id);
                if (st) st.position.set(pos.x, 0, pos.z);
                kitchenCrateMotion.push({
                    crate, station: st,
                    baseX: pos.x, baseZ: pos.z,
                    phase: i * 1.7
                });
            });
        }

        function layoutKitchenStations(diff) {
            if (diff === 'hard') {
                kitchenTableMesh.position.set(-6, 0, 0);
                kitchenPlateMesh.position.set(-6, 1.15, 0);
                plateCubesGroup.position.set(-6, 1.35, 0);
                kitchenDeliveryMesh.position.set(-6, 0.58, -7.6);
                kitchenTrashMesh.position.set(6, 0.52, 7.6);
            } else if (diff === 'normal') {
                kitchenTableMesh.position.set(0, 0, 0);
                kitchenPlateMesh.position.set(0, 1.15, 0);
                plateCubesGroup.position.set(0, 1.35, 0);
                kitchenDeliveryMesh.position.set(0, 0.58, -6.2);
                kitchenTrashMesh.position.set(0, 0.52, 6.2);
            } else {
                kitchenTableMesh.position.set(0, 0, 0);
                kitchenPlateMesh.position.set(0, 1.15, 0);
                plateCubesGroup.position.set(0, 1.35, 0);
                kitchenDeliveryMesh.position.set(0, 0.58, -5.2);
                kitchenTrashMesh.position.set(0, 0.52, 5.2);
            }
            const dSt = interactableStations.find(s => s.stationType === 'deliver');
            if (dSt) dSt.position.copy(kitchenDeliveryMesh.position);
            const tSt = interactableStations.find(s => s.stationType === 'clear');
            if (tSt) tSt.position.copy(kitchenTrashMesh.position);
        }

        function clearKitchenExtras() {
            while (kitchenExtrasGroup.children.length > 0) {
                const child = kitchenExtrasGroup.children[0];
                kitchenExtrasGroup.remove(child);
                child.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                });
            }
            kitchenBlockers.length = 0;
            kitchenSurfaces.length = 0;
            kitchenCrowd = null;
            kitchenSliderObstacle = null;
        }

        function addKitchenBlocker(x, z, w, h, d, color, opts = {}) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 })
            );
            mesh.position.set(x, h / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            kitchenExtrasGroup.add(mesh);
            const blocker = {
                mesh, cx: x, cz: z, hw: w / 2, hd: d / 2,
                moving: !!opts.moving, baseX: x, baseZ: z,
                axis: opts.axis || 'x', amp: opts.amp || 0, speed: opts.speed || 1, phase: opts.phase || 0
            };
            kitchenBlockers.push(blocker);
            return blocker;
        }

        function addKitchenSurface(type, x, z, radius) {
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            let topY = 0.1;
            if (type === 'water') {
                const puddle = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius, radius, 0.06, 28),
                    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, emissive: 0x0284c7, emissiveIntensity: 0.25, roughness: 0.1 })
                );
                puddle.position.y = topY;
                group.add(puddle);
            } else if (type === 'ice') {
                const ice = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius, radius, 0.08, 24),
                    new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.65, emissive: 0x7dd3fc, emissiveIntensity: 0.35, roughness: 0.05 })
                );
                ice.position.y = topY;
                group.add(ice);
            } else if (type === 'fire') {
                const pit = new THREE.Mesh(
                    new THREE.CylinderGeometry(radius * 0.85, radius, 0.14, 20),
                    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 })
                );
                pit.position.y = 0.07;
                group.add(pit);
                for (let f = 0; f < 4; f++) {
                    const flame = new THREE.Mesh(
                        new THREE.ConeGeometry(radius * 0.4, radius * 1.3, 8),
                        new THREE.MeshStandardMaterial({ color: f % 2 === 0 ? 0xf97316 : 0xfacc15, emissive: 0xef4444, emissiveIntensity: 1.1, transparent: true, opacity: 0.9 })
                    );
                    const ang = (f / 4) * Math.PI * 2;
                    flame.position.set(Math.cos(ang) * radius * 0.35, radius * 0.7, Math.sin(ang) * radius * 0.35);
                    flame.userData.spin = ang;
                    group.add(flame);
                }
            }
            kitchenExtrasGroup.add(group);
            kitchenSurfaces.push({ type, mesh: group, x, z, radius });
        }

        function buildKitchenObstacles(diff, occupied) {
            if (diff === 'normal') {
                const regs = [{ minX: -8.6, maxX: 8.6, minZ: -5.9, maxZ: 5.9 }];
                const defs = [
                    { kind: 'surface', type: 'water', radius: 1.3, occ: 1.9 },
                    { kind: 'surface', type: 'ice', radius: 1.3, occ: 1.9 },
                    { kind: 'surface', type: 'fire', radius: 1.0, occ: 1.6 },
                    { kind: 'blocker', w: 1.7, d: 1.7, occ: 1.5 },
                    { kind: 'blocker', w: 1.7, d: 1.7, occ: 1.5 }
                ];
                defs.forEach(def => {
                    const s = pickKitchenSpot(regs, occupied, def.occ);
                    occupied.push({ x: s.x, z: s.z, r: def.occ });
                    if (def.kind === 'surface') addKitchenSurface(def.type, s.x, s.z, def.radius);
                    else addKitchenBlocker(s.x, s.z, def.w, 1.05, def.d, 0xb45309);
                });
                const sp = pickKitchenSpot(regs, occupied, 1.2);
                kitchenSliderObstacle = addKitchenBlocker(sp.x, sp.z, 1.2, 1, 1.2, 0x0ea5e9, {
                    moving: true,
                    axis: Math.random() < 0.5 ? 'x' : 'z',
                    amp: 2.2,
                    speed: 1.1,
                    phase: Math.random() * Math.PI * 2
                });
                occupied.push({ x: sp.x, z: sp.z, r: 1.4 });
            } else if (diff === 'hard') {
                // Fixed dividing walls with a central bridge gap
                addKitchenBlocker(-1, -5, 0.4, 3.2, 6.4, 0x8a5a2b);
                addKitchenBlocker(-1, 5, 0.4, 3.2, 6.4, 0x8a5a2b);
                addKitchenBlocker(1, -5, 0.4, 3.2, 6.4, 0x8a5a2b);
                addKitchenBlocker(1, 5, 0.4, 3.2, 6.4, 0x8a5a2b);

                const leftBands = [
                    { minX: -10.4, maxX: -2.6, minZ: -7.8, maxZ: -2.6 },
                    { minX: -10.4, maxX: -2.6, minZ: 2.6, maxZ: 7.8 }
                ];
                const rightBands = [
                    { minX: 2.6, maxX: 10.4, minZ: -7.8, maxZ: -2.6 },
                    { minX: 2.6, maxX: 10.4, minZ: 2.6, maxZ: 7.8 }
                ];
                const defs = [
                    { kind: 'surface', type: 'water', radius: 1.5, occ: 2.0, regs: rightBands },
                    { kind: 'surface', type: 'ice', radius: 1.5, occ: 2.0, regs: leftBands },
                    { kind: 'surface', type: 'fire', radius: 1.0, occ: 1.6, regs: (Math.random() < 0.5 ? leftBands : rightBands) },
                    { kind: 'blocker', w: 1.6, d: 1.6, occ: 1.5, regs: leftBands },
                    { kind: 'blocker', w: 1.6, d: 1.6, occ: 1.5, regs: rightBands }
                ];
                defs.forEach(def => {
                    const s = pickKitchenSpot(def.regs, occupied, def.occ);
                    occupied.push({ x: s.x, z: s.z, r: def.occ });
                    if (def.kind === 'surface') addKitchenSurface(def.type, s.x, s.z, def.radius);
                    else addKitchenBlocker(s.x, s.z, def.w, 1.05, def.d, 0xb45309);
                });

            }
        }

        function positionKitchenArena(diff) {
            const m = KITCHEN_WALK[diff] || KITCHEN_WALK.easy;
            const hx = m.halfX + 0.7;
            const hz = m.halfZ + 0.7;
            const w = kitchenArenaWalls;
            if (w.back) { w.back.scale.x = hx * 2; w.back.position.set(0, 2.5, -hz); }
            if (w.left) { w.left.scale.z = hz * 2; w.left.position.set(-hx, 2.5, 0); }
            if (w.right) { w.right.scale.z = hz * 2; w.right.position.set(hx, 2.5, 0); }
            (w.windows || []).forEach((win, idx) => {
                win.position.set((idx - 2) * hx * 0.42, 2.9, -hz + 0.2);
            });
            (w.lamps || []).forEach((entry, idx) => {
                const lx = (idx - 2) * hx * 0.42;
                entry.lamp.position.set(lx, 4.3, -hz + 1.5);
                entry.bulb.position.set(lx, 3.95, -hz + 1.5);
            });
        }

        function applyKitchenDifficulty(diff) {
            kitchenDifficulty = diff;
            clearKitchenExtras();
            positionKitchenArena(diff);
            layoutKitchenStations(diff);

            const occupied = [];
            if (kitchenTableMesh) occupied.push({ x: kitchenTableMesh.position.x, z: kitchenTableMesh.position.z, r: 2.4 });
            if (kitchenDeliveryMesh) occupied.push({ x: kitchenDeliveryMesh.position.x, z: kitchenDeliveryMesh.position.z, r: 2.6 });
            if (kitchenTrashMesh) occupied.push({ x: kitchenTrashMesh.position.x, z: kitchenTrashMesh.position.z, r: 2.0 });
            const startX = diff === 'hard' ? 5 : 0;
            const startZ = diff === 'hard' ? 1.5 : 2.6;
            occupied.push({ x: startX, z: startZ, r: 1.7 });

            const cratePositions = generateKitchenCrates(diff, occupied);
            layoutKitchenCrates(cratePositions);
            buildKitchenObstacles(diff, occupied);

            setCrowdWarning(false);
            if (diff === 'hard') {
                kitchenCrowd = { phase: 'idle', timer: randRange(7, 15), people: [], dir: 1, warnTimer: 0 };
            } else {
                kitchenCrowd = null;
            }

            updateKitchenDifficultyButtons();

            chefVel.set(0, 0, 0);
            confuseTimer = 0;
            if (chefMesh) {
                chefMesh.position.set(startX, 0, startZ);
            }

            if (diff === 'hard') {
                camTargetPos.set(0, 24, 22.5);
                camLookAtPos.set(0, 0.2, 0);
            } else if (diff === 'normal') {
                camTargetPos.set(0, 20, 19.5);
                camLookAtPos.set(0, 0.2, 0.4);
            } else {
                camTargetPos.set(0, 14.5, 14.2);
                camLookAtPos.set(0, 0.2, 0.4);
            }
        }

        function setKitchenDifficulty(diff) {
            if (currentMode !== 'overcooked') {
                kitchenDifficulty = diff;
                updateKitchenDifficultyButtons();
                return;
            }
            playSFX('pickup');
            applyKitchenDifficulty(diff);
            startKitchenRun();
        }

        function triggerConfuse() {
            confuseTimer = 2.0;
            confuseFlip = 0;
            const a = Math.random() * Math.PI * 2;
            confuseDir.set(Math.cos(a), 0, Math.sin(a));
        }

        function triggerGangnamStyle() {
            if (currentMode === 'millonario' || currentMode === 'duelo') {
                if (millGameOver || duelGameOver || awaitingStart) return;
                gangnamTimer = 4.5;
                playSFX('success');
                return;
            }
            if ((currentMode !== 'overcooked' && currentMode !== 'hub') || kitchenGameOver || awaitingStart) return;
            gangnamTimer = 4.5;
            playSFX('success');
        }

        function isKitchenWalkable(x, z) {
            const m = KITCHEN_WALK[kitchenDifficulty] || KITCHEN_WALK.easy;
            if (kitchenDifficulty !== 'hard') {
                return x >= -m.halfX && x <= m.halfX && z >= -m.halfZ && z <= m.halfZ;
            }
            const inLeft = x >= -m.halfX && x <= -1.2 && z >= -m.halfZ && z <= m.halfZ;
            const inRight = x >= 1.2 && x <= m.halfX && z >= -m.halfZ && z <= m.halfZ;
            const inBridge = x > -1.3 && x < 1.3 && z >= -1.9 && z <= 1.9;
            return inLeft || inRight || inBridge;
        }

        function kitchenBlockedAt(x, z) {
            if (!isKitchenWalkable(x, z)) return true;
            for (const b of kitchenBlockers) {
                if (x > b.cx - b.hw - CHEF_RADIUS && x < b.cx + b.hw + CHEF_RADIUS &&
                    z > b.cz - b.hd - CHEF_RADIUS && z < b.cz + b.hd + CHEF_RADIUS) {
                    return true;
                }
            }
            // Solid kitchen furniture: tables, crates, delivery & trash counters
            if (kitchenTableMesh) {
                const t = kitchenTableMesh.position;
                if (Math.abs(x - t.x) < 1.8 + CHEF_RADIUS && Math.abs(z - t.z) < 1.2 + CHEF_RADIUS) return true;
            }
            for (const c of kitchenCrates) {
                const p = c.group.position;
                if (Math.abs(x - p.x) < 0.85 + CHEF_RADIUS && Math.abs(z - p.z) < 0.85 + CHEF_RADIUS) return true;
            }
            if (kitchenDeliveryMesh) {
                const d = kitchenDeliveryMesh.position;
                if (Math.abs(x - d.x) < 2.2 + CHEF_RADIUS && Math.abs(z - d.z) < 0.75 + CHEF_RADIUS) return true;
            }
            if (kitchenTrashMesh) {
                const d = kitchenTrashMesh.position;
                if (Math.abs(x - d.x) < 1.3 + CHEF_RADIUS && Math.abs(z - d.z) < 0.7 + CHEF_RADIUS) return true;
            }
            // Crossing crowd blocks passage through the central bridge
            if (kitchenCrowd && kitchenCrowd.phase === 'crossing') {
                for (const p of kitchenCrowd.people) {
                    const px = p.mesh.position.x, pz = p.mesh.position.z;
                    if (Math.abs(x - px) < 0.85 + CHEF_RADIUS && Math.abs(z - pz) < 0.85 + CHEF_RADIUS) return true;
                }
            }
            return false;
        }

        function placeChefNear(tx, tz) {
            if (!chefMesh) return;
            const off = 1.7;
            const candidates = [
                [tx, tz + off], [tx, tz - off], [tx + off, tz], [tx - off, tz],
                [tx + off, tz + off], [tx - off, tz + off],
                [tx + off, tz - off], [tx - off, tz - off],
                [tx, tz + off * 2], [tx, tz - off * 2]
            ];
            for (const [cx, cz] of candidates) {
                if (!kitchenBlockedAt(cx, cz)) {
                    chefMesh.position.set(cx, 0, cz);
                    chefVel.set(0, 0, 0);
                    return;
                }
            }
            chefMesh.position.set(tx, 0, tz);
            chefVel.set(0, 0, 0);
        }

        function updateKitchenSurfaceFlags(x, z) {
            kitchenOnWater = false;
            kitchenOnIce = false;
            for (const s of kitchenSurfaces) {
                const d = Math.hypot(x - s.x, z - s.z);
                if (d <= s.radius) {
                    if (s.type === 'water') kitchenOnWater = true;
                    else if (s.type === 'ice') kitchenOnIce = true;
                    else if (s.type === 'fire' && confuseTimer <= 0) triggerConfuse();
                }
            }
        }

        function updateKitchenHazards(dt, elapsed) {
            // Animate surfaces (fire flicker)
            kitchenSurfaces.forEach((s, si) => {
                if (s.type === 'fire') {
                    s.mesh.children.forEach((c, ci) => {
                        if (c.userData && c.userData.spin !== undefined) {
                            c.scale.y = 1 + Math.sin(elapsed * 9 + ci + si) * 0.25;
                            c.rotation.y = elapsed * 3 + ci;
                        }
                    });
                }
            });

            // Moving blockers (distracciones) follow their motion
            kitchenBlockers.forEach(b => {
                if (!b.moving) return;
                const off = Math.sin(elapsed * b.speed + b.phase) * b.amp;
                if (b.axis === 'z') {
                    b.cz = b.baseZ + off;
                    b.mesh.position.z = b.cz;
                } else {
                    b.cx = b.baseX + off;
                    b.mesh.position.x = b.cx;
                }
            });

            // Las mesas/estaciones quedan fijas: solo se mueven las distracciones.

            // Random crowd crossing through the central bridge (hard only)
            if (!kitchenGameOver) updateKitchenCrowd(dt, elapsed);
        }

        function updateKitchenCrowd(dt, elapsed) {
            const c = kitchenCrowd;
            if (!c) return;

            if (c.phase === 'idle') {
                c.timer -= dt;
                if (c.timer <= 0) startCrowdWarning();
                return;
            }

            if (c.phase === 'warning') {
                c.warnTimer -= dt;
                const left = Math.max(0, Math.ceil(c.warnTimer));
                setCrowdWarning(true, '¡ATENCIÓN! VA A PASAR GENTE (' + left + ')');
                if (c.warnTimer <= 0) startCrowdCrossing();
                return;
            }

            if (c.phase === 'crossing') {
                const m = KITCHEN_WALK.hard;
                const limit = m.halfZ + 2.5;
                let allGone = true;
                c.people.forEach((p) => {
                    p.mesh.position.z += c.dir * p.speed * dt;
                    p.mesh.position.y = p.baseY + Math.abs(Math.sin(elapsed * 8 + p.phase)) * 0.12;
                    p.mesh.rotation.y = elapsed * 6 + p.phase;
                    const ud = p.mesh.userData;
                    if (ud.armL) {
                        const sw = Math.sin(elapsed * 8 + p.phase) * 0.7;
                        ud.armL.rotation.x = sw;
                        ud.armR.rotation.x = -sw;
                        ud.legL.rotation.x = -sw * 0.6;
                        ud.legR.rotation.x = sw * 0.6;
                    }
                    if (Math.abs(p.mesh.position.z) < limit) allGone = false;
                });
                if (allGone) {
                    clearCrowdPeople();
                    c.phase = 'idle';
                    c.timer = randRange(13, 24);
                }
            }
        }

        function makeCrowdPerson(i) {
            const group = new THREE.Group();
            const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7, 0x14b8a6, 0xec4899, 0x6366f1];
            const bodyMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6 });
            const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.5 });
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.0, 12), bodyMat);
            body.position.y = 0.9;
            body.castShadow = true;
            group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), headMat);
            head.position.y = 1.65;
            head.castShadow = true;
            group.add(head);
            const armL = createNpcArm(-1, colors[i % colors.length], 0xfcd34d);
            const armR = createNpcArm(1, colors[i % colors.length], 0xfcd34d);
            armL.position.set(-0.38, 1.32, 0);
            armR.position.set(0.38, 1.32, 0);
            armL.scale.set(0.85, 0.85, 0.85);
            armR.scale.set(0.85, 0.85, 0.85);
            group.add(armL); group.add(armR);
            const legL = createNpcLeg(-1, 0x334155, 0x1e293b);
            const legR = createNpcLeg(1, 0x334155, 0x1e293b);
            group.add(legL); group.add(legR);
            group.userData.armL = armL;
            group.userData.armR = armR;
            group.userData.legL = legL;
            group.userData.legR = legR;
            return group;
        }

        function startCrowdWarning() {
            const c = kitchenCrowd;
            if (!c) return;
            c.phase = 'warning';
            c.warnTimer = CROWD_WARN_TIME;
            c.dir = 1;
            setCrowdWarning(true, '¡ATENCIÓN! VA A PASAR GENTE');
            playSFX('error');
        }

        function startCrowdCrossing() {
            const c = kitchenCrowd;
            if (!c) return;
            clearCrowdPeople();
            c.phase = 'crossing';
            setCrowdWarning(false);
            const m = KITCHEN_WALK.hard;
            const startZ = -m.halfZ - 1.5;
            const count = 10;
            for (let i = 0; i < count; i++) {
                const person = makeCrowdPerson(i);
                person.position.set(randRange(-0.45, 0.45), 0, startZ - c.dir * i * 1.3);
                kitchenExtrasGroup.add(person);
                c.people.push({
                    mesh: person,
                    speed: randRange(CROWD_SPEED_MIN, CROWD_SPEED_MAX),
                    phase: Math.random() * Math.PI * 2,
                    baseY: 0
                });
            }
        }

        function clearCrowdPeople() {
            const c = kitchenCrowd;
            if (!c) return;
            c.people.forEach(p => {
                kitchenExtrasGroup.remove(p.mesh);
                p.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
            });
            c.people = [];
        }

        function setCrowdWarning(show, text) {
            const el = document.getElementById('crowd-warning');
            if (!el) return;
            const txt = document.getElementById('crowd-warning-text');
            if (txt && text) txt.textContent = text;
            if (show) { el.classList.remove('hidden'); el.classList.add('flex'); }
            else { el.classList.add('hidden'); el.classList.remove('flex'); }
        }

        function updateChefMovement(dt, elapsed) {
            // Durante el baile Gangnam Style el chef se queda quieto, pero moverse lo cancela
            if (gangnamTimer > 0) {
                if (chefKeys.w || chefKeys.a || chefKeys.s || chefKeys.d || mobileInputActive()) {
                    gangnamTimer = 0;
                } else {
                    chefVel.set(0, 0, 0);
                    return;
                }
            }
            const moveIn = readChefInput();
            const inputX = moveIn.x;
            const inputZ = moveIn.z;
            const hasInput = (inputX !== 0 || inputZ !== 0);

            let dirX = inputX, dirZ = inputZ;

            if (confuseTimer > 0) {
                confuseTimer -= dt;
                confuseFlip -= dt;
                if (confuseFlip <= 0) {
                    confuseFlip = 0.35;
                    const a = Math.random() * Math.PI * 2;
                    confuseDir.set(Math.cos(a), 0, Math.sin(a));
                }
                dirX = confuseDir.x;
                dirZ = confuseDir.z;
            }

            const dirLen = Math.hypot(dirX, dirZ);
            if (dirLen > 0.001) {
                dirX /= dirLen; dirZ /= dirLen;
            }

            const maxSpeed = 8.2 * (kitchenOnIce ? 0.5 : 1);
            const accel = 55;
            chefVel.x += dirX * accel * dt;
            chefVel.z += dirZ * accel * dt;

            const spd = Math.hypot(chefVel.x, chefVel.z);
            if (spd > maxSpeed) {
                chefVel.x = (chefVel.x / spd) * maxSpeed;
                chefVel.z = (chefVel.z / spd) * maxSpeed;
            }

            const friction = kitchenOnWater ? 1.2 : (confuseTimer > 0 ? 2.5 : 6);
            const decay = Math.max(0, 1 - friction * dt);
            chefVel.x *= decay;
            chefVel.z *= decay;

            const nx = chefMesh.position.x + chefVel.x * dt;
            if (!kitchenBlockedAt(nx, chefMesh.position.z)) {
                chefMesh.position.x = nx;
            } else {
                chefVel.x = 0;
            }
            const nz = chefMesh.position.z + chefVel.z * dt;
            if (!kitchenBlockedAt(chefMesh.position.x, nz)) {
                chefMesh.position.z = nz;
            } else {
                chefVel.z = 0;
            }

            updateKitchenSurfaceFlags(chefMesh.position.x, chefMesh.position.z);

            if (dirLen > 0.001 || spd > 0.4) {
                chefMesh.rotation.y = Math.atan2(chefVel.x, chefVel.z);
            }
        }

        function animateChef(dt, elapsed) {
            if (!chefParts) return;

            // ---- Gangnam Style dance ----
            if (gangnamTimer > 0) {
                gangnamTimer -= dt;
                const t = elapsed;

                // Rebote del "caballo"
                if (chefMesh) chefMesh.position.y = Math.abs(Math.sin(t * 8)) * 0.16;

                // Piernas abiertas galopando
                const gallop = Math.sin(t * 8);
                chefParts.legL.rotation.x = gallop * 0.6;
                chefParts.legR.rotation.x = -gallop * 0.6;
                chefParts.legL.rotation.z = 0.3;
                chefParts.legR.rotation.z = -0.3;

                // Balanceo del cuerpo y de la cabeza
                chefParts.chefUpper.position.y = 0;
                chefParts.chefUpper.rotation.z = Math.sin(t * 4) * 0.14;
                chefParts.chefUpper.rotation.y = Math.sin(t * 2.2) * 0.35;

                // Dos poses que se alternan
                const pose = Math.floor((t % 2.6) / 1.3);
                if (pose === 0) {
                    // Pose "riendas": brazos cruzados delante
                    chefParts.armL.rotation.x = -1.5;
                    chefParts.armR.rotation.x = -1.5;
                    chefParts.armL.rotation.z = 0.85;
                    chefParts.armR.rotation.z = -0.85;
                    chefParts.armL.rotation.y = 0.2;
                    chefParts.armR.rotation.y = -0.2;
                } else {
                    // Pose "lazo": brazo derecho girando arriba, izquierda en la cadera
                    chefParts.armR.rotation.x = -2.1 + Math.sin(t * 8) * 0.3;
                    chefParts.armR.rotation.z = -0.6 + Math.cos(t * 8) * 0.6;
                    chefParts.armR.rotation.y = Math.sin(t * 8) * 0.5;
                    chefParts.armL.rotation.x = -0.6;
                    chefParts.armL.rotation.z = 0.95;
                    chefParts.armL.rotation.y = 0;
                }

                // Bounce the special-skin figure along with the dance
                if (chefActiveSpecial && chefSpecialFigures[chefActiveSpecial]) {
                    const f = chefSpecialFigures[chefActiveSpecial];
                    const g = Math.sin(t * 8);
                    f.legL.rotation.x = g * 0.6;
                    f.legR.rotation.x = -g * 0.6;
                    if (f.armL && f.armR) {
                        f.armL.rotation.x = -1.2 + g * 0.25;
                        f.armR.rotation.x = -1.2 - g * 0.25;
                        f.armL.rotation.z = 0.7;
                        f.armR.rotation.z = -0.7;
                    }
                    f.body.rotation.z = Math.sin(t * 4) * 0.14;
                    f.body.position.y = Math.abs(g) * 0.08;
                }
                return;
            }

            // ---- Reposo / caminar: restaurar pose base ----
            if (chefMesh) chefMesh.position.y = 0;
            chefParts.armL.rotation.z = -0.12;
            chefParts.armR.rotation.z = 0.12;
            chefParts.armL.rotation.y = 0;
            chefParts.armR.rotation.y = 0;
            chefParts.legL.rotation.z = 0;
            chefParts.legR.rotation.z = 0;
            chefParts.chefUpper.rotation.y = 0;

            const speed = Math.hypot(chefVel.x, chefVel.z);
            const norm = Math.min(speed / 8.2, 1);

            chefWalkPhase += speed * dt * 2.4;

            const swing = Math.sin(chefWalkPhase) * 0.85 * norm;
            chefParts.legL.rotation.x = swing;
            chefParts.legR.rotation.x = -swing;
            chefParts.armL.rotation.x = -swing * 0.9;
            chefParts.armR.rotation.x = swing * 0.9;

            const stepBob = Math.abs(Math.sin(chefWalkPhase)) * 0.06 * norm;
            const breathe = Math.sin(elapsed * 2.2) * 0.015;
            chefParts.chefUpper.position.y = stepBob + breathe;
            chefParts.chefUpper.rotation.z = Math.sin(chefWalkPhase) * 0.04 * norm;

            if (confuseTimer > 0) {
                chefParts.chefUpper.rotation.z = Math.sin(elapsed * 26) * 0.18;
                chefParts.armL.rotation.x = 0.9;
                chefParts.armR.rotation.x = 0.9;
            }

            // Special animal/character skins: own legs and a bouncy body
            if (chefActiveSpecial && chefSpecialFigures[chefActiveSpecial]) {
                const f = chefSpecialFigures[chefActiveSpecial];
                const swing67 = Math.sin(chefWalkPhase) * 0.7 * norm;
                f.legL.rotation.x = swing67;
                f.legR.rotation.x = -swing67;
                if (f.armL && f.armR) {
                    f.armL.rotation.x = -swing67 * 0.8;
                    f.armR.rotation.x = swing67 * 0.8;
                    f.armL.rotation.z = f.armL.userData.baseZ ?? f.armL.rotation.z;
                    f.armR.rotation.z = f.armR.userData.baseZ ?? f.armR.rotation.z;
                }
                f.body.position.y = Math.abs(Math.sin(chefWalkPhase)) * 0.08 * norm;
                f.body.rotation.z = Math.sin(chefWalkPhase) * 0.05 * norm;
                f.group.position.y = Math.abs(Math.sin(chefWalkPhase)) * 0.04 * norm;
            }
        }

        function updateChefProximityHighlight(elapsed) {
            if (!chefMesh || currentMode !== 'overcooked') {
                if (proximityRingMesh) proximityRingMesh.visible = false;
                if (proximityPromptLabel) proximityPromptLabel.div.style.display = 'none';
                return;
            }

            let bestStation = null;
            let bestDist = INTERACT_RADIUS;

            interactableStations.forEach(st => {
                st.mesh.material.emissiveIntensity = st.stationType === 'crate' ? 0.0 : 0.25;
                const dx = chefMesh.position.x - st.position.x;
                const dz = chefMesh.position.z - st.position.z;
                const dist = Math.hypot(dx, dz);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestStation = st;
                }
            });

            nearestStation = bestStation;
            const eBtn = document.getElementById('btn-interact-e');

            if (nearestStation) {
                nearestStation.mesh.material.emissive.setHex(0xfacc15);
                nearestStation.mesh.material.emissiveIntensity = 0.45 + Math.sin(elapsed * 8) * 0.2;

                proximityRingMesh.visible = true;
                proximityRingMesh.position.set(nearestStation.position.x, 0.06, nearestStation.position.z);
                const pulseScale = 1 + Math.sin(elapsed * 6) * 0.08;
                proximityRingMesh.scale.set(pulseScale, pulseScale, 1);

                const badgeEl = document.getElementById('proximity-e-badge');
                if (badgeEl) badgeEl.textContent = nearestStation.promptText();
                if (eBtn) {
                    eBtn.textContent = nearestStation.promptText();
                    eBtn.className = 'px-2.5 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold mono-font text-[11px] transition shadow';
                }
            } else {
                proximityRingMesh.visible = false;
                if (proximityPromptLabel) proximityPromptLabel.div.style.display = 'none';
                if (eBtn) {
                    eBtn.textContent = 'Acércate con WASD y pulsa [E]';
                    eBtn.className = 'px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold mono-font text-[11px] transition';
                }
            }
        }

        function interactWithNearestStation() {
            if (currentMode !== 'overcooked') return;
            if (!nearestStation) {
                recordOutcome(0, false, 'Acércate más a una estación con WASD antes de pulsar [E].');
                return;
            }
            if (nearestStation.stationType === 'crate') {
                toggleKitchenElement(nearestStation.elementId);
            } else if (nearestStation.stationType === 'deliver') {
                deliverKitchenOrder();
            } else if (nearestStation.stationType === 'clear') {
                clearKitchenPlate();
            }
        }

        function generateRandomSubset(minSize = 2, maxSize = 4) {
            const pool = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
            const count = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
            return pool.slice(0, count).sort((a, b) => a - b);
        }

        function generateKitchenOrder() {
            const U = [1, 2, 3, 4, 5, 6];
            const A = generateRandomSubset(2, 4);
            const B = generateRandomSubset(2, 4);

            const operations = [
                { op: 'UNION', title: 'A ∪ B', desc: 'Unión: Elementos de A o de B.', expected: Array.from(new Set([...A, ...B])).sort((a, b) => a - b) },
                { op: 'INTERSECT', title: 'A ∩ B', desc: 'Intersección: Elementos en A y B.', expected: A.filter(x => B.includes(x)).sort((a, b) => a - b) },
                { op: 'DIFF_AB', title: 'A - B', desc: 'Diferencia: Elementos de A exclusivos.', expected: A.filter(x => !B.includes(x)).sort((a, b) => a - b) },
                { op: 'SYM_DIFF', title: 'A Δ B', desc: 'Diferencia Simétrica: No comunes.', expected: [...A.filter(x => !B.includes(x)), ...B.filter(x => !A.includes(x))].sort((a, b) => a - b) },
                { op: 'COMP_UNION', title: "(A ∪ B)'", desc: 'Complemento de la Unión en U={1..6}.', expected: U.filter(x => !A.includes(x) && !B.includes(x)).sort((a, b) => a - b) }
            ];

            const chosen = operations[Math.floor(Math.random() * operations.length)];
            activeKitchenOrder = { A, B, U, ...chosen };

            document.getElementById('static-mode-badge').textContent = 'COCINA 3D • CONJUNTOS';
            document.getElementById('mission-tag').textContent = 'PEDIDO DE COCINA';
            document.getElementById('mission-subtitle-label').textContent = 'ENTREGAR CONJUNTO SOLUCIÓN';
            document.getElementById('mission-title').className = 'text-2xl sm:text-3xl font-extrabold text-amber-300 mono-font tracking-tight leading-tight';
            document.getElementById('mission-title').textContent = chosen.title;
            document.getElementById('mission-desc').textContent = chosen.desc;
            document.getElementById('mission-context').innerHTML = `
                <span class="text-slate-400 text-xs">U={1..6}</span>
                <span class="text-amber-300 font-extrabold">A={${A.join(', ')}}</span>
                <span class="text-cyan-300 font-extrabold">B={${B.join(', ')}}</span>
            `;

            clearKitchenPlate(true);
        }

        function refresh3DPlateVisuals() {
            while (plateCubesGroup.children.length > 0) {
                plateCubesGroup.remove(plateCubesGroup.children[0]);
            }
            if (chefCarryGroup) {
                while (chefCarryGroup.children.length > 0) {
                    chefCarryGroup.remove(chefCarryGroup.children[0]);
                }
            }

            const arr = Array.from(kitchenPlateSet).sort((a, b) => a - b);
            arr.forEach((id, idx) => {
                const angle = (idx / Math.max(1, arr.length)) * Math.PI * 2;
                const radius = arr.length === 1 ? 0 : 0.48;
                const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.38, 0.38, 0.38),
                    new THREE.MeshStandardMaterial({ color: INGREDIENT_COLORS[id].hex, emissive: INGREDIENT_COLORS[id].hex, emissiveIntensity: 0.35 })
                );
                cube.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
                plateCubesGroup.add(cube);

                if (chefCarryGroup) {
                    const mini = cube.clone();
                    mini.scale.set(0.55, 0.55, 0.55);
                    mini.position.set((idx - (arr.length - 1) / 2) * 0.25, 0, 0);
                    chefCarryGroup.add(mini);
                }
            });

            const setLabel = arr.length === 0 ? '{ ∅ }' : `{ ${arr.join(', ')} }`;
            document.getElementById('hud-plate-set').textContent = setLabel;
        }

        function toggleKitchenElement(id) {
            playSFX('pickup');
            if (kitchenPlateSet.has(id)) {
                kitchenPlateSet.delete(id);
            } else {
                kitchenPlateSet.add(id);
            }
            refresh3DPlateVisuals();
        }

        function clearKitchenPlate(silent = false) {
            if (!silent) playSFX('pickup');
            kitchenPlateSet.clear();
            refresh3DPlateVisuals();
        }

        function deliverKitchenOrder() {
            if (!activeKitchenOrder) return;
            const userArr = Array.from(kitchenPlateSet).sort((a, b) => a - b);
            const expArr = activeKitchenOrder.expected;
            const isEqual = userArr.length === expArr.length && userArr.every((v, i) => v === expArr[i]);
            const expStr = expArr.length === 0 ? '∅' : `{${expArr.join(',')}}`;
            const usrStr = userArr.length === 0 ? '∅' : `{${userArr.join(',')}}`;

            if (isEqual) {
                recordOutcome(45, true, `¡Pedido perfecto! ${activeKitchenOrder.title} = ${expStr}.`);
                generateKitchenOrder();
            } else {
                recordOutcome(0, false, `Plato incorrecto: entregaste ${usrStr}, se requería ${expStr}.`);
            }
        }

        const aimField = [];
        let activeAimChallenge = null;
        const AIM_FIELD_SIZES = { easy: 7, normal: 10, hard: 13 };
        function aimFieldSize() { return AIM_FIELD_SIZES[aimDifficulty] || 10; }
        const AIM_BOUNDS = { minX: -9, maxX: 9, minY: 1.9, maxY: 7.2, minZ: -8.5, maxZ: -0.6 };
        // Zona del HUD de misiones (arriba a la derecha): las bolas no pueden pasar por ahi
        const AIM_HUD_ZONE = { minX: 1.5, minY: 4.0 };
        const AIM_PALETTE = [0xf59e0b, 0x38bdf8, 0xa855f7, 0x22d3ee, 0xf472b6, 0x84cc16, 0xfb923c, 0x818cf8];

        // Reusable pool of logical classifications. Every option is a plausible
        // answer, so distractors stay logical and can be made unique per board.
        const AIM_ANSWER_POOL = [
            'Conjunción (p ∧ q)',
            'Disyunción Inclusiva (p ∨ q)',
            'Disyunción Exclusiva (p ⊕ q)',
            'Condicional / Implicación (p → q)',
            'Bicondicional (p ↔ q)',
            'Negación (¬p)',
            'Tautología (Siempre Verdadera)',
            'Contradicción (Siempre Falsa)',
            'Contingencia Lógica',
            'Conjuntos Disjuntos (A ∩ B = ∅)',
            'Conjuntos Iguales (A = B)',
            'Conjunto Potencia P(A)',
            'Diferencia de Conjuntos (A − B)',
            'Unión de Conjuntos (A ∪ B)',
            'Intersección de Conjuntos (A ∩ B)',
            'Complemento (Aᶜ)',
            'Subconjunto (A ⊆ B)',
            'Idempotencia (p ∧ p ≡ p)',
            'Ley de De Morgan',
            'Modus Ponens',
            'Modus Tollens',
            'Doble Negación (¬¬p ≡ p)',
            'Ley Conmutativa (p ∧ q ≡ q ∧ p)',
            'Ley Asociativa (p ∨ (q ∨ r) ≡ (p ∨ q) ∨ r)',
            'Ley Distributiva',
            'Contraposición (p → q ≡ ¬q → ¬p)',
            'Ley de Absorción',
            'Silogismo Hipotético',
            'Conjunto Universal (U)',
            'Conjunto Vacío (∅)',
            'Cardinalidad |A|',
            'Producto Cartesiano (A × B)'
        ];

        const AIM_PROPOSITION_BANK = [
            // ===== FÁCIL: identificar el operador / la operación =====
            { level: 'easy', formula: 'p ∧ q', category: 'CONJUNCIÓN LÓGICA', hint: 'Dispara a la bolita que clasifica "p ∧ q".', correctLabel: 'Conjunción (p ∧ q)' },
            { level: 'easy', formula: 'p ∨ q', category: 'DISYUNCIÓN INCLUSIVA', hint: 'Verdadera si al menos una de las dos es verdadera.', correctLabel: 'Disyunción Inclusiva (p ∨ q)' },
            { level: 'easy', formula: 'p ⊕ q', category: 'DISYUNCIÓN EXCLUSIVA', hint: 'Verdadera solo si exactamente una es verdadera.', correctLabel: 'Disyunción Exclusiva (p ⊕ q)' },
            { level: 'easy', formula: 'p → q', category: 'CONDICIONAL', hint: 'Falsa únicamente si p es V y q es F.', correctLabel: 'Condicional / Implicación (p → q)' },
            { level: 'easy', formula: 'p ↔ q', category: 'BICONDICIONAL', hint: 'Verdadera cuando p y q tienen el mismo valor.', correctLabel: 'Bicondicional (p ↔ q)' },
            { level: 'easy', formula: '¬p', category: 'NEGACIÓN', hint: 'Invierte el valor de verdad de la proposición.', correctLabel: 'Negación (¬p)' },
            { level: 'easy', formula: 'A ∪ B', category: 'OPERACIÓN DE CONJUNTOS', hint: 'Elementos que pertenecen a A, a B o a ambos.', correctLabel: 'Unión de Conjuntos (A ∪ B)' },
            { level: 'easy', formula: 'A ∩ B', category: 'OPERACIÓN DE CONJUNTOS', hint: 'Elementos comunes a A y a B.', correctLabel: 'Intersección de Conjuntos (A ∩ B)' },
            { level: 'easy', formula: 'A − B', category: 'OPERACIÓN DE CONJUNTOS', hint: 'Elementos de A que no están en B.', correctLabel: 'Diferencia de Conjuntos (A − B)' },
            { level: 'easy', formula: 'Aᶜ', category: 'OPERACIÓN DE CONJUNTOS', hint: 'Elementos del universo que no pertenecen a A.', correctLabel: 'Complemento (Aᶜ)' },
            { level: 'easy', formula: 'A ⊆ B', category: 'RELACIÓN DE CONJUNTOS', hint: 'Todo elemento de A está también en B.', correctLabel: 'Subconjunto (A ⊆ B)' },
            { level: 'easy', formula: 'A = B', category: 'RELACIÓN DE CONJUNTOS', hint: 'Ambos conjuntos tienen exactamente los mismos elementos.', correctLabel: 'Conjuntos Iguales (A = B)' },
            { level: 'easy', formula: 'A × B', category: 'PRODUCTO CARTESIANO', hint: 'Pares ordenados formados por un elemento de A y uno de B.', correctLabel: 'Producto Cartesiano (A × B)' },
            { level: 'easy', formula: 'P(A)', category: 'CONJUNTO DE PARTES', hint: 'Conjunto formado por todos los subconjuntos de A.', correctLabel: 'Conjunto Potencia P(A)' },

            // ===== NORMAL: propiedades, clasificaciones y equivalencias básicas =====
            { level: 'normal', formula: 'p ∨ ¬p', category: 'TAUTOLOGÍA (TERCERO EXCLUIDO)', hint: '¿Qué tipo de proposición compuesta es "p ∨ ¬p"?', correctLabel: 'Tautología (Siempre Verdadera)' },
            { level: 'normal', formula: 'p ∧ ¬p', category: 'CONTRADICCIÓN LÓGICA', hint: 'Afirmar una proposición y su negación a la vez es una...', correctLabel: 'Contradicción (Siempre Falsa)' },
            { level: 'normal', formula: 'A ∩ B = ∅', category: 'PROPIEDAD DE CONJUNTOS', hint: 'Si dos conjuntos no tienen elementos en común, son...', correctLabel: 'Conjuntos Disjuntos (A ∩ B = ∅)' },
            { level: 'normal', formula: '¬¬p ≡ p', category: 'DOBLE NEGACIÓN', hint: 'Negar dos veces una proposición devuelve su valor original.', correctLabel: 'Doble Negación (¬¬p ≡ p)' },
            { level: 'normal', formula: 'p ∧ q ≡ q ∧ p', category: 'PROPIEDAD DE OPERADORES', hint: 'El orden de los operandos no altera el resultado.', correctLabel: 'Ley Conmutativa (p ∧ q ≡ q ∧ p)' },
            { level: 'normal', formula: 'p ∧ (q ∨ r)', category: 'PROPIEDAD DE OPERADORES', hint: 'La conjunción se reparte sobre la disyunción.', correctLabel: 'Ley Distributiva' },
            { level: 'normal', formula: 'p ∧ p ≡ p', category: 'PROPIEDAD DE OPERADORES', hint: 'Repetir el mismo operando no cambia el resultado.', correctLabel: 'Idempotencia (p ∧ p ≡ p)' },
            { level: 'normal', formula: '(p ↔ q) ≡ (p → q) ∧ (q → p)', category: 'EQUIVALENCIA LÓGICA', hint: 'El "si y solo si" equivale a dos condicionales mutuos.', correctLabel: 'Bicondicional (p ↔ q)' },
            { level: 'normal', formula: 'p → p', category: 'TAUTOLOGÍA', hint: 'Una proposición que implica a sí misma siempre es...', correctLabel: 'Tautología (Siempre Verdadera)' },
            { level: 'normal', formula: '|A|', category: 'CARDINALIDAD', hint: 'Número de elementos de un conjunto finito.', correctLabel: 'Cardinalidad |A|' },

            // ===== DIFÍCIL: leyes, reglas de inferencia y equivalencias avanzadas =====
            { level: 'hard', formula: '¬(p ∧ q) ≡ ¬p ∨ ¬q', category: 'EQUIVALENCIA LÓGICA', hint: 'La negación de una conjunción equivale a la disyunción de las negaciones.', correctLabel: 'Ley de De Morgan' },
            { level: 'hard', formula: '¬(p ∨ q) ≡ ¬p ∧ ¬q', category: 'EQUIVALENCIA LÓGICA', hint: 'La negación de una disyunción equivale a la conjunción de las negaciones.', correctLabel: 'Ley de De Morgan' },
            { level: 'hard', formula: '(A ∩ B)ᶜ ≡ Aᶜ ∪ Bᶜ', category: 'EQUIVALENCIA DE CONJUNTOS', hint: 'El complemento de una intersección es la unión de los complementos.', correctLabel: 'Ley de De Morgan' },
            { level: 'hard', formula: '(p → q) ∧ p', category: 'REGLA DE INFERENCIA', hint: 'Si p implica q y se afirma p, entonces se concluye q.', correctLabel: 'Modus Ponens' },
            { level: 'hard', formula: '(p → q) ∧ ¬q', category: 'REGLA DE INFERENCIA', hint: 'Si p implica q y se niega q, entonces se concluye ¬p.', correctLabel: 'Modus Tollens' },
            { level: 'hard', formula: 'p → q ≡ ¬q → ¬p', category: 'EQUIVALENCIA LÓGICA', hint: 'Se invierte y niega el condicional.', correctLabel: 'Contraposición (p → q ≡ ¬q → ¬p)' },
            { level: 'hard', formula: '(p → q) ∧ (q → r)', category: 'REGLA DE INFERENCIA', hint: 'Encadena dos condicionales para concluir p → r.', correctLabel: 'Silogismo Hipotético' },
            { level: 'hard', formula: 'p ∨ (p ∧ q) ≡ p', category: 'PROPIEDAD DE OPERADORES', hint: 'Una proposición absorbe a su conjunción consigo misma.', correctLabel: 'Ley de Absorción' },
            { level: 'hard', formula: 'p ∨ (q ∧ r) ≡ (p ∨ q) ∧ (p ∨ r)', category: 'PROPIEDAD DE OPERADORES', hint: 'La disyunción se reparte sobre la conjunción.', correctLabel: 'Ley Distributiva' }
        ];

        let aimRecentChallenges = [];

        function pickAimChallenge() {
            const pool = AIM_PROPOSITION_BANK.filter(x => x.level === aimDifficulty);
            const bank = pool.length ? pool : AIM_PROPOSITION_BANK;
            const n = bank.length;
            const window = Math.min(6, n - 1);
            let item = bank[Math.floor(Math.random() * n)];
            let tries = 0;
            while (aimRecentChallenges.includes(item.formula) && tries < 40) {
                item = bank[Math.floor(Math.random() * n)];
                tries++;
            }
            aimRecentChallenges.push(item.formula);
            while (aimRecentChallenges.length > window) aimRecentChallenges.shift();
            return item;
        }

        function aimDistractorLabels(count, usedSet) {
            const used = usedSet || new Set();
            const correct = activeAimChallenge ? activeAimChallenge.correctLabel : null;
            const pool = AIM_ANSWER_POOL.filter(t => t !== correct && !used.has(t));
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
            }
            const out = [];
            for (let i = 0; i < count; i++) out.push(pool.length ? pool[i % pool.length] : `Concepto ${i + 1}`);
            return out;
        }

        function build3DAimArena() {
            // Grass field
            const grass = new THREE.Mesh(
                new THREE.PlaneGeometry(60, 60),
                new THREE.MeshStandardMaterial({ color: 0x6cbf4a, roughness: 1.0 })
            );
            grass.rotation.x = -Math.PI / 2;
            grass.receiveShadow = true;
            aimGroup.add(grass);

            // Slightly darker patch under the play area for depth
            const patch = new THREE.Mesh(
                new THREE.CircleGeometry(13, 40),
                new THREE.MeshStandardMaterial({ color: 0x5aa83c, roughness: 1.0 })
            );
            patch.rotation.x = -Math.PI / 2;
            patch.position.y = 0.01;
            aimGroup.add(patch);

            // Distant rolling hills
            const hillMat = new THREE.MeshStandardMaterial({ color: 0x4f9a3a, roughness: 1.0 });
            for (let i = -3; i <= 3; i++) {
                const hill = new THREE.Mesh(new THREE.SphereGeometry(9 + Math.abs(i) * 1.5, 18, 14), hillMat);
                hill.scale.set(1, 0.42, 1);
                hill.position.set(i * 13, -1.4, -30 - Math.abs(i) * 2);
                aimBackdrop.add(hill);
            }

            // Big classic tree on the left
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.55, 0.9, 9, 10),
                new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 })
            );
            trunk.position.set(-14, 4.5, -18);
            aimBackdrop.add(trunk);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f2a, roughness: 1.0 });
            [[0, 10.4, 0, 4.2], [-2.6, 9.2, 0.6, 3.2], [2.6, 9.4, -0.6, 3.2], [0, 12.6, 0, 2.9]].forEach(l => {
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(l[3], 16, 14), leafMat);
                leaf.position.set(-14 + l[0], l[1], -18 + l[2]);
                aimBackdrop.add(leaf);
            });

            // A few smaller bushes at the sides
            const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f8f2a, roughness: 1.0 });
            [[13, -12, 2.4], [-10, -10, 1.9], [16, -20, 3.0]].forEach(b => {
                const bush = new THREE.Mesh(new THREE.SphereGeometry(b[2], 14, 12), bushMat);
                bush.scale.set(1.3, 0.8, 1.3);
                bush.position.set(b[0], b[2] * 0.6, b[1]);
                aimBackdrop.add(bush);
            });

            // Sun
            const sun = new THREE.Mesh(
                new THREE.SphereGeometry(2.4, 20, 20),
                new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
            );
            sun.position.set(20, 17, -34);
            aimBackdrop.add(sun);
            const sunGlow = new THREE.Mesh(
                new THREE.SphereGeometry(3.6, 20, 20),
                new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.28 })
            );
            sunGlow.position.copy(sun.position);
            aimBackdrop.add(sunGlow);

            // Clouds
            const cloudMat = new THREE.MeshBasicMaterial({ color: 0xe7e5e4 });
            for (let i = 0; i < 5; i++) {
                const cloud = new THREE.Group();
                const puffCount = 3 + (i % 3);
                for (let p = 0; p < puffCount; p++) {
                    const puff = new THREE.Mesh(new THREE.SphereGeometry(randRange(1.4, 2.3), 12, 10), cloudMat);
                    puff.position.set(p * 1.9 - puffCount, randRange(-0.3, 0.3), randRange(-0.6, 0.6));
                    puff.scale.y = 0.72;
                    cloud.add(puff);
                }
                cloud.position.set(randRange(-32, 32), randRange(11, 17), randRange(-38, -20));
                cloud.userData.speed = randRange(0.25, 0.6);
                aimClouds.push(cloud);
                aimBackdrop.add(cloud);
            }
        }

        function randAimPos() {
            const y = randRange(AIM_BOUNDS.minY + 0.6, AIM_BOUNDS.maxY - 0.6);
            const maxX = y > AIM_HUD_ZONE.minY ? AIM_HUD_ZONE.minX - 0.8 : AIM_BOUNDS.maxX - 1;
            return new THREE.Vector3(
                randRange(AIM_BOUNDS.minX + 1, Math.max(AIM_BOUNDS.minX + 1, maxX)),
                y,
                randRange(AIM_BOUNDS.minZ + 1, AIM_BOUNDS.maxZ - 1)
            );
        }

        function aimLabelHTML(text, colorHex) {
            const c = '#' + (colorHex || 0xf43f5e).toString(16).padStart(6, '0');
            return `<div class="aim-ball-label" style="border-color:${c}; box-shadow:0 0 16px ${c}66, 0 6px 18px rgba(0,0,0,0.55);">🎯 ${text}</div>`;
        }

        function createAimBall(isCorrect, labelText, pos, radius) {
            const r = radius || randRange(0.55, 1.35);
            const color = AIM_PALETTE[Math.floor(Math.random() * AIM_PALETTE.length)];
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(r, 20, 20),
                new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, metalness: 0.35, roughness: 0.25 })
            );
            mesh.position.copy(pos || randAimPos());
            mesh.userData = {
                type: 'aim_target',
                isCorrect,
                labelText,
                formula: activeAimChallenge ? activeAimChallenge.formula : ''
            };
            aimGroup.add(mesh);
            clickableMeshes.push(mesh);

            const labelObj = create3DLabel(mesh, aimLabelHTML(labelText, color), r + 0.85, 'aim');

            const ball = {
                mesh,
                labelObj,
                radius: r,
                isCorrect,
                labelText,
                vel: new THREE.Vector3(randRange(-1.8, 1.8), randRange(-0.7, 0.7), randRange(-1.3, 1.3)),
                phase: Math.random() * Math.PI * 2,
                spin: randRange(-1.4, 1.4)
            };
            aimField.push(ball);
            return ball;
        }

        function removeAimBall(ball) {
            if (!ball) return;
            aimGroup.remove(ball.mesh);
            ball.mesh.geometry.dispose();
            ball.mesh.material.dispose();
            ball.labelObj.div.remove();
            const idx = clickableMeshes.indexOf(ball.mesh);
            if (idx >= 0) clickableMeshes.splice(idx, 1);
            const ai = aimField.indexOf(ball);
            if (ai >= 0) aimField.splice(ai, 1);
            const li = tracked3DLabels.indexOf(ball.labelObj);
            if (li >= 0) tracked3DLabels.splice(li, 1);
        }

        function spawnAimCorrect() {
            if (!activeAimChallenge) return;
            createAimBall(true, activeAimChallenge.correctLabel);
        }

        function spawnAimDistractor() {
            if (!activeAimChallenge) return;
            const used = new Set(aimField.map(b => b.labelText));
            const labels = aimDistractorLabels(1, used);
            createAimBall(false, labels[0]);
        }

        function updateAimMissionUI(item) {
            document.getElementById('static-mode-badge').textContent = 'AIM 3D • PROPOSICIONES';
            document.getElementById('mission-tag').textContent = 'OBJETIVO DE TIRO 3D';
            document.getElementById('mission-subtitle-label').textContent = 'CLASIFICAR PROPOSICIÓN';
            document.getElementById('mission-title').className = 'text-3xl sm:text-4xl font-extrabold text-rose-400 mono-font tracking-tight leading-tight';
            document.getElementById('mission-title').textContent = item.formula;
            document.getElementById('mission-desc').textContent = item.hint;
            document.getElementById('mission-context').innerHTML = `
                <span class="text-rose-300 font-extrabold text-xs sm:text-sm"><i class="fa-solid fa-crosshairs mr-1"></i> ${item.category}</span>
            `;
        }

        function rotateAimChallenge() {
            const item = pickAimChallenge();
            activeAimChallenge = item;
            updateAimMissionUI(item);
            const distractors = aimField.filter(b => !b.isCorrect);
            const labels = aimDistractorLabels(distractors.length, new Set([item.correctLabel]));
            distractors.forEach((b, i) => {
                const text = labels[i];
                b.labelText = text;
                b.mesh.userData.labelText = text;
                b.mesh.userData.formula = item.formula;
                b.labelObj.div.innerHTML = aimLabelHTML(text, b.mesh.material.color.getHex());
            });
            spawnAimCorrect();
            ensureAimCorrectPresent();
        }

        // Guarantees the board always holds the current correct answer exactly once,
        // so the next question can always be answered without guessing.
        function ensureAimCorrectPresent() {
            if (!activeAimChallenge) return;
            const correctText = activeAimChallenge.correctLabel;
            let found = false;
            aimField.forEach(b => {
                if (b.labelText === correctText) {
                    if (!b.isCorrect) { b.isCorrect = true; b.mesh.userData.isCorrect = true; }
                    found = true;
                } else if (b.isCorrect) {
                    b.isCorrect = false;
                    b.mesh.userData.isCorrect = false;
                }
            });
            if (!found) spawnAimCorrect();
        }

        function spawn3DAimTargets() {
            aimField.slice().forEach(removeAimBall);
            aimField.length = 0;
            clearModeLabels('aim');

            const item = pickAimChallenge();
            activeAimChallenge = item;
            roundTimer = 45;
            updateAimMissionUI(item);

            spawnAimCorrect();
            const labels = aimDistractorLabels(aimFieldSize() - 1, new Set([item.correctLabel]));
            labels.forEach(text => createAimBall(false, text));
            ensureAimCorrectPresent();
        }

        function updateAimDifficultyButtons() {
            const defs = [
                { id: 'btn-aim-easy', active: 'bg-emerald-500 text-slate-950', key: 'easy' },
                { id: 'btn-aim-normal', active: 'bg-amber-500 text-slate-950', key: 'normal' },
                { id: 'btn-aim-hard', active: 'bg-rose-500 text-white', key: 'hard' }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === aimDifficulty
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setAimDifficulty(diff) {
            aimDifficulty = diff;
            updateAimDifficultyButtons();
            if (currentMode !== 'aim') return;
            playSFX('pickup');
            startAimRun();
        }

        function startAimRun() {
            aimGameOver = false;
            modeScores.aim = 0;
            globalStreak = 0;
            statHits = 0;
            statMisses = 0;
            aimRecentChallenges = [];
            document.getElementById('hud-score').textContent = '0';
            document.getElementById('hud-streak').textContent = 'x1';
            document.getElementById('hud-accuracy-stats').textContent = '✔ 0 | ✖ 0';
            roundTimer = 45;
            hideAimGameOver();
            spawn3DAimTargets();
            updateBigTimer();
            armStartHint();
        }

        function updateAimField(dt, elapsed) {
            ensureAimCorrectPresent();
            aimField.forEach(ball => {
                const m = ball.mesh;
                m.rotation.x += ball.spin * dt;
                m.rotation.y += ball.spin * dt * 1.3;
                m.position.x += ball.vel.x * dt;
                m.position.y += ball.vel.y * dt + Math.sin(elapsed * 2 + ball.phase) * 0.004;
                m.position.z += ball.vel.z * dt;
                if (m.position.x < AIM_BOUNDS.minX || m.position.x > AIM_BOUNDS.maxX) ball.vel.x *= -1;
                if (m.position.y < AIM_BOUNDS.minY || m.position.y > AIM_BOUNDS.maxY) ball.vel.y *= -1;
                if (m.position.z < AIM_BOUNDS.minZ || m.position.z > AIM_BOUNDS.maxZ) ball.vel.z *= -1;
                m.position.x = THREE.MathUtils.clamp(m.position.x, AIM_BOUNDS.minX, AIM_BOUNDS.maxX);
                m.position.y = THREE.MathUtils.clamp(m.position.y, AIM_BOUNDS.minY, AIM_BOUNDS.maxY);
                m.position.z = THREE.MathUtils.clamp(m.position.z, AIM_BOUNDS.minZ, AIM_BOUNDS.maxZ);
                // No dejar que las bolas crucen la zona del HUD de misiones (arriba-derecha)
                if (m.position.x > AIM_HUD_ZONE.minX && m.position.y > AIM_HUD_ZONE.minY) {
                    const penX = m.position.x - AIM_HUD_ZONE.minX;
                    const penY = m.position.y - AIM_HUD_ZONE.minY;
                    if (penX < penY) {
                        m.position.x = AIM_HUD_ZONE.minX;
                        ball.vel.x = -Math.abs(ball.vel.x);
                    } else {
                        m.position.y = AIM_HUD_ZONE.minY;
                        ball.vel.y = -Math.abs(ball.vel.y);
                    }
                }
            });
        }

        function buildAimGun() {
            aimGun.visible = false;
            aimGun.scale.setScalar(0.62);
            aimGun.position.set(0.4, -0.3, -0.82);
            aimGun.rotation.set(0.06, -0.16, 0.03);

            const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, metalness: 0.7, roughness: 0.35 });
            const grayMat = new THREE.MeshStandardMaterial({ color: 0x555f6e, metalness: 0.8, roughness: 0.28 });
            const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.85 });

            const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.17, 0.46), darkMat);
            body.position.set(0, 0, -0.05);
            aimGun.add(body);

            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.44), grayMat);
            slide.position.set(0, 0.1, -0.06);
            aimGun.add(slide);

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 12), grayMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.02, -0.42);
            aimGun.add(barrel);

            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.15), gripMat);
            grip.position.set(0, -0.2, 0.06);
            grip.rotation.x = 0.28;
            aimGun.add(grip);

            const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), grayMat);
            sight.position.set(0, 0.15, -0.2);
            aimGun.add(sight);

            aimGunMuzzle = new THREE.Object3D();
            aimGunMuzzle.position.set(0, 0.02, -0.62);
            aimGun.add(aimGunMuzzle);

            aimGunFlash = new THREE.Mesh(
                new THREE.SphereGeometry(0.16, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xffdf6b, transparent: true, opacity: 0.95 })
            );
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.13, 0.34, 10),
                new THREE.MeshBasicMaterial({ color: 0xffae3b, transparent: true, opacity: 0.85 })
            );
            cone.rotation.x = -Math.PI / 2;
            cone.position.z = -0.2;
            aimGunFlash.add(cone);
            aimGunFlash.position.copy(aimGunMuzzle.position);
            aimGunFlash.visible = false;
            aimGun.add(aimGunFlash);
        }

        function spawnAimBullet(fromVec, toVec, isHitCorrect) {
            const geo = new THREE.SphereGeometry(0.11, 12, 12);
            const mat = new THREE.MeshBasicMaterial({ color: isHitCorrect ? 0xfff3b0 : 0xffd9a0 });
            const bullet = new THREE.Mesh(geo, mat);
            bullet.position.copy(fromVec);
            scene.add(bullet);

            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.45 })
            );
            bullet.add(glow);

            const trailGeo = new THREE.BufferGeometry().setFromPoints([fromVec.clone(), fromVec.clone()]);
            const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.7 }));
            scene.add(trail);

            const dist = fromVec.distanceTo(toVec);
            aimBullets.push({
                mesh: bullet,
                trail,
                from: fromVec.clone(),
                to: toVec.clone(),
                t: 0,
                dur: Math.max(0.05, dist / 120)
            });
        }

        function updateAimBullets(dt) {
            for (let i = aimBullets.length - 1; i >= 0; i--) {
                const b = aimBullets[i];
                b.t += dt;
                const k = Math.min(1, b.t / b.dur);
                b.mesh.position.lerpVectors(b.from, b.to, k);
                const arr = b.trail.geometry.attributes.position.array;
                arr[0] = b.from.x; arr[1] = b.from.y; arr[2] = b.from.z;
                arr[3] = b.mesh.position.x; arr[4] = b.mesh.position.y; arr[5] = b.mesh.position.z;
                b.trail.geometry.attributes.position.needsUpdate = true;
                if (k >= 1) {
                    scene.remove(b.mesh);
                    scene.remove(b.trail);
                    b.mesh.geometry.dispose();
                    b.mesh.material.dispose();
                    b.trail.geometry.dispose();
                    b.trail.material.dispose();
                    aimBullets.splice(i, 1);
                }
            }
        }

        function updateAimGun(elapsed) {
            if (currentMode !== 'aim') return;
            // The gun is a child of the camera and its barrel is modeled along -Z
            // (pointing away from the player into the scene). We only add a small
            // sway that follows the cursor, so it can never flip toward the camera.
            aimGun.rotation.order = 'YXZ';
            aimGun.rotation.y = -aimPointerNdc.x * 0.22 + 0.22;
            aimGun.rotation.x = aimPointerNdc.y * 0.14 + 0.05;
            if (aimGunFlash && aimGunFlash.visible && elapsed > aimGunFlashUntil) {
                aimGunFlash.visible = false;
            }
        }

        function fire3DLaserBeam(targetWorldPos, isHitCorrect) {
            playSFX('laser');

            const startVec = new THREE.Vector3();
            if (aimGunMuzzle) aimGunMuzzle.getWorldPosition(startVec);
            else startVec.set(60, 2.8, 9.5);

            // Bullet projectile from the gun muzzle to the target
            spawnAimBullet(startVec, targetWorldPos.clone(), isHitCorrect);

            // Muzzle flash
            if (aimGunFlash) {
                aimGunFlash.visible = true;
                aimGunFlash.rotation.z = Math.random() * Math.PI;
                aimGunFlashUntil = clock.getElapsedTime() + 0.07;
            }

            // Quick tracer line
            const points = [startVec, targetWorldPos.clone()];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({ color: isHitCorrect ? 0x10b981 : 0xf43f5e, transparent: true, opacity: 0.55 });
            const laser = new THREE.Line(lineGeo, lineMat);
            scene.add(laser);
            setTimeout(() => scene.remove(laser), 90);
        }

        const connectNodes3D = [];
        const connectBeamsGroup = new THREE.Group();
        let previewCableMesh = null;
        const connectDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.15);
        let selectedLeftNode3D = null;
        let matchedConnectCount = 0;
        let connectParticles = null;
        let connectHorizon = null;
        const connectFx = [];

        function spawnConnectShockwave(pos, color) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.6, 0.85, 40),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(pos.x, 0.14, pos.z);
            connectGroup.add(ring);
            connectFx.push({ type: 'ring', mesh: ring, t: 0, dur: 0.7 });
        }

        function spawnConnectSparks(pos, color) {
            const n = 26;
            const positions = new Float32Array(n * 3);
            const vels = [];
            for (let i = 0; i < n; i++) {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
                const a = Math.random() * Math.PI * 2;
                const sp = 1.4 + Math.random() * 2.6;
                vels.push(new THREE.Vector3(Math.cos(a) * sp, 2.2 + Math.random() * 2.6, Math.sin(a) * sp));
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
            const pts = new THREE.Points(geo, mat);
            connectGroup.add(pts);
            connectFx.push({ type: 'sparks', mesh: pts, vels, t: 0, dur: 0.95 });
        }

        function playConnectMatchFx(mesh) {
            const p = mesh.position;
            spawnConnectShockwave(p, 0x5eead4);
            spawnConnectSparks(new THREE.Vector3(p.x, 1.15, p.z), 0xa7f3d0);
        }

        function updateConnectFx(dt) {
            for (let i = connectFx.length - 1; i >= 0; i--) {
                const fx = connectFx[i];
                fx.t += dt;
                const k = fx.t / fx.dur;
                if (fx.type === 'ring') {
                    const s = 1 + k * 3.4;
                    fx.mesh.scale.set(s, s, s);
                    fx.mesh.material.opacity = Math.max(0, 0.95 * (1 - k));
                } else if (fx.type === 'sparks') {
                    const arr = fx.mesh.geometry.attributes.position.array;
                    for (let j = 0; j < fx.vels.length; j++) {
                        const v = fx.vels[j];
                        v.y -= 9.5 * dt;
                        arr[j * 3] += v.x * dt;
                        arr[j * 3 + 1] += v.y * dt;
                        arr[j * 3 + 2] += v.z * dt;
                    }
                    fx.mesh.geometry.attributes.position.needsUpdate = true;
                    fx.mesh.material.opacity = Math.max(0, 1 - k);
                }
                if (k >= 1) {
                    connectGroup.remove(fx.mesh);
                    if (fx.mesh.geometry) fx.mesh.geometry.dispose();
                    if (fx.mesh.material) fx.mesh.material.dispose();
                    connectFx.splice(i, 1);
                }
            }
        }

        const EQUIVALENCE_BANK = [
            { id: 'dm1', left: '¬(p ∧ q)', right: '¬p ∨ ¬q', law: '1ª Ley de De Morgan Lógica' },
            { id: 'dm2', left: '¬(p ∨ q)', right: '¬p ∧ ¬q', law: '2ª Ley de De Morgan Lógica' },
            { id: 'imp', left: 'p → q', right: '¬p ∨ q', law: 'Equivalencia de Implicación Material' },
            { id: 'cnt', left: 'p → q (Contrapositiva)', right: '¬q → ¬p', law: 'Ley de Contraposición' },
            { id: 'set1', left: '(A ∪ B)\'', right: 'A\' ∩ B\'', law: 'Ley de De Morgan para Conjuntos' },
            { id: 'set2', left: 'A - B', right: 'A ∩ B\'', law: 'Identidad de Diferencia de Conjuntos' },
            { id: 'idp1', left: 'p ∧ p', right: 'p', law: 'Idempotencia de la Conjunción' },
            { id: 'idp2', left: 'p ∨ p', right: 'p', law: 'Idempotencia de la Disyunción' },
            { id: 'dist', left: 'p ∧ (q ∨ r)', right: '(p ∧ q) ∨ (p ∧ r)', law: 'Ley Distributiva' },
            { id: 'bic', left: 'p ↔ q', right: '(p → q) ∧ (q → p)', law: 'Definición del Bicondicional' },
            { id: 'neu', left: 'A ∪ ∅', right: 'A', law: 'Ley de Identidad para la Unión' }
        ];

        function build3DConnectArena() {
            // Base slab
            const platform = new THREE.Mesh(
                new THREE.BoxGeometry(24, 0.6, 17),
                new THREE.MeshStandardMaterial({ color: 0x0b1324, metalness: 0.7, roughness: 0.35 })
            );
            platform.position.y = -0.32;
            connectGroup.add(platform);

            // Glowing top plate
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(22.6, 0.08, 15.6),
                new THREE.MeshStandardMaterial({ color: 0x0f766e, emissive: 0x10b981, emissiveIntensity: 0.16, metalness: 0.4, roughness: 0.5 })
            );
            plate.position.y = 0.01;
            connectGroup.add(plate);

            // Emissive neon rim around the platform
            const rim = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(24.2, 0.62, 17.2)),
                new THREE.LineBasicMaterial({ color: 0x34d399 })
            );
            rim.position.y = -0.32;
            connectGroup.add(rim);

            // Circuit grid
            const grid = new THREE.GridHelper(22, 22, 0x34d399, 0x14343a);
            grid.position.y = 0.06;
            grid.material.opacity = 0.55;
            grid.material.transparent = true;
            connectGroup.add(grid);

            // Distant glowing horizon line (gives the arena depth)
            const horizonGeo = new THREE.PlaneGeometry(120, 26);
            const horizonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
            connectHorizon = new THREE.Mesh(horizonGeo, horizonMat);
            connectHorizon.position.set(0, 5.5, -30);
            connectGroup.add(connectHorizon);

            // Floating energy dust
            const count = 260;
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 46;
                positions[i * 3 + 1] = Math.random() * 14 - 1;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
            }
            const pGeo = new THREE.BufferGeometry();
            pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const pMat = new THREE.PointsMaterial({ color: 0x5eead4, size: 0.14, transparent: true, opacity: 0.7, depthWrite: false });
            connectParticles = new THREE.Points(pGeo, pMat);
            connectGroup.add(connectParticles);

            connectGroup.add(connectBeamsGroup);
        }

        function buildConnectPylon(side, pair, z, labelText, labelHtml, color, emissive) {
            const pylon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.62, 0.78, 1.5, 24),
                new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.35, metalness: 0.55, roughness: 0.3 })
            );
            pylon.position.set(side === 'left' ? -5.4 : 5.4, 0.8, z);
            pylon.userData = {
                type: 'connect_node',
                side,
                pairId: pair.id,
                expr: labelText,
                law: pair.law,
                matched: false
            };

            // Ground glow halo
            const halo = new THREE.Mesh(
                new THREE.RingGeometry(0.75, 1.15, 32),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
            );
            halo.rotation.x = -Math.PI / 2;
            halo.position.y = -0.72;
            pylon.add(halo);

            // Base pedestal
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.95, 1.05, 0.16, 24),
                new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.35 })
            );
            base.position.y = -0.72;
            pylon.add(base);

            // Spinning tech ring
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.92, 0.05, 8, 40),
                new THREE.MeshStandardMaterial({ color: 0xe7dfc9, emissive, emissiveIntensity: 0.9, metalness: 0.25, roughness: 0.25 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.7;
            pylon.add(ring);

            // Floating crystal on top
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.32, 0),
                new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.1 })
            );
            crystal.position.y = 1.3;
            pylon.add(crystal);

            // Port socket the cable plugs into
            const portSocket = new THREE.Mesh(
                new THREE.SphereGeometry(0.24, 16, 16),
                new THREE.MeshStandardMaterial({ color: side === 'left' ? 0x38bdf8 : 0x34d399, emissive: side === 'left' ? 0x0284c7 : 0x059669, emissiveIntensity: 0.9 })
            );
            portSocket.position.set(side === 'left' ? 0.66 : -0.66, 0.35, 0);
            pylon.add(portSocket);

            connectGroup.add(pylon);
            clickableMeshes.push(pylon);
            connectNodes3D.push({ mesh: pylon, ring, crystal, portSocket, halo });

            create3DLabel(pylon, labelHtml, 1.25, 'connect');
        }

        function removePreviewCable() {
            if (previewCableMesh) {
                connectBeamsGroup.remove(previewCableMesh);
                if (previewCableMesh.geometry) previewCableMesh.geometry.dispose();
                previewCableMesh = null;
            }
        }

        function buildCurvedCableMesh(localStart, localEnd, hexColor = 0x34d399, radius = 0.13) {
            const midPoint = new THREE.Vector3().addVectors(localStart, localEnd).multiplyScalar(0.5);
            midPoint.y += 1.15;

            const curve = new THREE.CatmullRomCurve3([
                localStart.clone(),
                midPoint,
                localEnd.clone()
            ]);

            const tubeGeo = new THREE.TubeGeometry(curve, 28, radius, 12, false);
            const tubeMat = new THREE.MeshStandardMaterial({ color: hexColor, emissive: hexColor, emissiveIntensity: 0.85, roughness: 0.2 });
            return new THREE.Mesh(tubeGeo, tubeMat);
        }

        function updateLivePreviewCable(localCursorTarget) {
            removePreviewCable();
            if (!selectedLeftNode3D) return;

            const startLocal = selectedLeftNode3D.position.clone();
            startLocal.x += 0.65;
            startLocal.y = 1.15;

            previewCableMesh = buildCurvedCableMesh(startLocal, localCursorTarget, 0xfacc15, 0.09);
            connectBeamsGroup.add(previewCableMesh);
        }

        function spawn3DConnectNodes() {
            connectNodes3D.forEach(n => {
                connectGroup.remove(n.mesh);
                const idx = clickableMeshes.indexOf(n.mesh);
                if (idx >= 0) clickableMeshes.splice(idx, 1);
            });
            connectNodes3D.length = 0;
            removePreviewCable();
            while (connectBeamsGroup.children.length > 0) {
                const child = connectBeamsGroup.children[0];
                connectBeamsGroup.remove(child);
                if (child.geometry) child.geometry.dispose();
            }
            clearModeLabels('connect');
            selectedLeftNode3D = null;
            matchedConnectCount = 0;
            roundTimer = 45;

            const chosenPairs = [...EQUIVALENCE_BANK].sort(() => Math.random() - 0.5).slice(0, 4);
            const rightShuffled = [...chosenPairs].sort(() => Math.random() - 0.5);

            document.getElementById('static-mode-badge').textContent = 'NODOS 3D • EQUIVALENCIAS';

            const zSlots = [-4.2, -1.4, 1.4, 4.2];

            chosenPairs.forEach((pair, i) => {
                buildConnectPylon(
                    'left', pair, zSlots[i], pair.left,
                    `<div class="px-2.5 py-0.5 rounded-lg bg-indigo-950/95 border border-indigo-400 text-xs font-extrabold text-white mono-font shadow-lg">
                        ⚡ ${pair.left}
                    </div>`,
                    0x6366f1, 0x4338ca
                );
            });

            rightShuffled.forEach((pair, i) => {
                buildConnectPylon(
                    'right', pair, zSlots[i], pair.right,
                    `<div class="px-2.5 py-0.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-xs font-extrabold text-white mono-font shadow-lg">
                        🔗 ${pair.right}
                    </div>`,
                    0x10b981, 0x047857
                );
            });
        }

        function create3DBeamBetweenNodes(meshA, meshB) {
            const startLocal = meshA.position.clone();
            startLocal.x += 0.65;
            startLocal.y = 1.15;

            const endLocal = meshB.position.clone();
            endLocal.x -= 0.65;
            endLocal.y = 1.15;

            const permanentCable = buildCurvedCableMesh(startLocal, endLocal, 0x34d399, 0.14);
            connectBeamsGroup.add(permanentCable);
        }

        function handleConnectNodeClick(mesh) {
            if (connectGameOver) return;
            const data = mesh.userData;
            if (data.matched) return;

            if (data.side === 'left') {
                playSFX('pickup');
                if (selectedLeftNode3D) {
                    selectedLeftNode3D.material.emissiveIntensity = 0.35;
                    selectedLeftNode3D.scale.set(1, 1, 1);
                }
                selectedLeftNode3D = mesh;
                mesh.material.emissiveIntensity = 1.0;
                mesh.scale.set(1.16, 1.16, 1.16);
            } else if (data.side === 'right') {
                if (!selectedLeftNode3D) {
                    recordOutcome(0, false, 'Selecciona primero un pilón azul izquierdo.');
                    return;
                }
                const leftData = selectedLeftNode3D.userData;
                removePreviewCable();

                if (leftData.pairId === data.pairId) {
                    leftData.matched = true;
                    data.matched = true;
                    selectedLeftNode3D.scale.set(1, 1, 1);
                    selectedLeftNode3D.material.color.setHex(0x10b981);
                    selectedLeftNode3D.material.emissive.setHex(0x047857);
                    mesh.material.color.setHex(0x10b981);
                    mesh.material.emissive.setHex(0x047857);
                    create3DBeamBetweenNodes(selectedLeftNode3D, mesh);
                    playConnectMatchFx(selectedLeftNode3D);
                    playConnectMatchFx(mesh);

                    recordOutcome(45, true, `${leftData.law}: ${leftData.expr} ≡ ${data.expr}`);
                    if (statHits === 3) showHitPopup('¡MÁS RÁPIDO!', true, 'EL TIEMPO ACELERA x2');
                    else if (statHits === 6) showHitPopup('¡RITMO MÁXIMO!', true, 'EL TIEMPO ACELERA x4');
                    selectedLeftNode3D = null;
                    matchedConnectCount++;

                    if (matchedConnectCount >= 4) {
                        setTimeout(() => { if (!connectGameOver) spawn3DConnectNodes(); }, 1100);
                    }
                } else {
                    selectedLeftNode3D.scale.set(1, 1, 1);
                    selectedLeftNode3D.material.emissiveIntensity = 0.35;
                    recordOutcome(0, false, `Incompatibilidad formal: "${leftData.expr}" NO equivale a "${data.expr}".`);
                    selectedLeftNode3D = null;
                }
            }
        }

        // ============================================================
        //  ¿QUIÉN QUIERE SER MILLONARIO? (modo "millonario")
        // ============================================================
        //  Escenario 3D del plató: el chef queda DETRÁS de una mesa en la
        //  derecha y la pregunta + 4 respuestas se muestran en un panel HTML
        //  a la IZQUIERDA de la pantalla.
        const millionGroup = new THREE.Group();
        millionGroup.position.set(-120, 0, 0);
        scene.add(millionGroup);
        const millionAnimated = [];   // { update(elapsed, dt) }

        const MILL_PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
        const MILL_TOTAL = 15;
        const MILL_SAFE = { 5: 1000, 10: 32000 };   // escalones seguros (al responder 5 o 10 bien)
        const MILL_TIMES = { easy: 40, normal: 30, hard: 22 };
        let millDifficulty = 'normal';
        let millLivesMax = 3;
        let millLives = 3;
        let millGameOver = false;
        let millRung = 0;              // preguntas acertadas
        let millLocked = false;        // true durante la pausa tras responder
        let millFiftyUsed = false;
        let millPublicUsed = false;
        let millQuestion = null;
        let millSeq = 0;               // invalida timeouts pendientes
        let millLastTemplate = null;
        let millRemoved = new Set();
        const millSeen = new Set();    // firmas de preguntas ya vistas (unicidad)

        function millTime() { return MILL_TIMES[millDifficulty] || 30; }
        function millPick(a) { return a[Math.floor(Math.random() * a.length)]; }
        function millRnd(n) { return Math.floor(Math.random() * n); }
        function millShuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
            }
            return arr;
        }
        function millSetText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
        function millFormat(n) { return Number(n).toLocaleString('es-ES'); }

        // ---------------- Núcleo: fórmulas proposicionales ----------------
        const MILL_VARS = ['p', 'q', 'r'];

        function propEval(node, env) {
            if (typeof node === 'string') return !!env[node];
            switch (node[0]) {
                case 'not': return !propEval(node[1], env);
                case 'and': return propEval(node[1], env) && propEval(node[2], env);
                case 'or': return propEval(node[1], env) || propEval(node[2], env);
                case 'imp': return !propEval(node[1], env) || propEval(node[2], env);
                case 'iff': return propEval(node[1], env) === propEval(node[2], env);
            }
            return false;
        }

        function propForEach(fn) {
            for (let mask = 0; mask < 8; mask++) {
                const env = {};
                MILL_VARS.forEach((v, i) => { env[v] = !!(mask & (1 << i)); });
                fn(env);
            }
        }

        function propIsTautology(f) { let ok = true; propForEach(env => { if (!propEval(f, env)) ok = false; }); return ok; }
        function propIsContradiction(f) { let ok = true; propForEach(env => { if (propEval(f, env)) ok = false; }); return ok; }
        function propIsContingent(f) { return !propIsTautology(f) && !propIsContradiction(f); }
        function propEquiv(a, b) { let ok = true; propForEach(env => { if (propEval(a, env) !== propEval(b, env)) ok = false; }); return ok; }
        function propCountTrue(f) { let n = 0; propForEach(env => { if (propEval(f, env)) n++; }); return n; }

        function propStr(f) {
            if (typeof f === 'string') return f;
            if (f[0] === 'not') return '¬' + millParen(f[1]);
            const sym = { and: ' ∧ ', or: ' ∨ ', imp: ' → ', iff: ' ↔ ' }[f[0]];
            return millParen(f[1]) + sym + millParen(f[2]);
        }
        function millParen(f) {
            if (typeof f === 'string') return f;
            if (f[0] === 'not') return propStr(f);
            return '(' + propStr(f) + ')';
        }

        function millRandFormula(depth, vars) {
            const pool = (vars && vars.length) ? vars : MILL_VARS;
            if (depth <= 0 || Math.random() < 0.3) return millPick(pool);
            if (Math.random() < 0.25) return ['not', millRandFormula(depth - 1, pool)];
            return [millPick(['and', 'or', 'imp', 'iff']), millRandFormula(depth - 1, pool), millRandFormula(depth - 1, pool)];
        }

        function millFindFormula(pred, depth, vars) {
            for (let i = 0; i < 250; i++) {
                const f = millRandFormula(depth, vars);
                if (pred(f)) return f;
            }
            return null;
        }

        // Negación simplificada (De Morgan, doble negación, implicación)
        function millNegation(f) {
            if (typeof f === 'string') return ['not', f];
            const op = f[0], a = f[1], b = f[2];
            if (op === 'not') return a;
            if (op === 'and') return ['or', millNegation(a), millNegation(b)];
            if (op === 'or') return ['and', millNegation(a), millNegation(b)];
            if (op === 'imp') return ['and', a, ['not', b]];
            if (op === 'iff') return ['iff', a, ['not', b]];
            return ['not', f];
        }

        // Variante equivalente (verificada con la tabla de verdad)
        function millEquivVariant(f) {
            if (typeof f === 'string') return ['not', ['not', f]];
            const op = f[0], a = f[1], b = f[2];
            const rules = [];
            if (op === 'not') {
                if (typeof a !== 'string' && a[0] === 'not') rules.push(() => a[1]);
                if (typeof a !== 'string' && (a[0] === 'and' || a[0] === 'or')) rules.push(() => [a[0] === 'and' ? 'or' : 'and', ['not', a[1]], ['not', a[2]]]);
                if (typeof a !== 'string' && a[0] === 'imp') rules.push(() => ['and', a[1], ['not', a[2]]]);
            } else if (op === 'imp') {
                rules.push(() => ['or', ['not', a], b]);
            } else if (op === 'and' || op === 'or') {
                rules.push(() => [op, b, a]);
                if (typeof b !== 'string' && b[0] === (op === 'and' ? 'or' : 'and')) {
                    rules.push(() => [op === 'and' ? 'or' : 'and', [op, a, b[1]], [op, a, b[2]]]);
                }
                if (typeof a !== 'string' && a[0] === (op === 'and' ? 'or' : 'and')) {
                    rules.push(() => [op === 'and' ? 'or' : 'and', [op, a[1], b], [op, a[2], b]]);
                }
            } else if (op === 'iff') {
                rules.push(() => ['and', ['imp', a, b], ['imp', b, a]]);
            }
            millShuffle(rules);
            for (const r of rules) {
                let v = null;
                try { v = r(); } catch (err) { continue; }
                if (v && propStr(v) !== propStr(f) && propEquiv(v, f)) return v;
            }
            return ['not', ['not', f]];
        }

        function millEntry(node) { return { text: propStr(node), node }; }

        function propVars(f, acc) {
            acc = acc || [];
            if (typeof f === 'string') { if (!acc.includes(f)) acc.push(f); return acc; }
            propVars(f[1], acc);
            if (f[0] !== 'not') propVars(f[2], acc);
            return acc;
        }

        // Monta 4 opciones validando que los distractores sean semánticamente incorrectos
        function millFinish(category, text, correctEntry, poolFn, okFn, explain) {
            const opts = [correctEntry];
            let guard = 0;
            while (opts.length < 4 && guard++ < 500) {
                const c = poolFn();
                if (!c || opts.some(o => o.text === c.text)) continue;
                if (okFn && !okFn(c)) continue;
                opts.push(c);
            }
            if (opts.length < 4) return null;
            millShuffle(opts);
            return {
                category, text,
                options: opts.map(o => o.text),
                correctIdx: opts.findIndex(o => o.text === correctEntry.text),
                explain
            };
        }

        // ---------------- Builders de preguntas ----------------
        function millB_evalTrue() {
            const env = { p: Math.random() < 0.5, q: Math.random() < 0.5, r: Math.random() < 0.5 };
            const depth = millDifficulty === 'easy' ? 1 : 2;
            const node = millFindFormula(f => propEval(f, env) === true, depth);
            if (!node) return null;
            const correct = millEntry(node);
            const label = MILL_VARS.map(v => `${v} = ${env[v] ? 'V' : 'F'}`).join(', ');
            return millFinish(
                'VALORES LÓGICOS',
                `Si ${label}, ¿cuál de estas proposiciones es VERDADERA?`,
                correct,
                () => { const f = millRandFormula(depth); return propEval(f, env) ? null : millEntry(f); },
                c => propEval(c.node, env) === false,
                `Sustituyendo los valores: ${propStr(node)} = V.`
            );
        }

        function millB_equiv() {
            const depth = millDifficulty === 'hard' ? 3 : 2;
            let f = null;
            for (let i = 0; i < 80; i++) {
                const c = millRandFormula(depth);
                if (typeof c !== 'string' && c[0] !== 'not') { f = c; break; }
            }
            if (!f) f = millRandFormula(2);
            const variant = millEquivVariant(f);
            if (!variant || propStr(variant) === propStr(f) || !propEquiv(variant, f)) return null;
            const correct = millEntry(variant);
            const vs = propVars(f).length > 1 ? propVars(f) : MILL_VARS;
            return millFinish(
                'EQUIVALENCIAS',
                `¿Cuál de las siguientes fórmulas es EQUIVALENTE a ${propStr(f)}?`,
                correct,
                () => millEntry(millRandFormula(depth, vs)),
                c => !propEquiv(c.node, f),
                `Ambas coinciden en las 8 filas: ${propStr(f)} ≡ ${propStr(variant)}.`
            );
        }

        function millB_negate() {
            const depth = millDifficulty === 'easy' ? 1 : 2;
            let f = millRandFormula(depth);
            for (let i = 0; i < 60 && (typeof f === 'string' || f[0] === 'not'); i++) f = millRandFormula(depth);
            const neg = millNegation(f);
            const target = ['not', f];
            if (!neg || propStr(neg) === propStr(f) || !propEquiv(neg, target)) return null;
            const correct = millEntry(neg);
            const vs = propVars(f).length > 1 ? propVars(f) : MILL_VARS;
            return millFinish(
                'NEGACIÓN',
                `¿Cuál de estas fórmulas equivale a la negación de ${propStr(f)}?`,
                correct,
                () => millEntry(millRandFormula(depth + 1, vs)),
                c => !propEquiv(c.node, target),
                `¬${millParen(f)} ≡ ${propStr(neg)}.`
            );
        }

        function millB_tautology() {
            const depth = millDifficulty === 'hard' ? 3 : 2;
            const f = millRandFormula(depth);
            const g = millRandFormula(1);
            const correctNode = millPick([
                ['or', f, millNegation(f)],
                ['imp', f, f],
                ['iff', f, f],
                ['not', ['and', f, ['not', f]]],
                ['or', g, ['iff', g, g]]
            ]);
            if (!propIsTautology(correctNode)) return null;
            const correct = millEntry(correctNode);
            return millFinish(
                'TAUTOLOGÍA',
                '¿Cuál de estas proposiciones es una TAUTOLOGÍA (siempre verdadera)?',
                correct,
                () => millEntry(millRandFormula(depth)),
                c => !propIsTautology(c.node),
                `${propStr(correctNode)} es verdadera en las 8 filas de su tabla de verdad.`
            );
        }

        function millB_contradiction() {
            const depth = millDifficulty === 'hard' ? 3 : 2;
            const f = millRandFormula(depth);
            const correctNode = millPick([
                ['and', f, millNegation(f)],
                ['iff', f, ['not', f]],
                ['not', ['or', f, ['not', f]]]
            ]);
            if (!propIsContradiction(correctNode)) return null;
            const correct = millEntry(correctNode);
            return millFinish(
                'CONTRADICCIÓN',
                '¿Cuál de estas proposiciones es una CONTRADICCIÓN (siempre falsa)?',
                correct,
                () => millEntry(millRandFormula(depth)),
                c => !propIsContradiction(c.node),
                `${propStr(correctNode)} es falsa en las 8 filas de su tabla de verdad.`
            );
        }

        function millB_contingency() {
            const depth = 3;
            const node = millFindFormula(f => propIsContingent(f), depth);
            if (!node) return null;
            const correct = millEntry(node);
            return millFinish(
                'CONTINGENCIA',
                '¿Cuál de estas proposiciones es una CONTINGENCIA (a veces verdadera y a veces falsa)?',
                correct,
                () => {
                    const f = millRandFormula(2);
                    if (propIsTautology(f) || propIsContradiction(f)) return millEntry(f);
                    return null;
                },
                null,
                `${propStr(node)} ni es tautología ni contradicción: cambia según los valores.`
            );
        }

        function millB_countTrue() {
            const depth = millDifficulty === 'hard' ? 3 : 2;
            let f = millRandFormula(depth);
            let count = propCountTrue(f);
            for (let i = 0; i < 50 && (count === 0 || count === 8); i++) {
                f = millRandFormula(depth);
                count = propCountTrue(f);
            }
            const correct = { text: String(count), value: count };
            return millFinish(
                'TABLA DE VERDAD',
                `De las 8 asignaciones de p, q y r, ¿cuántas hacen VERDADERA la fórmula ${propStr(f)}?`,
                correct,
                () => { const v = millRnd(9); return { text: String(v), value: v }; },
                c => c.value !== count,
                `${propStr(f)} se cumple en ${count} de las 8 filas.`
            );
        }

        function millB_impFalse() {
            const letters = millShuffle(MILL_VARS.slice());
            const a = letters[0], b = letters[1], c = letters[2];
            const comboText = (vars, mask) => vars.map((v, i) => `${v} = ${mask & (1 << i) ? 'V' : 'F'}`).join(', ');
            const kind = millPick(['imp', 'impNotA', 'impNotB', 'conjTrue', 'dispFalse', 'conj3', 'disp3']);

            if (kind === 'imp' || kind === 'impNotA' || kind === 'impNotB') {
                const forms = {
                    imp: { label: `${a} → ${b}`, correctMask: 0b01, why: `${a} = V y ${b} = F` },
                    impNotA: { label: `¬${a} → ${b}`, correctMask: 0b00, why: `${a} = F y ${b} = F` },
                    impNotB: { label: `${a} → ¬${b}`, correctMask: 0b11, why: `${a} = V y ${b} = V` }
                };
                const form = forms[kind];
                const poolMasks = millShuffle([0, 1, 2, 3].filter(m => m !== form.correctMask));
                let i = 0;
                return millFinish(
                    'IMPLICACIÓN',
                    `¿Cuándo es FALSA la proposición ${form.label}?`,
                    { text: comboText([a, b], form.correctMask) },
                    () => ({ text: comboText([a, b], poolMasks[(i++) % poolMasks.length]) }),
                    null,
                    `P → Q solo es falsa con P = V y Q = F: ${form.why}.`
                );
            }

            const isConj = kind === 'conjTrue' || kind === 'conj3';
            const k = (kind === 'conj3' || kind === 'disp3') ? 3 : 2;
            const vars = letters.slice(0, k);
            const signs = vars.map(() => Math.random() < 0.5);
            const label = vars.map((v, i) => signs[i] ? v : '¬' + v).join(isConj ? ' ∧ ' : ' ∨ ');
            let correctMask = 0;
            vars.forEach((_, i) => {
                const varVal = isConj ? signs[i] : !signs[i];
                if (varVal) correctMask |= (1 << i);
            });
            const all = [];
            for (let m = 0; m < (1 << k); m++) all.push(m);
            const poolMasks = millShuffle(all.filter(m => m !== correctMask));
            let i = 0;
            return millFinish(
                'CONDICIONES',
                `¿Cuándo es ${isConj ? 'VERDADERA' : 'FALSA'} la proposición ${label}?`,
                { text: comboText(vars, correctMask) },
                () => ({ text: comboText(vars, poolMasks[(i++) % poolMasks.length]) }),
                null,
                isConj
                    ? `Una conjunción solo es verdadera si todos los literales son V: ${comboText(vars, correctMask)}.`
                    : `Una disyunción solo es falsa si todos los literales son F: ${comboText(vars, correctMask)}.`
            );
        }

        function millB_phrase() {
            const atoms = millShuffle(['llueve', 'estudia', 'aprueba', 'nieva', 'corre', 'come', 'salta', 'trabaja', 'juega', 'viaja']);
            const A = atoms[0], B = atoms[1];
            const letters = millShuffle(MILL_VARS.slice());
            const l1 = letters[0], l2 = letters[1];
            const forms = [
                { s: `No ${A}`, n: ['not', l1] },
                { s: `${A} y ${B}`, n: ['and', l1, l2] },
                { s: `${A} o ${B}`, n: ['or', l1, l2] },
                { s: `No (${A}) y (${B})`, n: ['and', ['not', l1], l2] },
                { s: `${A} y no ${B}`, n: ['and', l1, ['not', l2]] },
                { s: `No (${A} o ${B})`, n: ['not', ['or', l1, l2]] },
                { s: `No (${A} y ${B})`, n: ['not', ['and', l1, l2]] },
                { s: `Si ${A} entonces ${B}`, n: ['imp', l1, l2] },
                { s: `${A} sólo si ${B}`, n: ['imp', l1, l2] },
                { s: `${A} es equivalente a ${B}`, n: ['iff', l1, l2] },
                { s: `No ${A} o ${B}`, n: ['or', ['not', l1], l2] }
            ];
            const f = millPick(forms);
            const correct = millEntry(f.n);
            return millFinish(
                'TRADUCCIÓN ALGO',
                `La frase «${f.s}» se representa lógicamente como:`,
                correct,
                () => millEntry(millRandFormula(2, [l1, l2])),
                c => !propEquiv(c.node, f.n),
                `«${f.s}» ≡ ${propStr(f.n)}`
            );
        }

        function millB_sets() {
            const kind = millPick(['inter', 'union', 'diff', 'cardUnion', 'cardInter']);
            const nums = millShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            const sizeA = 3 + millRnd(2);
            const sizeB = 3 + millRnd(2);
            const A = nums.slice(0, sizeA).sort((x, y) => x - y);
            const B = nums.slice(sizeA, sizeA + sizeB).sort((x, y) => x - y);
            const setStr = s => '{' + s.join(', ') + '}';
            const inter = A.filter(x => B.includes(x));
            const uni = [...new Set([...A, ...B])].sort((x, y) => x - y);
            const dAB = A.filter(x => !B.includes(x));
            const dBA = B.filter(x => !A.includes(x));
            const sym = [...new Set([...dAB, ...dBA])].sort((x, y) => x - y);

            if (kind === 'cardUnion' || kind === 'cardInter') {
                const target = kind === 'cardUnion' ? uni.length : inter.length;
                const poolVals = millShuffle([
                    A.length, B.length, A.length + B.length, A.length + B.length - 2 * inter.length,
                    inter.length, dAB.length, dBA.length, sym.length, uni.length + inter.length,
                    Math.abs(A.length - B.length), dAB.length + dBA.length, uni.length + 1
                ].filter(v => v !== target && v >= 0));
                let i = 0;
                const name = kind === 'cardUnion' ? '|A ∪ B|' : '|A ∩ B|';
                return millFinish(
                    'CONJUNTOS',
                    `Si A = ${setStr(A)} y B = ${setStr(B)}, ¿cuántos elementos tiene ${name}?`,
                    { text: String(target), value: target },
                    () => { const v = poolVals[i++ % poolVals.length]; return { text: String(v), value: v }; },
                    null,
                    kind === 'cardUnion'
                        ? `|A ∪ B| = |A| + |B| − |A ∩ B| = ${A.length} + ${B.length} − ${inter.length} = ${target}.`
                        : `A ∩ B = ${setStr(inter)}, así que tiene ${target} elemento${target === 1 ? '' : 's'}.`
                );
            }

            let correctText, explain, candidates;
            if (kind === 'inter') {
                correctText = setStr(inter);
                explain = `A ∩ B se queda solo con los elementos comunes: ${correctText}.`;
                candidates = [uni, inter, dAB, dBA, sym];
            } else if (kind === 'union') {
                correctText = setStr(uni);
                explain = `A ∪ B junta todos los elementos sin repetir: ${correctText}.`;
                candidates = [uni, inter, dAB, dBA, sym];
            } else {
                correctText = setStr(dAB);
                explain = `A − B quita de A lo que está en B: ${correctText}.`;
                candidates = [uni, inter, dAB, dBA, sym];
            }
            const op = kind === 'inter' ? 'A ∩ B' : kind === 'union' ? 'A ∪ B' : 'A − B';
            return millFinish(
                'CONJUNTOS',
                `Si A = ${setStr(A)} y B = ${setStr(B)}, ¿cuál es ${op}?`,
                { text: correctText },
                () => ({ text: setStr(millPick(candidates)) }),
                null,
                explain
            );
        }

        const MILL_BUILDERS = {
            phrase: millB_phrase,
            evalTrue: millB_evalTrue,
            equiv: millB_equiv,
            negate: millB_negate,
            tautology: millB_tautology,
            contradiction: millB_contradiction,
            contingency: millB_contingency,
            countTrue: millB_countTrue,
            impFalse: millB_impFalse,
            sets: millB_sets
        };

        function millTemplatePool() {
            if (millDifficulty === 'easy') return ['phrase', 'impFalse', 'sets', 'negate', 'evalTrue'];
            if (millDifficulty === 'normal') return ['evalTrue', 'equiv', 'countTrue', 'tautology', 'negate', 'sets', 'impFalse', 'phrase'];
            return ['equiv', 'negate', 'tautology', 'contradiction', 'contingency', 'countTrue', 'sets'];
        }

        // Generador principal: siempre distinto (firma única) y verificado
        function generateMillionQuestion() {
            const pool = millTemplatePool();
            for (let attempt = 0; attempt < 50; attempt++) {
                const name = millPick(pool);
                if (attempt < 10 && name === millLastTemplate && pool.length > 1) continue;
                let q = null;
                try { q = MILL_BUILDERS[name](); } catch (err) { q = null; }
                if (!q || !q.options || q.options.length !== 4 || q.correctIdx < 0 || q.correctIdx > 3) continue;
                const sig = q.category + '|' + q.text + '|' + q.options.slice().sort().join(' ~ ');
                if (millSeen.has(sig)) continue;
                millSeen.add(sig);
                if (millSeen.size > 500) millSeen.delete(millSeen.values().next().value);
                millLastTemplate = name;
                return q;
            }
            return {
                category: 'LÓGICA PROPOSICIONAL',
                text: '¿Cuál de estas proposiciones es una tautología?',
                options: ['p ∨ ¬p', 'p ∧ ¬p', 'p → ¬p', 'p ∧ p'],
                correctIdx: 0,
                explain: 'p ∨ ¬p es siempre verdadera: es el principio del tercero excluido.'
            };
        }

        // ---------------- Ciclo de juego ----------------
        function hideMillionGameOver() {
            const overlay = document.getElementById('million-gameover');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        function closeMillionGameOver() {
            hideMillionGameOver();
            if (currentMode === 'millonario') startMillionRun();
        }

        function restartMillionGame() {
            playSFX('pickup');
            startMillionRun();
        }

        function updateMillionDifficultyButtons() {
            const defs = [
                { id: 'btn-mil-easy', active: 'bg-emerald-500 text-slate-950', key: 'easy' },
                { id: 'btn-mil-normal', active: 'bg-amber-400 text-slate-950', key: 'normal' },
                { id: 'btn-mil-hard', active: 'bg-rose-500 text-white', key: 'hard' }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === millDifficulty
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setMillDifficulty(diff) {
            millDifficulty = diff;
            updateMillionDifficultyButtons();
            if (currentMode !== 'millonario') return;
            playSFX('pickup');
            startMillionRun();
        }

        function updateMillionLivesButtons() {
            [1, 2, 3].forEach(n => {
                const el = document.getElementById('btn-mil-lives-' + n);
                if (!el) return;
                el.className = n === millLivesMax
                    ? 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition bg-rose-500 text-white'
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setMillLives(n) {
            millLivesMax = n;
            updateMillionLivesButtons();
            if (currentMode !== 'millonario') return;
            playSFX('pickup');
            startMillionRun();
        }

        function updateMillionLivesHUD() {
            const el = document.getElementById('million-lives');
            if (!el) return;
            let html = '';
            for (let i = 0; i < millLivesMax; i++) {
                html += i < millLives
                    ? '<i class="fa-solid fa-heart"></i>'
                    : '<i class="fa-regular fa-heart text-slate-600"></i>';
            }
            el.innerHTML = html;
        }

        function refreshMillionReady() {
            const answers = document.getElementById('million-answers');
            if (answers) {
                if (awaitingStart) answers.classList.add('opacity-50', 'pointer-events-none');
                else answers.classList.remove('opacity-50', 'pointer-events-none');
            }
            updateMillionLifelines();
        }

        function updateMillionLifelines() {
            const canUse = !millGameOver && !millLocked && !awaitingStart;
            const b50 = document.getElementById('btn-mil-5050');
            if (b50) {
                const off = millFiftyUsed || !canUse;
                b50.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold transition border ' +
                    (off ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/30');
            }
            const bPub = document.getElementById('btn-mil-public');
            if (bPub) {
                const off = millPublicUsed || !canUse;
                bPub.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold transition border ' +
                    (off ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30');
            }
            const top = getLeaderboard('millonario');
            millSetText('million-best', top && top[0] ? String(top[0].score) : '0');
        }

        const MILL_ANSWER_BASE = 'hud-interactive text-left flex items-center gap-3 rounded-xl px-4 py-3.5 transition shadow-lg border-2 bg-slate-950/90 border-yellow-500/40 hover:border-yellow-300 hover:bg-yellow-500/10';
        const MILL_LETTERS = ['A', 'B', 'C', 'D'];

        function renderMillionQuestion() {
            const q = millQuestion;
            if (!q) return;
            millSetText('million-category', q.category);
            millSetText('million-rung', `${Math.min(millRung + 1, MILL_TOTAL)} / ${MILL_TOTAL}`);
            millSetText('million-prize', millFormat(MILL_PRIZES[Math.min(millRung, MILL_TOTAL - 1)]) + ' pts');
            millSetText('million-question', q.text);
            millRemoved = new Set();
            for (let i = 0; i < 4; i++) {
                const b = document.getElementById('million-ans-' + i);
                const t = document.getElementById('million-ans-text-' + i);
                if (t) t.textContent = q.options[i];
                if (b) {
                    b.className = MILL_ANSWER_BASE;
                    b.classList.remove('hidden');
                    b.disabled = false;
                }
                const badge = document.getElementById('million-ans-letter-' + i);
                if (badge) badge.className = 'w-8 h-8 shrink-0 rounded-md bg-yellow-400 text-slate-950 font-extrabold text-sm flex items-center justify-center';
            }
            const exp = document.getElementById('million-explain');
            if (exp) { exp.classList.add('hidden'); exp.textContent = ''; }
            const pub = document.getElementById('million-public');
            if (pub) { pub.classList.add('hidden'); pub.classList.remove('block'); }
            updateMillionLifelines();
        }

        function nextMillionQuestion() {
            millSeq++;
            millQuestion = generateMillionQuestion();
            millLocked = false;
            roundTimer = millTime();
            document.getElementById('hud-timer').textContent = `${roundTimer}s`;
            updateBigTimer();
            renderMillionQuestion();
            refreshMillionReady();
        }

        function startMillionRun() {
            millSeq++;
            millGameOver = false;
            millRung = 0;
            millLives = millLivesMax;
            millLocked = false;
            millFiftyUsed = false;
            millPublicUsed = false;
            millQuestion = null;
            modeScores.millonario = 0;
            globalStreak = 0;
            statHits = 0;
            statMisses = 0;
            document.getElementById('hud-score').textContent = '0';
            document.getElementById('hud-streak').textContent = 'x1';
            document.getElementById('hud-accuracy-stats').textContent = `✔ 0/${MILL_TOTAL}`;
            roundTimer = millTime();
            hideMillionGameOver();
            updateMillionDifficultyButtons();
            updateMillionLivesButtons();
            updateMillionLivesHUD();
            millQuestion = generateMillionQuestion();
            renderMillionQuestion();
            updateBigTimer();
            armStartHint();
            refreshMillionReady();
        }

        function showMillionExplain(text, ok) {
            const el = document.getElementById('million-explain');
            if (!el) return;
            el.textContent = text;
            el.className = 'text-[11px] leading-snug rounded-xl px-3 py-2 mono-font border ' +
                (ok
                    ? 'text-emerald-200 bg-emerald-950/85 border-emerald-500/40'
                    : 'text-rose-200 bg-rose-950/85 border-rose-500/40');
        }

        function answerMillion(idx) {
            if (awaitingStart && !landingVisible()) {
                awaitingStart = false;
                hideStartHint();
                playSFX('pickup');
                updateBigTimer();
                refreshMillionReady();
                return;
            }
            if (millGameOver || millLocked || !millQuestion) return;
            if (idx < 0 || idx > 3 || millRemoved.has(idx)) return;

            millLocked = true;
            const seq = ++millSeq;
            const q = millQuestion;
            const correctIdx = q.correctIdx;
            const isCorrect = idx === correctIdx;

            const paint = (i, cls) => {
                const b = document.getElementById('million-ans-' + i);
                if (b) b.className = MILL_ANSWER_BASE + ' ' + cls;
            };
            paint(correctIdx, 'border-emerald-400 bg-emerald-500/25');
            if (!isCorrect) paint(idx, 'border-rose-400 bg-rose-500/25');

            if (isCorrect) {
                millRung++;
                modeScores.millonario = MILL_PRIZES[millRung - 1];
                statHits++;
                globalStreak++;
                const mult = streakMultiplier(globalStreak);
                playSFX('success');
                showHitPopup(`+${millFormat(MILL_PRIZES[millRung - 1])}`, true, mult > 1 ? `x${mult} COMBO` : '¡CORRECTA!');
                showMillionExplain(q.explain, true);
                document.getElementById('hud-score').textContent = modeScores.millonario;
                document.getElementById('hud-streak').textContent = `x${mult}`;
                document.getElementById('hud-accuracy-stats').textContent = `✔ ${statHits}/${MILL_TOTAL}`;
                if (millRung >= MILL_TOTAL) {
                    setTimeout(() => { if (seq === millSeq) endMillionGame(true); }, 1500);
                } else {
                    setTimeout(() => { if (seq === millSeq) nextMillionQuestion(); }, 1700);
                }
            } else {
                statMisses++;
                globalStreak = 0;
                playSFX('error');
                showMillionExplain(`${q.explain}  →  La buena era la ${MILL_LETTERS[correctIdx]}.`, false);
                document.getElementById('hud-streak').textContent = 'x1';
                millLives = Math.max(0, millLives - 1);
                updateMillionLivesHUD();
                if (millLives > 0) {
                    showHitPopup('-1 ❤️', false, `VIDAS RESTANTES: ${millLives}`);
                    setTimeout(() => { if (seq === millSeq) nextMillionQuestion(); }, 2100);
                } else {
                    showHitPopup('¡SIN VIDAS!', false, 'FIN DEL JUEGO');
                    setTimeout(() => { if (seq === millSeq) endMillionGame(false); }, 2100);
                }
            }
            updateMillionLifelines();
        }

        function useMillionFifty() {
            if (millFiftyUsed || millGameOver || millLocked || awaitingStart || !millQuestion) return;
            millFiftyUsed = true;
            playSFX('pickup');
            const wrong = millShuffle([0, 1, 2, 3].filter(i => i !== millQuestion.correctIdx && !millRemoved.has(i)));
            wrong.slice(0, 2).forEach(i => {
                millRemoved.add(i);
                const b = document.getElementById('million-ans-' + i);
                if (b) b.classList.add('hidden');
            });
            updateMillionLifelines();
        }

        function useMillionPublic() {
            if (millPublicUsed || millGameOver || millLocked || awaitingStart || !millQuestion) return;
            millPublicUsed = true;
            playSFX('pickup');
            const visible = [0, 1, 2, 3].filter(i => !millRemoved.has(i));
            const correctIdx = millQuestion.correctIdx;
            const base = millDifficulty === 'easy' ? 0.72 : millDifficulty === 'normal' ? 0.58 : 0.45;
            const correctW = Math.min(0.85, base + Math.random() * 0.12);
            const others = visible.filter(i => i !== correctIdx);
            const weights = {};
            let total = 0;
            others.forEach(i => { const v = Math.random() + 0.12; weights[i] = v; total += v; });
            const pct = [0, 0, 0, 0];
            let used = 0;
            others.forEach(i => {
                pct[i] = Math.round((weights[i] / total) * (1 - correctW) * 100);
                used += pct[i];
            });
            if (visible.includes(correctIdx)) pct[correctIdx] = Math.max(0, 100 - used);

            const rows = document.getElementById('million-public-rows');
            if (rows) {
                rows.innerHTML = visible.map(i => `
                    <div class="flex items-center gap-2">
                        <span class="w-5 h-5 shrink-0 rounded bg-yellow-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">${MILL_LETTERS[i]}</span>
                        <div class="flex-1 h-3 bg-slate-800 rounded overflow-hidden">
                            <div class="h-full bg-emerald-400 rounded" style="width:${pct[i]}%"></div>
                        </div>
                        <span class="mono-font text-[10px] font-bold text-slate-300 w-9 text-right">${pct[i]}%</span>
                    </div>`).join('');
            }
            const box = document.getElementById('million-public');
            if (box) { box.classList.remove('hidden'); box.classList.add('block'); }
            updateMillionLifelines();
        }

        function millSafeScore(completed) {
            if (completed >= 10) return MILL_SAFE[10];
            if (completed >= 5) return MILL_SAFE[5];
            return 0;
        }

        function handleMillionTimeout() {
            if (millGameOver || millLocked || !millQuestion) return;
            millLocked = true;
            const seq = ++millSeq;
            const q = millQuestion;
            const correctIdx = q.correctIdx;
            const b = document.getElementById('million-ans-' + correctIdx);
            if (b) b.className = MILL_ANSWER_BASE + ' border-emerald-400 bg-emerald-500/25';
            statMisses++;
            globalStreak = 0;
            playSFX('error');
            showMillionExplain(`${q.explain}  →  Se acabó el tiempo. La buena era la ${MILL_LETTERS[correctIdx]}.`, false);
            document.getElementById('hud-streak').textContent = 'x1';
            millLives = Math.max(0, millLives - 1);
            updateMillionLivesHUD();
            if (millLives > 0) {
                showHitPopup('¡TIEMPO!', false, `PIERDES UNA VIDA · QUEDAN ${millLives}`);
                setTimeout(() => { if (seq === millSeq) nextMillionQuestion(); }, 2100);
            } else {
                showHitPopup('¡SIN VIDAS!', false, 'FIN DEL JUEGO');
                setTimeout(() => { if (seq === millSeq) endMillionGame(false); }, 2100);
            }
            updateMillionLifelines();
        }

        function endMillionGame(won) {
            if (millGameOver) return;
            millGameOver = true;
            millLocked = true;
            millSeq++;
            let finalScore = modeScores.millonario || 0;
            if (!won) {
                finalScore = millSafeScore(millRung);
                modeScores.millonario = finalScore;
                playSFX('error');
                showHitPopup(won ? '' : '¡SE ACABÓ!', false, finalScore > 0 ? `PREMIO SEGURO: ${millFormat(finalScore)}` : 'SIN PREMIO');
            } else {
                playSFX('success');
            }
            roundTimer = 0;
            document.getElementById('hud-timer').textContent = '0s';
            updateBigTimer();
            document.getElementById('hud-score').textContent = modeScores.millonario;
            document.getElementById('hud-accuracy-stats').textContent = `✔ ${statHits}/${MILL_TOTAL}`;
            savePlayerToLeaderboard();
            renderLeaderboardUI();
            updateMillionLifelines();

            const overlay = document.getElementById('million-gameover');
            if (overlay) {
                const maxScore = getLeaderboard('millonario').reduce((m, p) => Math.max(m, p.score), 0);
                millSetText('million-gameover-title', won ? '¡MILLÓN ALCANZADO!' : '¡FIN DEL JUEGO!');
                const icon = document.getElementById('million-gameover-icon');
                if (icon) icon.className = won
                    ? 'fa-solid fa-crown text-yellow-300 text-4xl mb-3 animate-bounce'
                    : 'fa-solid fa-hourglass-end text-yellow-300 text-4xl mb-3';
                millSetText('million-gameover-score', `${millFormat(modeScores.millonario)} pts`);
                millSetText('million-gameover-best', `${millFormat(Math.max(maxScore, modeScores.millonario))} pts`);
                millSetText('million-gameover-answered', `${statHits} / ${MILL_TOTAL}`);
                millSetText('million-gameover-prize', millFormat(millSafeScore(millRung)));
                millSetText('million-gameover-msg', won
                    ? '¡Increíble! Llegaste al millón con pura lógica proposicional.'
                    : finalScore > 0
                        ? `Respaldaste el escalón seguro: conservas ${millFormat(finalScore)} puntos.`
                        : 'Casi... vuelve a intentarlo, las preguntas son siempre distintas.');
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        }

        // ---------------- Plató 3D (mesa a la derecha + chef) ----------------
        function build3DMillionArena() {
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x141026, roughness: 0.55, metalness: 0.25 });
            const floor = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 46), floorMat);
            floor.position.y = -0.27;
            floor.receiveShadow = true;
            millionGroup.add(floor);

            const ringMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.55, roughness: 0.35 });
            [7.5, 11].forEach(r => {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 8, 72), ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = 0.05;
                ring.receiveShadow = true;
                millionGroup.add(ring);
            });

            const stageMat = new THREE.MeshStandardMaterial({ color: 0x2a1f4a, roughness: 0.45, metalness: 0.2 });
            const stage = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.2, 0.1, 56), stageMat);
            stage.position.y = -0.05;
            stage.receiveShadow = true;
            millionGroup.add(stage);

            // Muro de fondo con tiras doradas
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1533, roughness: 0.8 });
            const wall = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 0.6), wallMat);
            wall.position.set(0, 5, -9.5);
            wall.receiveShadow = true;
            millionGroup.add(wall);
            for (let i = -7; i <= 7; i++) {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9.4, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.45, roughness: 0.4 }));
                strip.position.set(i * 2.2, 5, -9.15);
                millionGroup.add(strip);
            }

            // Gran pantalla del plató
            const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.4, 0.35),
                new THREE.MeshStandardMaterial({ color: 0x0b0819, roughness: 0.6 }));
            screenFrame.position.set(-3.4, 4.6, -9.0);
            millionGroup.add(screenFrame);
            const screenMat = new THREE.MeshStandardMaterial({ color: 0x111a3a, emissive: 0x1d4ed8, emissiveIntensity: 0.35, roughness: 0.3 });
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 4.8), screenMat);
            screen.position.set(-3.4, 4.6, -8.8);
            millionGroup.add(screen);
            millionAnimated.push({
                update: (el) => { screenMat.emissiveIntensity = 0.28 + Math.abs(Math.sin(el * 1.4)) * 0.28; }
            });

            // Celosía superior con focos
            const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
            const truss = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 0.3), trussMat);
            truss.position.set(0, 8.4, -3);
            millionGroup.add(truss);
            const beamPositions = [[-7, -3], [-1.5, -2.5], [3.2, -2], [8, -3]];
            const coneMat = new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
            beamPositions.forEach((pos, i) => {
                const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.5, 12), trussMat);
                fixture.position.set(pos[0], 8.1, pos[1]);
                millionGroup.add(fixture);
                const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 7.4, 20, 1, true), coneMat);
                cone.position.set(pos[0], 4.4, pos[1]);
                millionGroup.add(cone);
                millionAnimated.push({
                    update: (el) => { cone.material.opacity = 0.045 + Math.abs(Math.sin(el * 2 + i)) * 0.04; }
                });
            });

            // Mesa del presentador/contestante (derecha) + micrófono
            const desk = new THREE.Group();
            const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x2c2350, roughness: 0.35, metalness: 0.35 });
            const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.5), deskTopMat);
            deskTop.position.y = 1.06;
            deskTop.castShadow = true; deskTop.receiveShadow = true;
            desk.add(deskTop);
            const deskFront = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.14),
                new THREE.MeshStandardMaterial({ color: 0x1b1533, roughness: 0.7 }));
            deskFront.position.set(0, 0.53, 0.68);
            deskFront.castShadow = true;
            desk.add(deskFront);
            const trim = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.09, 0.09),
                new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.6, roughness: 0.3 }));
            trim.position.set(0, 0.98, 0.72);
            desk.add(trim);
            [-1.6, 1.6].forEach(sx => {
                const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 1.4),
                    new THREE.MeshStandardMaterial({ color: 0x1b1533, roughness: 0.7 }));
                side.position.set(sx, 0.5, 0);
                side.castShadow = true;
                desk.add(side);
            });
            desk.position.set(3.2, 0, 0.9);
            millionGroup.add(desk);

            const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.05, 14),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 }));
            micBase.position.set(2.4, 1.17, 0.75);
            millionGroup.add(micBase);
            const micStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8),
                new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 }));
            micStem.position.set(2.4, 1.38, 0.75);
            micStem.rotation.z = -0.3;
            millionGroup.add(micStem);
            const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 }));
            micHead.position.set(2.32, 1.58, 0.75);
            millionGroup.add(micHead);

            // Público (siluetas) al fondo
            const crowdColors = [0x1f2937, 0x27324a, 0x1e2a3d, 0x2d2440, 0x334155];
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 15; i++) {
                    const g = new THREE.Group();
                    const bodyMatM = new THREE.MeshStandardMaterial({ color: millPick(crowdColors), roughness: 0.9 });
                    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.0, 8), bodyMatM);
                    body.position.y = 0.5;
                    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10),
                        new THREE.MeshStandardMaterial({ color: 0xd9b48f, roughness: 0.85 }));
                    head.position.y = 1.15;
                    const aL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6), bodyMatM);
                    aL.position.set(-0.42, 0.72, 0); aL.rotation.z = 0.45;
                    const aR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6), bodyMatM);
                    aR.position.set(0.42, 0.72, 0); aR.rotation.z = -0.45;
                    g.add(body); g.add(head); g.add(aL); g.add(aR);
                    g.position.set(-12 + i * 1.7 + (row ? 0.85 : 0), row === 1 ? 0.35 : 0, -7.6 + row * -1.4);
                    millionGroup.add(g);
                    const phase = Math.random() * Math.PI * 2;
                    millionAnimated.push({
                        update: (el) => { g.position.y = (row === 1 ? 0.35 : 0) + Math.abs(Math.sin(el * 1.8 + phase)) * 0.07; }
                    });
                }
            }

            // Monedas doradas flotantes
            const coinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, metalness: 0.9, roughness: 0.2, emissive: 0xb45309, emissiveIntensity: 0.35 });
            const coinSpots = [[0.5, 3.4, -3.5], [6.5, 3.8, -4.5], [-2.5, 4.6, -5.5], [7.6, 2.6, -1.2], [1.8, 5.2, -6.5]];
            coinSpots.forEach((c, i) => {
                const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 22), coinMat);
                coin.rotation.x = Math.PI / 2;
                coin.position.set(c[0], c[1], c[2]);
                coin.castShadow = true;
                millionGroup.add(coin);
                millionAnimated.push({
                    update: (el, dt) => {
                        coin.rotation.z += dt * 1.6;
                        coin.position.y = c[1] + Math.sin(el * 1.5 + i) * 0.25;
                    }
                });
            });

            // Luz propia del plató (con sombras)
            const key = new THREE.DirectionalLight(0xfff3c4, 1.15);
            key.position.set(-120 + 7, 12, 10);
            key.target.position.set(-120 + 2, 1, 0);
            key.castShadow = true;
            key.shadow.mapSize.set(1024, 1024);
            key.shadow.camera.left = -12;
            key.shadow.camera.right = 12;
            key.shadow.camera.top = 12;
            key.shadow.camera.bottom = -12;
            key.shadow.camera.near = 1;
            key.shadow.camera.far = 45;
            scene.add(key);
            scene.add(key.target);

            const warm = new THREE.PointLight(0xffc966, 1.15, 26, 2);
            warm.position.set(-120 + 3.2, 4.6, 3);
            scene.add(warm);
            millionAnimated.push({ update: (el) => { warm.intensity = 1.05 + Math.sin(el * 2) * 0.15; } });

            const cool = new THREE.PointLight(0x8b5cf6, 0.9, 30, 2);
            cool.position.set(-120 - 7, 5, -5);
            scene.add(cool);
        }

        // ============================================================
        //  DUELO REVÓLVER (modo duelo) — 2 jugadores con ruleta rusa
        // ============================================================
        const duelGroup = new THREE.Group();
        duelGroup.position.set(-180, 0, 0);
        scene.add(duelGroup);
        const duelAnimated = [];
        let duelRivalFigure = null;

        const DUEL_TIMES = { easy: 35, normal: 28, hard: 20 };
        const DUEL_CHAMBERS = 6;
        const DUEL_LETTERS = ['A', 'B', 'C', 'D'];
        const DUEL_POWER_KEYS = ['rival', 'self', 'reroll'];
        const DUEL_ANSWER_BASE = 'hud-interactive text-left flex items-center gap-3 rounded-xl px-4 py-3.5 transition shadow-lg border-2 bg-slate-950/90 border-orange-500/40 hover:border-orange-300 hover:bg-orange-500/10';
        const DUEL_EXPLAIN_BASE = 'text-[11px] leading-snug rounded-xl px-3 py-2 mono-font border ';

        let duelDifficulty = 'normal';
        let duelLivesMax = 3;
        let duelLives = [3, 3];
        let duelTurn = 0;
        let duelQuestion = null;
        let duelLocked = false;
        let duelGameOver = false;
        let duelPhase = 'question';
        let duelChambers = DUEL_CHAMBERS;
        let duelSeq = 0;
        let duelHits = 0;
        let duelShots = 0;
        let duelPowerUser = 0;

        // Primera persona: cada jugador ve al otro desde sus propios ojos
        // fwd = cuánto avanzar el ojo para quedar fuera de la nariz/cara del modelo
        const DUEL_EYES = [
            { eye: new THREE.Vector3(2.6, 1.86, -0.45), look: new THREE.Vector3(6.6, 1.80, -0.6), fwd: 0.5 },
            { eye: new THREE.Vector3(6.6, 1.80, -0.6), look: new THREE.Vector3(2.6, 1.86, -0.45), fwd: 0.4 }
        ];
        const DUEL_CHEF_EYES = {
            chef: { y: 1.86, fwd: 0.5 },
            oso: { y: 2.36, fwd: 0.86 },
            lobo: { y: 2.32, fwd: 0.88 },
            gato: { y: 2.30, fwd: 0.78 },
            '67': { y: 1.78, fwd: 0.38 },
            tung: { y: 2.06, fwd: 0.72 }
        };

        function updateDuelCamera(elapsed) {
            if (!duelGroup) return;
            if (duelGameOver) {
                camTargetPos.set(duelGroup.position.x + 1.5, 3.4, 9.2);
                camLookAtPos.set(duelGroup.position.x + 4.5, 1.2, -0.3);
                return;
            }
            const p = DUEL_EYES[duelTurn === 1 ? 1 : 0];
            let eyeY = p.eye.y;
            let fwd = p.fwd;
            if (duelTurn === 0) {
                const c = DUEL_CHEF_EYES[chefActiveSpecial] || DUEL_CHEF_EYES.chef;
                eyeY = c.y;
                fwd = c.fwd;
            }
            const dx = p.look.x - p.eye.x;
            const dz = p.look.z - p.eye.z;
            const len = Math.hypot(dx, dz) || 1;
            const swayX = Math.sin(elapsed * 0.9) * 0.02;
            const swayY = Math.cos(elapsed * 1.3) * 0.015;
            camTargetPos.set(
                duelGroup.position.x + p.eye.x + (dx / len) * fwd + swayX,
                eyeY + swayY,
                p.eye.z + (dz / len) * fwd
            );
            camLookAtPos.set(duelGroup.position.x + p.look.x, p.look.y + swayY * 0.5, p.look.z);
        }

        function duelTime() { return DUEL_TIMES[duelDifficulty] || DUEL_TIMES.normal; }
        function duelChance() { return 100 / duelChambers; }
        function duelSetText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

        function duelP2Name() {
            const el = document.getElementById('duel-p2-name');
            const v = el && el.value ? String(el.value).trim() : '';
            return v || 'Invitado';
        }

        function duelName(i) { return i === 0 ? getPlayerName() : duelP2Name(); }

        function duelGenerateQuestion() {
            const prev = millDifficulty;
            millDifficulty = duelDifficulty;
            let q = null;
            try { q = generateMillionQuestion(); } catch (e) { q = null; }
            millDifficulty = prev;
            if (!q || !q.options || q.options.length !== 4) {
                q = {
                    category: 'LÓGICA PROPOSICIONAL',
                    text: '¿Cuál de estas proposiciones es una tautología?',
                    options: ['p ∨ ¬p', 'p ∧ ¬p', 'p → ¬p', 'p ∧ p'],
                    correctIdx: 0,
                    explain: 'p ∨ ¬p es siempre verdadera: es el principio del tercero excluido.'
                };
            }
            return q;
        }

        function renderDuelCylinder() {
            const wrap = document.getElementById('duel-cylinder');
            if (wrap) {
                let html = '';
                for (let i = 1; i <= DUEL_CHAMBERS; i++) {
                    html += '<span class="duel-chamber' + (i <= duelChambers ? ' live' : '') + (i === duelChambers ? ' next' : '') + '"></span>';
                }
                wrap.innerHTML = html;
            }
            duelSetText('duel-chance', duelChance().toFixed(0) + '%');
            duelSetText('duel-cylinder-hud', duelChambers + ' / ' + DUEL_CHAMBERS);
        }

        function renderDuelLives() {
            for (let i = 0; i < 2; i++) {
                const el = document.getElementById('duel-p' + (i + 1) + '-lives');
                if (!el) continue;
                let html = '';
                for (let k = 0; k < duelLivesMax; k++) {
                    html += k < duelLives[i]
                        ? '<i class="fa-solid fa-heart"></i>'
                        : '<i class="fa-regular fa-heart text-slate-600"></i>';
                }
                el.innerHTML = html;
            }
            duelSetText('duel-p1-tag', 'J1 · ' + duelName(0));
            duelSetText('duel-p2-tag', 'J2 · ' + duelName(1));
        }

        function renderDuelTurn() { duelSetText('duel-turn', 'TURNO: ' + duelName(duelTurn)); }

        function renderDuelHud() {
            renderDuelLives();
            renderDuelTurn();
            renderDuelCylinder();
            duelSetText('duel-score', modeScores.duelo || 0);
            const hs = document.getElementById('hud-score');
            if (hs) hs.textContent = modeScores.duelo || 0;
        }

        function duelAddScore(pts) {
            modeScores.duelo = Math.max(0, (modeScores.duelo || 0) + pts);
            duelSetText('duel-score', modeScores.duelo);
            const hs = document.getElementById('hud-score');
            if (hs) hs.textContent = modeScores.duelo;
        }

        function duelShowPower(title) {
            duelPhase = 'power';
            duelSetText('duel-power-title', title);
            const p = document.getElementById('duel-power');
            if (p) p.classList.remove('hidden');
        }

        function duelHidePower() {
            const p = document.getElementById('duel-power');
            if (p) p.classList.add('hidden');
        }

        function duelShowExplain(text, ok) {
            const el = document.getElementById('duel-explain');
            if (!el) return;
            el.textContent = text;
            el.className = DUEL_EXPLAIN_BASE + (ok
                ? 'text-emerald-200 bg-emerald-950/85 border-emerald-500/40'
                : 'text-rose-200 bg-rose-950/85 border-rose-500/40');
        }

        function duelSetAnswersEnabled(enabled) {
            for (let i = 0; i < 4; i++) {
                const b = document.getElementById('duel-ans-' + i);
                if (b) b.disabled = !enabled;
            }
        }

        function duelFlash(kind) {
            const el = document.getElementById('duel-flash');
            if (!el) return;
            el.classList.remove('duel-flash-bang', 'duel-flash-dry');
            void el.offsetWidth;
            el.classList.add(kind === 'bang' ? 'duel-flash-bang' : 'duel-flash-dry');
        }

        function refreshDuelReady() {
            const answers = document.getElementById('duel-answers');
            if (answers) {
                answers.classList.toggle('opacity-50', awaitingStart);
                answers.classList.toggle('pointer-events-none', awaitingStart);
            }
            duelSetAnswersEnabled(!awaitingStart);
        }

        function renderDuelQuestion() {
            const q = duelQuestion;
            if (!q) return;
            duelSetText('duel-category', q.category);
            duelSetText('duel-question', q.text);
            for (let i = 0; i < 4; i++) {
                const t = document.getElementById('duel-ans-text-' + i);
                if (t) t.textContent = q.options[i];
                const b = document.getElementById('duel-ans-' + i);
                if (b) { b.className = DUEL_ANSWER_BASE; b.disabled = false; }
                const badge = document.getElementById('duel-ans-letter-' + i);
                if (badge) badge.className = 'w-8 h-8 shrink-0 rounded-md bg-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center';
            }
            duelHidePower();
            const exp = document.getElementById('duel-explain');
            if (exp) { exp.textContent = ''; exp.className = DUEL_EXPLAIN_BASE + 'hidden'; }
            duelPhase = 'question';
            renderDuelHud();
        }

        function startDuelRun() {
            duelSeq++;
            duelGameOver = false;
            duelLocked = false;
            duelPhase = 'question';
            duelTurn = 0;
            duelLives = [duelLivesMax, duelLivesMax];
            duelChambers = DUEL_CHAMBERS;
            duelHits = 0;
            duelShots = 0;
            duelPowerUser = 0;
            duelQuestion = null;
            modeScores.duelo = 0;
            globalStreak = 0;
            statHits = 0;
            statMisses = 0;
            const hs = document.getElementById('hud-score');
            if (hs) hs.textContent = '0';
            const hst = document.getElementById('hud-streak');
            if (hst) hst.textContent = 'x1';
            const ha = document.getElementById('hud-accuracy-stats');
            if (ha) ha.textContent = '✔ 0 | ✖ 0';
            roundTimer = duelTime();
            const ht = document.getElementById('hud-timer');
            if (ht) ht.textContent = roundTimer + 's';
            hideDuelGameOver();
            updateDuelDifficultyButtons();
            updateDuelLivesButtons();
            duelQuestion = duelGenerateQuestion();
            renderDuelQuestion();
            renderDuelHud();
            updateBigTimer();
            armStartHint();
            refreshDuelReady();
        }

        function nextDuelQuestion() {
            duelSeq++;
            duelQuestion = duelGenerateQuestion();
            duelLocked = false;
            duelPhase = 'question';
            roundTimer = duelTime();
            const ht = document.getElementById('hud-timer');
            if (ht) ht.textContent = roundTimer + 's';
            renderDuelQuestion();
            updateBigTimer();
            refreshDuelReady();
        }

        function answerDuel(idx) {
            if (awaitingStart && !landingVisible()) {
                awaitingStart = false;
                hideStartHint();
                playSFX('pickup');
                updateBigTimer();
                refreshDuelReady();
                return;
            }
            if (duelGameOver || duelLocked || duelPhase !== 'question' || !duelQuestion) return;
            if (idx < 0 || idx > 3) return;

            duelLocked = true;
            const seq = ++duelSeq;
            const q = duelQuestion;
            const isCorrect = idx === q.correctIdx;

            const paint = (i, cls) => {
                const b = document.getElementById('duel-ans-' + i);
                if (b) b.className = DUEL_ANSWER_BASE + ' ' + cls;
            };
            paint(q.correctIdx, 'border-emerald-400 bg-emerald-500/25');
            if (!isCorrect) paint(idx, 'border-rose-400 bg-rose-500/25');
            duelSetAnswersEnabled(false);

            const who = duelName(duelTurn);
            const hst = document.getElementById('hud-streak');
            const ha = document.getElementById('hud-accuracy-stats');

            if (isCorrect) {
                duelHits++;
                statHits++;
                globalStreak++;
                const mult = streakMultiplier(globalStreak);
                const pts = Math.round(100 * mult);
                duelAddScore(pts);
                playSFX('success');
                showHitPopup('+' + pts, true, mult > 1 ? `x${mult} COMBO` : '¡CORRECTA!', 2000);
                duelShowExplain(q.explain, true);
                if (hst) hst.textContent = `x${mult}`;
                if (ha) ha.textContent = `✔ ${statHits} | ✖ ${statMisses}`;
                duelPowerUser = duelTurn;
                renderDuelHud();
                setTimeout(() => {
                    if (seq === duelSeq && !duelGameOver && currentMode === 'duelo') {
                        duelShowPower(`¡${who} ganó la pregunta! Elige su jugada (teclas 1-3)`);
                    }
                }, 2400);
            } else {
                statMisses++;
                globalStreak = 0;
                playSFX('error');
                showHitPopup('¡FALLASTE!', false, who.toUpperCase() + ' SE DISPARA', 2600);
                duelShowExplain(`${q.explain} → La buena era la ${DUEL_LETTERS[q.correctIdx]}. ${who} pierde y se dispara a sí mismo.`, false);
                if (hst) hst.textContent = 'x1';
                if (ha) ha.textContent = `✔ ${statHits} | ✖ ${statMisses}`;
                renderDuelHud();
                setTimeout(() => {
                    if (seq === duelSeq && !duelGameOver && currentMode === 'duelo') resolveDuelShot(duelTurn, 'fallaste la pregunta', false);
                }, 2800);
            }
        }

        function handleDuelTimeout() {
            if (duelGameOver || duelLocked || duelPhase !== 'question' || !duelQuestion) return;
            duelLocked = true;
            const seq = ++duelSeq;
            const q = duelQuestion;
            const paint = (i, cls) => {
                const b = document.getElementById('duel-ans-' + i);
                if (b) b.className = DUEL_ANSWER_BASE + ' ' + cls;
            };
            paint(q.correctIdx, 'border-emerald-400 bg-emerald-500/25');
            duelSetAnswersEnabled(false);
            statMisses++;
            globalStreak = 0;
            playSFX('error');
            const who = duelName(duelTurn);
            showHitPopup('¡TIEMPO!', false, who.toUpperCase() + ' SE DISPARA', 2600);
            duelShowExplain(`Se acabó el tiempo. ${who} pierde el turno y se dispara. La buena era la ${DUEL_LETTERS[q.correctIdx]}.`, false);
            const hst = document.getElementById('hud-streak');
            const ha = document.getElementById('hud-accuracy-stats');
            if (hst) hst.textContent = 'x1';
            if (ha) ha.textContent = `✔ ${statHits} | ✖ ${statMisses}`;
            renderDuelHud();
            setTimeout(() => {
                if (seq === duelSeq && !duelGameOver && currentMode === 'duelo') resolveDuelShot(duelTurn, 'se le acabó el tiempo', false);
            }, 2800);
        }

        function resolveDuelShot(targetIdx, reason, selfGlory, attackerIdx) {
            if (duelGameOver) return;
            duelShots++;
            const seq = ++duelSeq;
            duelPhase = 'shot';
            duelHidePower();
            duelSetAnswersEnabled(false);

            const chance = 1 / duelChambers;
            const bang = Math.random() < chance;
            const who = duelName(targetIdx);
            const attacker = typeof attackerIdx === 'number' ? attackerIdx : -1;

            if (bang) {
                playSFX('shot');
                duelFlash('bang');
                duelLives[targetIdx] = Math.max(0, duelLives[targetIdx] - 1);
                duelChambers = DUEL_CHAMBERS;
                const killBonus = (attacker >= 0 && attacker !== targetIdx) ? 150 : 0;
                if (killBonus) duelAddScore(killBonus);
                showHitPopup('¡BANG!', false, who.toUpperCase() + ' PIERDE 1 VIDA' + (killBonus ? ` +${killBonus} PTS` : ''), 2400);
                duelShowExplain(`¡BANG! ${who} se dio (${reason}) y pierde 1 vida: le quedan ${duelLives[targetIdx]}.${killBonus ? ` ${duelName(attacker)} suma +${killBonus} pts.` : ''} Se cambia el cartucho completo, cilindro a ${DUEL_CHAMBERS}.`, false);
                renderDuelHud();
                if (duelLives[targetIdx] <= 0) {
                    setTimeout(() => { if (seq === duelSeq && !duelGameOver) endDuelGame(1 - targetIdx); }, 2600);
                    return;
                }
            } else {
                playSFX('click');
                duelFlash('dry');
                duelChambers = Math.max(1, duelChambers - 1);
                if (selfGlory) {
                    duelAddScore(100);
                    showHitPopup('+100', true, 'VALENTÍA: SOBREVIVISTE', 2200);
                } else {
                    showHitPopup('click…', true, 'CILINDRO: ' + duelChambers + '/' + DUEL_CHAMBERS, 2200);
                }
                duelShowExplain(`Click: recámara vacía para ${who} (${reason}; probabilidad ${Math.round(chance * 100)}%). Quedan ${duelChambers} recámaras.${selfGlory ? ' Valentía +100 pts.' : ''}`, true);
                renderDuelHud();
            }
            setTimeout(() => {
                if (seq === duelSeq && !duelGameOver && currentMode === 'duelo') nextDuelTurn();
            }, 2600);
        }

        function nextDuelTurn() {
            duelTurn = 1 - duelTurn;
            nextDuelQuestion();
        }

        function duelShoot(kind) {
            if (duelGameOver || duelPhase !== 'power' || awaitingStart) return;
            const shooter = duelPowerUser;
            if (kind === 'reroll') {
                duelChambers = DUEL_CHAMBERS;
                duelHidePower();
                duelPhase = 'shot';
                playSFX('pickup');
                showHitPopup('RECARGA', true, 'CILINDRO A ' + DUEL_CHAMBERS + '/' + DUEL_CHAMBERS, 1900);
                duelShowExplain(`${duelName(shooter)} re-rollea todo el cartucho: cilindro nuevo con ${DUEL_CHAMBERS} recámaras, la probabilidad vuelve al ${Math.round(duelChance())}%.`, true);
                renderDuelHud();
                const seq = duelSeq;
                setTimeout(() => {
                    if (seq === duelSeq && !duelGameOver && currentMode === 'duelo') nextDuelTurn();
                }, 2200);
                return;
            }
            duelPhase = 'shot';
            duelHidePower();
            if (kind === 'self') resolveDuelShot(shooter, 'se dispara a sí mismo por valentía', true, shooter);
            else resolveDuelShot(1 - shooter, 'disparo de ' + duelName(shooter), false, shooter);
        }

        function endDuelGame(winnerIdx) {
            if (duelGameOver) return;
            duelGameOver = true;
            duelLocked = true;
            duelPhase = 'shot';
            duelSeq++;
            duelHidePower();
            duelSetAnswersEnabled(false);

            const winName = duelName(winnerIdx);
            duelAddScore(500);
            playSFX('success');
            showHitPopup('¡' + winName.toUpperCase() + ' GANA!', true, '+500 PTS BONUS', 2800);

            const hst = document.getElementById('hud-streak');
            const ha = document.getElementById('hud-accuracy-stats');
            if (hst) hst.textContent = 'x1';
            if (ha) ha.textContent = `✔ ${statHits} | ✖ ${statMisses}`;
            roundTimer = 0;
            const ht = document.getElementById('hud-timer');
            if (ht) ht.textContent = '0s';
            updateBigTimer();

            renderDuelHud();

            const overlay = document.getElementById('duel-gameover');
            if (overlay) {
                duelSetText('duel-gameover-title', '¡GANÓ ' + winName.toUpperCase() + '!');
                const icon = document.getElementById('duel-gameover-icon');
                if (icon) icon.className = 'fa-solid fa-trophy text-orange-300 text-4xl mb-3 animate-bounce';
                duelSetText('duel-gameover-msg', `El duelo es solo 1 vs 1: no cuenta para ningún Top 10.`);
                duelSetText('duel-gameover-score', (modeScores.duelo || 0) + ' pts');
                duelSetText('duel-gameover-hits', String(duelHits));
                duelSetText('duel-gameover-shots', String(duelShots));
                duelSetText('duel-gameover-lives', duelLives[winnerIdx] + ' / ' + duelLivesMax);
                overlay.classList.remove('hidden');
                overlay.classList.add('flex');
            }
        }

        function hideDuelGameOver() {
            const overlay = document.getElementById('duel-gameover');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }

        function closeDuelGameOver() {
            hideDuelGameOver();
            if (currentMode === 'duelo') startDuelRun();
        }

        function restartDuelGame() {
            playSFX('pickup');
            startDuelRun();
        }

        function updateDuelDifficultyButtons() {
            const defs = [
                { id: 'btn-duel-easy', active: 'bg-emerald-500 text-slate-950', key: 'easy' },
                { id: 'btn-duel-normal', active: 'bg-amber-400 text-slate-950', key: 'normal' },
                { id: 'btn-duel-hard', active: 'bg-rose-500 text-white', key: 'hard' }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === duelDifficulty
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setDuelDifficulty(diff) {
            duelDifficulty = diff;
            updateDuelDifficultyButtons();
            if (currentMode !== 'duelo') return;
            playSFX('pickup');
            startDuelRun();
        }

        function updateDuelLivesButtons() {
            const defs = [
                { id: 'btn-duel-lives-3', active: 'bg-rose-500 text-white', key: 3 },
                { id: 'btn-duel-lives-2', active: 'bg-rose-500 text-white', key: 2 },
                { id: 'btn-duel-lives-1', active: 'bg-rose-500 text-white', key: 1 }
            ];
            defs.forEach(d => {
                const el = document.getElementById(d.id);
                if (!el) return;
                el.className = d.key === duelLivesMax
                    ? `px-2.5 py-0.5 rounded-md text-[10px] font-bold transition ${d.active}`
                    : 'px-2.5 py-0.5 rounded-md text-[10px] font-bold transition text-slate-300 hover:bg-slate-800';
            });
        }

        function setDuelLives(n) {
            duelLivesMax = n;
            updateDuelLivesButtons();
            if (currentMode !== 'duelo') return;
            playSFX('pickup');
            startDuelRun();
        }

        (function initDuelP2Name() {
            const el = document.getElementById('duel-p2-name');
            if (!el) return;
            try {
                const saved = localStorage.getItem('LogicCooked3D_DuelP2Name');
                if (saved) el.value = saved;
            } catch (e) { }
            el.addEventListener('change', () => {
                el.value = (el.value || '').trim().slice(0, 12);
                try { localStorage.setItem('LogicCooked3D_DuelP2Name', el.value); } catch (e) { }
                if (currentMode === 'duelo') renderDuelHud();
            });
        })();

        // ---------------- Revólver reutilizable (escenario y vitrina) ----------------
        function createRevolverModel(metal, grip) {
            const g = new THREE.Group();
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 14), metal);
            drum.rotation.z = Math.PI / 2;
            drum.castShadow = true;
            g.add(drum);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.72, 12), metal);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.set(0.5, 0.04, 0);
            barrel.castShadow = true;
            g.add(barrel);
            const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), metal);
            sight.position.set(0.82, 0.12, 0);
            g.add(sight);
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.15), metal);
            frame.position.set(-0.2, -0.02, 0);
            frame.castShadow = true;
            g.add(frame);
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.13), grip);
            handle.position.set(-0.37, -0.2, 0);
            handle.rotation.z = 0.5;
            handle.castShadow = true;
            g.add(handle);
            const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), metal);
            trigger.position.set(-0.13, -0.17, 0);
            g.add(trigger);
            const holeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), holeMat);
                hole.rotation.z = Math.PI / 2;
                hole.position.set(0, Math.cos(a) * 0.12, Math.sin(a) * 0.12);
                g.add(hole);
            }
            return g;
        }

        // ---------------- Figura del rival (vaquero) ----------------
        function createDuelRivalFigure() {
            const group = new THREE.Group();
            const body = new THREE.Group();
            group.add(body);

            const coatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
            const vestMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.75 });
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0b289, roughness: 0.7 });
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x29211c, roughness: 0.85 });
            const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });

            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.47, 0.85, 14), coatMat);
            torso.position.y = 1.2; torso.castShadow = true; body.add(torso);
            const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.5, 14), vestMat);
            vest.position.y = 1.15; vest.castShadow = true; body.add(vest);

            const headG = new THREE.Group();
            headG.position.y = 1.78;
            body.add(headG);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), skinMat);
            head.castShadow = true; headG.add(head);
            const bandana = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.07, 8, 16), bandanaMat);
            bandana.rotation.x = Math.PI / 2;
            bandana.position.y = -0.13;
            headG.add(bandana);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 20), hatMat);
            brim.position.y = 0.2; brim.castShadow = true; headG.add(brim);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.34, 16), hatMat);
            crown.position.y = 0.38; crown.castShadow = true; headG.add(crown);

            const armL = createNpcArm(-1, 0x1e3a8a, 0xe0b289);
            armL.position.set(-0.52, 1.5, 0); body.add(armL);
            const armR = createNpcArm(1, 0x1e3a8a, 0xe0b289);
            armR.position.set(0.52, 1.5, 0); body.add(armR);
            const legL = createNpcLeg(-1, 0x29211c, 0x111827);
            body.add(legL);
            const legR = createNpcLeg(1, 0x29211c, 0x111827);
            body.add(legR);

            return { group, body, head: headG, armL, armR, legL, legR };
        }

        // ---------------- Saloon 3D del duelo ----------------
        function build3DDuelArena() {
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a3021, roughness: 0.9, metalness: 0.05 });
            const floor = new THREE.Mesh(new THREE.BoxGeometry(44, 0.5, 44), floorMat);
            floor.position.y = -0.27;
            floor.receiveShadow = true;
            duelGroup.add(floor);

            const plankMat = new THREE.MeshStandardMaterial({ color: 0x33200f, roughness: 0.95 });
            for (let i = -10; i <= 10; i++) {
                const gap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 44), plankMat);
                gap.position.set(i * 2, -0.01, 0);
                duelGroup.add(gap);
            }

            const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.9 });
            const wall = new THREE.Mesh(new THREE.BoxGeometry(36, 11, 0.6), wallMat);
            wall.position.set(0, 5.5, -10);
            wall.receiveShadow = true;
            duelGroup.add(wall);

            const beamMat = new THREE.MeshStandardMaterial({ color: 0x54331b, roughness: 0.85 });
            [-16, -8, 0, 8, 16].forEach(x => {
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 11, 0.75), beamMat);
                beam.position.set(x, 5.5, -9.6);
                duelGroup.add(beam);
            });

            // Paredes laterales, frontal y techo: el salón cerrado, sin ver los demás juegos
            [-14, 14].forEach(wx => {
                const side = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11, 24.6), wallMat);
                side.position.set(wx, 5.5, 2);
                side.receiveShadow = true;
                duelGroup.add(side);
            });
            const frontWall = new THREE.Mesh(new THREE.BoxGeometry(28.6, 11, 0.6), wallMat);
            frontWall.position.set(0, 5.5, 14);
            frontWall.receiveShadow = true;
            duelGroup.add(frontWall);
            const ceiling = new THREE.Mesh(new THREE.BoxGeometry(28.6, 0.5, 24.6),
                new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.95 }));
            ceiling.position.set(0, 11.2, 2);
            duelGroup.add(ceiling);
            [-6, -2, 2, 6, 10].forEach(z => {
                [-13.6, 13.6].forEach(x => {
                    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 11, 0.5), beamMat);
                    b.position.set(x, 5.5, z);
                    duelGroup.add(b);
                });
            });
            [-10, -5, 0, 5, 10].forEach(x => {
                const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 11, 0.75), beamMat);
                b.position.set(x, 5.5, 13.6);
                duelGroup.add(b);
            });

            const signMat = new THREE.MeshStandardMaterial({ color: 0x160b05, roughness: 0.7 });
            const sign = new THREE.Mesh(new THREE.BoxGeometry(13, 2.6, 0.4), signMat);
            sign.position.set(0, 7.4, -9.2);
            duelGroup.add(sign);

            const neonMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 1.1, roughness: 0.4 });
            const mkBar = (w, h, x, y) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), neonMat);
                m.position.set(x, y, -8.95);
                duelGroup.add(m);
            };
            mkBar(13.4, 0.18, 0, 8.75);
            mkBar(13.4, 0.18, 0, 6.05);
            mkBar(0.18, 2.9, -6.7, 7.4);
            mkBar(0.18, 2.9, 6.7, 7.4);
            [-3.4, 0, 3.4].forEach(x => {
                const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 18), neonMat);
                dot.rotation.x = Math.PI / 2;
                dot.position.set(x, 7.4, -8.95);
                duelGroup.add(dot);
            });

            const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
            [-1.1, 1.1].forEach(sx => {
                const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 0.16), doorMat);
                door.position.set(sx, 2.1, -8.7);
                duelGroup.add(door);
            });

            const wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.75 });
            const tableGroup = new THREE.Group();
            tableGroup.position.set(4.5, 0, -0.3);
            duelGroup.add(tableGroup);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.2, 26), wood);
            top.position.y = 1.1; top.castShadow = true; top.receiveShadow = true; tableGroup.add(top);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.05, 14), wood);
            leg.position.y = 0.55; leg.castShadow = true; tableGroup.add(leg);
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.14, 20), wood);
            base.position.y = 0.07; tableGroup.add(base);

            const gunMetal = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.3 });
            const gunGrip = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.7 });
            const revolver = createRevolverModel(gunMetal, gunGrip);
            revolver.scale.setScalar(1.15);
            revolver.position.set(4.5, 1.34, -0.3);
            duelGroup.add(revolver);
            duelAnimated.push({ update: (el) => { revolver.rotation.y = el * 0.5; } });

            const lanternGlass = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xfb923c, emissiveIntensity: 1.0, roughness: 0.4 });
            [[-7, 3.8, -3.5], [9.5, 3.8, -3.5], [1.5, 4.4, -7.4]].forEach((p, i) => {
                const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), lanternGlass);
                lamp.position.set(p[0], p[1], p[2]);
                duelGroup.add(lamp);
                const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), beamMat);
                wire.position.set(p[0], p[1] + 0.9, p[2]);
                duelGroup.add(wire);
                const pl = new THREE.PointLight(0xffa04a, 1.25, 20, 2);
                pl.position.set(p[0], p[1] - 0.1, p[2]);
                duelGroup.add(pl);
                duelAnimated.push({ update: (el) => { pl.intensity = 1.1 + Math.sin(el * 3 + i) * 0.22; } });
            });

            const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8 });
            [[-9.5, -6], [-10, 4], [11.5, -6]].forEach(p => {
                const c = new THREE.Group();
                const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 2.4, 12), cactusMat);
                body2.position.y = 1.2; body2.castShadow = true; c.add(body2);
                const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.1, 10), cactusMat);
                arm1.position.set(0.45, 1.6, 0); arm1.rotation.z = -0.5; arm1.castShadow = true; c.add(arm1);
                const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 10), cactusMat);
                arm2.position.set(-0.4, 1.2, 0); arm2.rotation.z = 0.6; arm2.castShadow = true; c.add(arm2);
                c.position.set(p[0], 0, p[1]);
                duelGroup.add(c);
            });

            const barrelMat = new THREE.MeshStandardMaterial({ color: 0x7c4a1e, roughness: 0.85 });
            [[-6.5, -7.5], [-5.6, -8.1], [10, -7.4], [9.1, -6.7]].forEach(p => {
                const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16), barrelMat);
                b.position.set(p[0], 0.6, p[1]);
                b.castShadow = true;
                duelGroup.add(b);
            });

            duelRivalFigure = createDuelRivalFigure();
            duelRivalFigure.group.position.set(6.6, 0, -0.6);
            duelRivalFigure.group.rotation.y = -Math.PI / 2;
            duelGroup.add(duelRivalFigure.group);
            duelAnimated.push({
                update: (el) => {
                    duelRivalFigure.body.position.y = Math.abs(Math.sin(el * 2)) * 0.05;
                    duelRivalFigure.armR.rotation.x = -0.45 + Math.sin(el * 2) * 0.2;
                    duelRivalFigure.head.rotation.y = Math.sin(el * 0.8) * 0.2;
                }
            });

            const key = new THREE.DirectionalLight(0xffe6c0, 0.9);
            key.position.set(-180 + 7, 12, 9);
            key.target.position.set(-180 + 3, 1, 0);
            key.castShadow = true;
            key.shadow.mapSize.set(1024, 1024);
            key.shadow.camera.left = -14;
            key.shadow.camera.right = 14;
            key.shadow.camera.top = 14;
            key.shadow.camera.bottom = -14;
            key.shadow.camera.near = 1;
            key.shadow.camera.far = 45;
            scene.add(key);
            scene.add(key.target);

            const warm = new THREE.PointLight(0xff9a4d, 1.0, 26, 2);
            warm.position.set(-180 + 4, 5, 3);
            scene.add(warm);
            duelAnimated.push({ update: (el) => { warm.intensity = 0.95 + Math.sin(el * 2) * 0.15; } });
        }

        function buildMillionShowcase(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 0.3, station.position.z);
            const gold = new THREE.MeshStandardMaterial({ color: 0xfcd34d, metalness: 0.85, roughness: 0.22, emissive: 0xb45309, emissiveIntensity: 0.3 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 18), dark);
            base.position.y = 0.15; base.castShadow = true; g.add(base);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.4, 12), gold);
            stem.position.y = 0.48; stem.castShadow = true; g.add(stem);
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.2, 0.52, 18), gold);
            cup.position.y = 0.93; cup.castShadow = true; g.add(cup);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 8, 22), gold);
            rim.rotation.x = Math.PI / 2; rim.position.y = 1.19; g.add(rim);
            [-0.52, 0.52].forEach(sx => {
                const handle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 16), gold);
                handle.position.set(sx, 1.0, 0);
                handle.rotation.y = Math.PI / 2;
                g.add(handle);
            });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
            glow.position.y = 1.45;
            g.add(glow);
            hubGroup.add(g);
            station.showcase = { group: g, spinSpeed: 0.7, glow };
        }

        function buildRevolverShowcase(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 0.95, station.position.z);
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 18),
                new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 }));
            base.position.y = -0.6;
            base.castShadow = true;
            g.add(base);
            const metal = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.8, roughness: 0.25, emissive: 0xc2410c, emissiveIntensity: 0.55 });
            const grip = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
            const gun = createRevolverModel(metal, grip);
            gun.scale.setScalar(1.5);
            gun.rotation.z = 0.15;
            g.add(gun);
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xfdba74 }));
            glow.position.y = -0.2;
            g.add(glow);
            hubGroup.add(g);
            station.showcase = { group: g, spinSpeed: 0.9, glow };
        }

        // ============================================================
        //  PLAYGROUND HUB (patio de juegos)
        // ============================================================
        function addHubStation(type, mode, x, z, labelText, color) {
            const padMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.5 });
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.3, 28), padMat);
            pad.position.set(x, 0.15, z);
            pad.receiveShadow = true;
            hubGroup.add(pad);

            let beam = null;
            if (type === 'portal') {
                const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false });
                beam = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 6.2, 24, 1, true), beamMat);
                beam.position.set(x, 3.1, z);
                hubGroup.add(beam);
            }

            const label = create3DLabel(pad, labelText, type === 'skin' ? 5.0 : 4.5, 'hub');

            const station = { type, mode, position: new THREE.Vector3(x, 0, z), mesh: pad, beam, label, labelText, baseColor: color, showcase: null };
            hubStations.push(station);
            return station;
        }

        function buildChefFireShowcase(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 0.3, station.position.z);
            const coat = new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.6 });
            const skin = new THREE.MeshStandardMaterial({ color: 0xf3c99a, roughness: 0.75 });
            const hat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.85 });
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.7, 14), coat);
            body.position.y = 0.35; body.castShadow = true; g.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), skin);
            head.position.y = 0.85; head.castShadow = true; g.add(head);
            const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.18, 14), hat);
            hatBand.position.y = 1.06; g.add(hatBand);
            const hatPuff = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 14), hat);
            hatPuff.position.y = 1.22; hatPuff.scale.set(1, 0.8, 1); g.add(hatPuff);
            const flames = [];
            const flameColors = [0xffd54a, 0xff9d1e, 0xff5a1e];
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                const flame = new THREE.Mesh(
                    new THREE.ConeGeometry(0.16, 0.55, 8),
                    new THREE.MeshBasicMaterial({ color: flameColors[i % 3], transparent: true, opacity: 0.85 })
                );
                const r = 0.34 + Math.random() * 0.12;
                flame.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
                flame.userData.phase = Math.random() * Math.PI * 2;
                flame.userData.baseY = flame.position.y;
                g.add(flame);
                flames.push(flame);
            }
            hubGroup.add(g);
            station.showcase = { group: g, flames, spinSpeed: 0.5 };
        }

        function buildGunShowcase(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 2.0, station.position.z);
            const metal = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
            const slide = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.3), metal);
            slide.position.y = 0.15; slide.castShadow = true; g.add(slide);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), dark);
            barrel.rotation.z = Math.PI / 2; barrel.position.set(0.85, 0.15, 0); g.add(barrel);
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.72, 0.34), dark);
            grip.position.set(-0.35, -0.22, 0); grip.rotation.z = 0.35; grip.castShadow = true; g.add(grip);
            const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), metal);
            trigger.position.set(-0.05, 0.0, 0); g.add(trigger);
            const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
            glow.position.set(1.1, 0.15, 0); g.add(glow);
            g.scale.setScalar(1.15);
            hubGroup.add(g);
            station.showcase = { group: g, spinSpeed: 0.9, glow };
        }

        function buildTowersShowcase(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 0.3, station.position.z);
            const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x10b981, emissiveIntensity: 0.35, roughness: 0.4 });
            const capMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9 });
            const makeTower = (sx) => {
                const t = new THREE.Group();
                const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), towerMat);
                base.position.y = 0.9; base.castShadow = true; t.add(base);
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), capMat);
                cap.position.y = 1.9; t.add(cap);
                t.position.set(sx, 0, 0);
                return t;
            };
            g.add(makeTower(-0.75));
            g.add(makeTower(0.75));
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 8),
                new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 0.8 }));
            cable.rotation.z = Math.PI / 2; cable.position.y = 1.75; g.add(cable);
            const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }));
            spark.position.set(0, 1.75, 0); g.add(spark);
            hubGroup.add(g);
            station.showcase = { group: g, spinSpeed: 0.5, spark };
        }

        function buildSkinRoom(station) {
            const g = new THREE.Group();
            g.position.set(station.position.x, 0, station.position.z);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.6 });
            const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xd4c3ec, roughness: 0.7 }));
            floor.position.y = 0.1; floor.receiveShadow = true; g.add(floor);
            // Open room: no side walls
            // Vanity + mirror at the back (facing the camera/approach)
            const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 1.1), frameMat);
            tableTop.position.set(0, 1.0, -2.2); tableTop.castShadow = true; g.add(tableTop);
            [-1.3, 1.3].forEach(lx => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.9), frameMat);
                leg.position.set(lx, 0.5, -2.2); g.add(leg);
            });
            const mirror = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.12),
                new THREE.MeshStandardMaterial({ color: 0xbfdbfe, metalness: 0.85, roughness: 0.1, emissive: 0x1e3a8a, emissiveIntensity: 0.12 }));
            mirror.position.set(0, 2.15, -2.15); g.add(mirror);
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 0.08), frameMat);
            frame.position.set(0, 2.15, -2.2); g.add(frame);
            // Clothes rack along one side
            const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), frameMat);
            rackBar.rotation.x = Math.PI / 2; rackBar.position.set(2.2, 2.0, 0); g.add(rackBar);
            const clothColors = [0xef4444, 0x22c55e, 0xa855f7, 0x06b6d4];
            clothColors.forEach((c, i) => {
                const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.45), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
                cloth.position.set(2.2, 1.6, -1.2 + i * 0.8);
                g.add(cloth);
            });
            // Sign above
            const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.12), frameMat);
            sign.position.set(0, 3.7, -2.6); g.add(sign);
            hubGroup.add(g);
            station.room = g;
            hubDecor.push({ cx: station.position.x, cz: station.position.z - 2.2, r: 1.6 });
        }

        function build3DHubArena() {
            const HX = HUB_WALK.halfX;
            const HZ = HUB_WALK.halfZ;

            // Grass ground + stone plaza
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x649a50, roughness: 0.95 });
            const ground = new THREE.Mesh(new THREE.BoxGeometry(HX * 2, 0.4, HZ * 2), groundMat);
            ground.position.y = -0.2;
            ground.receiveShadow = true;
            hubGroup.add(ground);

            const plazaMat = new THREE.MeshStandardMaterial({ color: 0xc4bdae, roughness: 0.85 });
            const plaza = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.46, 44), plazaMat);
            plaza.position.y = -0.18;
            plaza.receiveShadow = true;
            hubGroup.add(plaza);

            // Low hedge border
            const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.9 });
            const addHedge = (x, z, w, d) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), hedgeMat);
                m.position.set(x, 0.55, z);
                m.castShadow = true; m.receiveShadow = true;
                hubGroup.add(m);
            };
            addHedge(0, -HZ, HX * 2, 0.8);
            addHedge(0, HZ, HX * 2, 0.8);
            addHedge(-HX, 0, 0.8, HZ * 2);
            addHedge(HX, 0, 0.8, HZ * 2);

            buildHubWater(HX, HZ);

            // Trees around the edges
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 0.85 });
            const addTree = (x, z) => {
                const g = new THREE.Group();
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.6, 8), trunkMat);
                trunk.position.y = 0.8; trunk.castShadow = true; g.add(trunk);
                const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), leafMat);
                leaf.position.y = 2.1; leaf.scale.set(1, 1.15, 1); leaf.castShadow = true; g.add(leaf);
                g.position.set(x, 0, z);
                hubGroup.add(g);
                hubDecor.push({ cx: x, cz: z, r: 0.7 });
            };
            addTree(-16, -14); addTree(16, -14); addTree(-17, 14); addTree(17, 14);
            addTree(-18, 0); addTree(18, 0); addTree(-16, 7); addTree(16, 7);

            // Central fountain
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.7 });
            const waterMat = new THREE.MeshStandardMaterial({ color: 0x2e9cc9, roughness: 0.2, emissive: 0x0a7ea0, emissiveIntensity: 0.08, transparent: true, opacity: 0.85 });
            const fountain = new THREE.Group();
            const fBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 28), stoneMat);
            fBase.position.y = 0.25; fBase.castShadow = true; fountain.add(fBase);
            const fWater = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.2, 28), waterMat);
            fWater.position.y = 0.5; fountain.add(fWater);
            const fCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 16), stoneMat);
            fCol.position.y = 1.3; fCol.castShadow = true; fountain.add(fCol);
            const fBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 0.35, 22), stoneMat);
            fBasin.position.y = 2.1; fountain.add(fBasin);
            hubGroup.add(fountain);
            // (fountain collision handled with a decor entry)
            hubDecor.push({ cx: 0, cz: 0, r: 2.7 });

            // Sit spots / benches (decor colliders too)
            const benchMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.8 });
            const addBench = (x, z, rot) => {
                const g = new THREE.Group();
                const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 0.7), benchMat);
                seat.position.y = 0.55; seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
                [-0.9, 0.9].forEach(bx => {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.6), benchMat);
                    leg.position.set(bx, 0.28, 0); g.add(leg);
                });
                g.position.set(x, 0, z);
                g.rotation.y = rot;
                hubGroup.add(g);
            };
            addBench(-6, 6, 0.4);
            addBench(6, 6, -0.4);

            // Game portals (back of the patio) + skin room
            const cocinaStation = addHubStation('portal', 'overcooked', -9, -13, '🍳 Cocina 3D', 0xf59e0b);
            const aimStation = addHubStation('portal', 'aim', 9, -13, '🎯 Aim 3D', 0xf43f5e);
            const connectStation = addHubStation('portal', 'connect', 0, -15, '🔌 Conecta',   0x10b981);
            const millStation = addHubStation('portal', 'millonario', -14, -10, '💰 Millonario', 0xfacc15);
            const duelStation = addHubStation('portal', 'duelo', 14, -11, '🔫 Duelo VS', 0xf97316);
            buildChefFireShowcase(cocinaStation);
            buildGunShowcase(aimStation);
            buildTowersShowcase(connectStation);
            buildMillionShowcase(millStation);
            buildRevolverShowcase(duelStation);

            const skinStation = addHubStation('skin', null, 13, -6, '👕 Vestidor', 0xa855f7);
            buildSkinRoom(skinStation);

            // Hidden unlockable NPCs, tucked into the corners of the patio
            const NPC_SPOTS = [
                { k: 0, x: -19, z: 15 },   // 67  - bottom-left
                { k: 1, x: 19,  z: 14 },   // oso - bottom-right
                { k: 2, x: -19, z: -14 },  // lobo - top-left
                { k: 3, x: 19,  z: -15 },  // gato - top-right
                { k: 4, x: -19, z: 3 }     // tung - left edge
            ];
            NPC_SPOTS.forEach(spot => {
                const sp = SPECIAL_SKINS[spot.k];
                const npc = buildSpecialSkinFigure(sp.id);
                if (!npc) return;
                npc.group.position.set(spot.x, 0, spot.z);
                npc.group.scale.setScalar(sp.id === '67' ? 0.75 : 0.7);
                npc.group.rotation.y = 0.6;
                hubGroup.add(npc.group);
                hubStations.push({
                    type: 'npc', mode: null, position: new THREE.Vector3(spot.x, 0, spot.z),
                    mesh: npc.group, beam: null, showcase: null, labelText: 'el ' + sp.name,
                    label: create3DLabel(npc.group, sp.hint, 3.4, 'hub'),
                    npcModel: npc, specialIndex: spot.k, talked: false
                });
            });

            buildHubAmbient();
        }

        // ============================================================
        //  WATER SURROUNDING THE HUB ISLAND + DECORATIONS
        // ============================================================
        function buildHubWater(HX, HZ) {
            // Big animated sea plane surrounding the island
            const seaGeo = new THREE.PlaneGeometry(HX * 8, HZ * 9, 48, 48);
            const seaMat = new THREE.MeshStandardMaterial({
                color: 0x186a9e, roughness: 0.25, metalness: 0.15,
                emissive: 0x093a57, emissiveIntensity: 0.08,
                transparent: true, opacity: 0.92, side: THREE.DoubleSide
            });
            const sea = new THREE.Mesh(seaGeo, seaMat);
            sea.rotation.x = -Math.PI / 2;
            sea.position.y = -0.55;
            sea.receiveShadow = false;
            hubGroup.add(sea);
            const seaBase = seaGeo.attributes.position.array.slice();
            hubAnimated.push({
                update: (el) => {
                    const arr = seaGeo.attributes.position.array;
                    for (let i = 0; i < arr.length; i += 3) {
                        const x = seaBase[i], y = seaBase[i + 1];
                        arr[i + 2] = Math.sin(x * 0.35 + el * 1.4) * 0.18 + Math.cos(y * 0.3 + el * 1.1) * 0.14;
                    }
                    seaGeo.attributes.position.needsUpdate = true;
                }
            });

            // Foam ring hugging the island shore
            const foamMat = new THREE.MeshBasicMaterial({ color: 0xcadde9, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
            const foamRings = [];
            const addFoam = (x, z, w, d) => {
                const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), foamMat.clone());
                f.rotation.x = -Math.PI / 2;
                f.position.set(x, -0.42, z);
                hubGroup.add(f);
                foamRings.push(f);
            };
            addFoam(0, -HZ - 1.4, HX * 2 + 6, 2.2);
            addFoam(0, HZ + 1.4, HX * 2 + 6, 2.2);
            addFoam(-HX - 1.4, 0, 2.2, HZ * 2 + 6);
            addFoam(HX + 1.4, 0, 2.2, HZ * 2 + 6);
            hubAnimated.push({
                update: (el) => {
                    foamRings.forEach((f, i) => { f.material.opacity = 0.28 + Math.abs(Math.sin(el * 1.6 + i * 1.3)) * 0.25; });
                }
            });

            // ---------- Wooden dock on the south shore ----------
            const dockMatW = new THREE.MeshStandardMaterial({ color: 0xa1683a, roughness: 0.85 });
            const dock = new THREE.Group();
            for (let i = 0; i < 8; i++) {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.72), dockMatW);
                plank.position.set(0, 0.25, i * 0.82);
                plank.castShadow = true; plank.receiveShadow = true;
                dock.add(plank);
            }
            [-1.1, 1.1].forEach(px => {
                [0.3, 2.8, 5.4].forEach(pz => {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.6, 8), dockMatW);
                    post.position.set(px, -0.3, pz);
                    dock.add(post);
                });
            });
            dock.position.set(5, 0, HZ + 1.2);
            hubGroup.add(dock);

            // Moored rowboat next to the dock
            const boat1 = new THREE.Group();
            const hull1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 3.0), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55 }));
            hull1.position.y = 0.1; hull1.castShadow = true; boat1.add(hull1);
            const inner1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.5), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 }));
            inner1.position.y = 0.25; boat1.add(inner1);
            const seat1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), dockMatW);
            seat1.position.y = 0.4; boat1.add(seat1);
            boat1.position.set(7.4, -0.25, HZ + 4.2);
            boat1.rotation.y = 0.35;
            hubGroup.add(boat1);
            hubAnimated.push({
                update: (el) => {
                    boat1.position.y = -0.25 + Math.sin(el * 1.3) * 0.1;
                    boat1.rotation.z = Math.sin(el * 0.9) * 0.06;
                    boat1.rotation.x = Math.cos(el * 1.1) * 0.04;
                }
            });

            // ---------- Drifting rowboats further out ----------
            [[-HX - 12, -8, 0x3b82f6, 1.2], [HX + 14, 6, 0xf59e0b, -0.8], [-HX - 10, 14, 0x22c55e, 2.4]].forEach((b, bi) => {
                const boat = new THREE.Group();
                const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 3.2), new THREE.MeshStandardMaterial({ color: b[2], roughness: 0.55 }));
                hull.position.y = 0.1; hull.castShadow = true; boat.add(hull);
                const inner = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.35, 2.7), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
                inner.position.y = 0.25; boat.add(inner);
                const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), dockMatW);
                mast.position.y = 1.2; boat.add(mast);
                const sail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.8, side: THREE.DoubleSide }));
                sail.position.set(0, 1.3, 0.55); boat.add(sail);
                boat.position.set(b[0], -0.3, b[1]);
                boat.rotation.y = b[3];
                hubGroup.add(boat);
                hubAnimated.push({
                    update: (el) => {
                        boat.position.y = -0.3 + Math.sin(el * 1.1 + bi * 2) * 0.12;
                        boat.position.x = b[0] + Math.sin(el * 0.25 + bi * 2.2) * 1.6;
                        boat.rotation.z = Math.sin(el * 0.8 + bi) * 0.07;
                        boat.rotation.y = b[3] + Math.sin(el * 0.3 + bi) * 0.15;
                    }
                });
            });

            // ---------- Buoys bobbing on the water ----------
            const buoyBodies = [];
            [[-HX - 7, -16], [HX + 8, -14], [-HX - 15, 2], [HX + 16, 16], [-HX - 6, 20], [HX + 6, 22], [4, HZ + 14], [-10, -HZ - 12]].forEach((p, i) => {
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
                body.scale.set(1, 1.15, 1); body.castShadow = true; g.add(body);
                const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.1, 8, 18), new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.5 }));
                stripe.rotation.x = Math.PI / 2; g.add(stripe);
                const top = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.5 }));
                top.position.y = 0.85; g.add(top);
                const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0dda0, emissive: 0xd4a418, emissiveIntensity: 0.35 }));
                lamp.position.y = 1.2; g.add(lamp);
                g.position.set(p[0], -0.35, p[1]);
                hubGroup.add(g);
                buoyBodies.push({ g, baseY: -0.35, phase: i * 0.9, lamp });
            });
            hubAnimated.push({
                update: (el) => {
                    buoyBodies.forEach(b => {
                        b.g.position.y = b.baseY + Math.sin(el * 1.6 + b.phase) * 0.14;
                        b.g.rotation.z = Math.sin(el * 1.2 + b.phase) * 0.1;
                        b.g.rotation.x = Math.cos(el * 1.0 + b.phase) * 0.08;
                        b.lamp.material.emissiveIntensity = 0.25 + Math.abs(Math.sin(el * 3 + b.phase)) * 0.25;
                    });
                }
            });

            // ---------- Small sand islands with palm trees ----------
            const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4b884, roughness: 0.9 });
            const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.85 });
            const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.8, side: THREE.DoubleSide });
            const addIsland = (x, z, r, palms) => {
                const isle = new THREE.Group();
                const sand = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 1.0, 16), sandMat);
                sand.position.y = -0.35; sand.castShadow = true; sand.receiveShadow = true; isle.add(sand);
                const grass = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.65, r * 0.75, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x3fa85c, roughness: 0.9 }));
                grass.position.y = 0.22; isle.add(grass);
                for (let pi = 0; pi < palms; pi++) {
                    const palm = new THREE.Group();
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.0, 8), palmTrunkMat);
                    trunk.position.y = 1.5; trunk.rotation.z = 0.12 + pi * 0.05; trunk.castShadow = true; palm.add(trunk);
                    for (let k = 0; k < 6; k++) {
                        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 4), palmLeafMat);
                        leaf.scale.set(1, 1, 0.22);
                        const ang = (k / 6) * Math.PI * 2;
                        leaf.position.set(Math.cos(ang) * 0.75, 3.0, Math.sin(ang) * 0.75);
                        leaf.rotation.z = -Math.cos(ang) * 1.1;
                        leaf.rotation.x = Math.sin(ang) * 1.1;
                        palm.add(leaf);
                    }
                    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 }));
                    coco.position.set(0.25, 2.85, 0.1); palm.add(coco);
                    palm.position.set(Math.cos(pi * 2.4) * r * 0.35, 0.2, Math.sin(pi * 2.4) * r * 0.35);
                    isle.add(palm);
                }
                isle.position.set(x, 0, z);
                hubGroup.add(isle);
            };
            addIsland(-HX - 16, -18, 4.2, 2);
            addIsland(HX + 18, -20, 3.4, 1);
            addIsland(HX + 14, 24, 2.6, 1);
            addIsland(-HX - 20, 16, 3.0, 1);

            // ---------- Rocks sticking out of the water ----------
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.95 });
            [[-HX - 5, -22, 1.2], [HX + 5, -18, 0.9], [-HX - 18, -4, 1.5], [HX + 22, 0, 1.1], [-HX - 8, 24, 0.8], [HX + 10, 28, 1.3]].forEach(r => {
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r[2], 0), rockMat);
                rock.position.set(r[0], -r[2] * 0.35, r[1]);
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.castShadow = true;
                hubGroup.add(rock);
            });

            // ---------- Seagulls circling above the water ----------
            const gullMat = new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.6, side: THREE.DoubleSide });
            const gulls = [];
            for (let i = 0; i < 7; i++) {
                const gl = new THREE.Group();
                const bodyG = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), gullMat);
                bodyG.scale.set(1, 0.65, 1.7); gl.add(bodyG);
                const wl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.32), gullMat);
                const wr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.32), gullMat);
                wl.position.x = -0.6; wr.position.x = 0.6;
                gl.add(wl); gl.add(wr);
                hubGroup.add(gl);
                gulls.push({ gl, wl, wr, r: 26 + i * 4.5, h: 8 + (i % 3) * 2.2, speed: 0.22 + i * 0.035, phase: i * 1.9 });
            }
            hubAnimated.push({
                update: (el) => {
                    gulls.forEach(g => {
                        const a = el * g.speed + g.phase;
                        g.gl.position.set(Math.cos(a) * g.r, g.h + Math.sin(el * 1.5 + g.phase) * 0.5, Math.sin(a) * g.r);
                        g.gl.rotation.y = -a;
                        const flap = Math.sin(el * 8 + g.phase) * 0.55;
                        g.wl.rotation.z = flap;
                        g.wr.rotation.z = -flap;
                    });
                }
            });
        }

        function buildHubAmbient() {
            const HX = HUB_WALK.halfX;
            const HZ = HUB_WALK.halfZ;

            // ---------- Flowers (swaying in the breeze) ----------
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 0.9 });
            const petalColors = [0xff6b6b, 0xffd93d, 0xa29bfe, 0xff9ff3, 0x74b9ff, 0xdde3ea];
            const petalMats = petalColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, emissive: c, emissiveIntensity: 0.03 }));
            const coreMat = new THREE.MeshStandardMaterial({ color: 0xe8c84e, emissive: 0xc9a01a, emissiveIntensity: 0.06 });
            const flowerSpots = [
                [-13, 9], [-11, 7], [-14, 4], [-12, 12], [-9, 14], [-16, 10],
                [12, 9], [14, 7], [13, 12], [10, 14], [16, 10], [15, 4],
                [-8, -8], [-11, -6], [-13, -9], [8, -8], [11, -6], [13, -10],
                [-4, 12], [0, 13], [4, 12], [-2, -11], [3, -11], [-15, -2],
                [15, -2], [-14, 13], [14, 13], [10, 4], [-10, 4], [7, 12], [-7, -13], [17, 6]
            ];
            flowerSpots.forEach((p, i) => {
                const g = new THREE.Group();
                const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), stemMat);
                stem.position.y = 0.25; g.add(stem);
                const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), petalMats[i % petalMats.length]);
                head.position.y = 0.54; head.scale.set(1, 0.55, 1); g.add(head);
                const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), coreMat);
                core.position.y = 0.56; g.add(core);
                g.position.set(p[0], 0, p[1]);
                hubGroup.add(g);
                const phase = i * 1.7;
                hubAnimated.push({ update: (el) => { g.rotation.z = Math.sin(el * 2 + phase) * 0.12; g.rotation.x = Math.cos(el * 1.6 + phase) * 0.08; } });
            });

            // ---------- Bushes ----------
            const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 0.9 });
            const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.95 });
            const bushSpots = [[-18, 9], [18, 9], [-18, -9], [18, -9], [-6, -16], [6, -16], [-14, 15], [14, 15], [0, 14.5], [-17, -3], [17, -3], [8, 11], [-8, 11]];
            bushSpots.forEach(p => {
                const g = new THREE.Group();
                const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), bushMat);
                b1.position.y = 0.62; b1.scale.set(1.2, 0.95, 1.2); b1.castShadow = true; g.add(b1);
                const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8), bushMat2);
                b2.position.set(0.55, 0.45, 0.25); b2.castShadow = true; g.add(b2);
                const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), bushMat);
                b3.position.set(-0.5, 0.42, -0.2); g.add(b3);
                g.position.set(p[0], 0, p[1]);
                hubGroup.add(g);
                hubDecor.push({ cx: p[0], cz: p[1], r: 0.9 });
            });

            // ---------- Potted plants around the plaza ----------
            const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
            const plantLeaf = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.85 });
            const potSpots = [[-5, -7], [5, -7], [-7.5, 2], [7.5, 2], [-3, 8], [3, 8]];
            potSpots.forEach(p => {
                const g = new THREE.Group();
                const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 12), potMat);
                pot.position.y = 0.25; pot.castShadow = true; g.add(pot);
                for (let k = 0; k < 5; k++) {
                    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), plantLeaf);
                    leaf.position.set(Math.cos(k * 1.26) * 0.18, 0.6 + Math.sin(k) * 0.08, Math.sin(k * 1.26) * 0.18);
                    leaf.scale.set(1, 1.4, 1); g.add(leaf);
                }
                g.position.set(p[0], 0, p[1]);
                hubGroup.add(g);
                hubDecor.push({ cx: p[0], cz: p[1], r: 0.5 });
            });

            // ---------- Lamp posts (glowing lanterns) ----------
            const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.3 });
            const lampGlassMat = new THREE.MeshStandardMaterial({ color: 0xe8c86a, emissive: 0xcc8f00, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 });
            [[-8, -6], [8, -6], [-9.5, 6.5], [9.5, 6.5]].forEach((p, i) => {
                const g = new THREE.Group();
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 8), lampPoleMat);
                pole.position.y = 1.6; pole.castShadow = true; g.add(pole);
                const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 8), lampPoleMat);
                cap.position.y = 3.35; g.add(cap);
                const glass = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.36), lampGlassMat);
                glass.position.y = 3.0; g.add(glass);
                const light = new THREE.PointLight(0xffd27f, 0.45, 9, 2);
                light.position.set(0, 3.0, 0); g.add(light);
                g.position.set(p[0], 0, p[1]);
                hubGroup.add(g);
                hubDecor.push({ cx: p[0], cz: p[1], r: 0.4 });
                hubAnimated.push({ update: (el) => { const f = 0.8 + Math.sin(el * 7 + i * 2) * 0.15 + Math.sin(el * 13 + i) * 0.05; glass.material.emissiveIntensity = 0.25 + f * 0.12; light.intensity = 0.3 + f * 0.12; } });
            });

            // ---------- Flags / banners (waving) ----------
            const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.5, metalness: 0.4 });
            const flagColors = [0xef4444, 0x22c55e, 0x3b82f6, 0xf59e0b];
            [[-12, -3, 0.6], [12, -3, -0.6], [0, 8, 0]].forEach((p, i) => {
                const g = new THREE.Group();
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.8, 8), flagPoleMat);
                pole.position.y = 1.9; pole.castShadow = true; g.add(pole);
                const flag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.04), new THREE.MeshStandardMaterial({ color: flagColors[i % flagColors.length], roughness: 0.8, side: THREE.DoubleSide }));
                flag.position.set(0.62, 3.3, 0);
                g.add(flag);
                g.position.set(p[0], 0, p[1]);
                g.rotation.y = p[2];
                hubGroup.add(g);
                hubAnimated.push({ update: (el) => { const w = Math.sin(el * 3 + i); flag.rotation.y = w * 0.5; flag.rotation.z = Math.sin(el * 5 + i) * 0.12; flag.scale.x = 1 + w * 0.06; } });
            });

            // ---------- Balloons (bobbing cluster) ----------
            const balloonColors = [0xef4444, 0xf59e0b, 0x3b82f6, 0xa855f7, 0x22c55e];
            const balloons = new THREE.Group();
            balloonColors.forEach((c, i) => {
                const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 14), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.05 }));
                ball.position.set(Math.cos(i * 1.3) * 0.5 - 0.5, 0, Math.sin(i * 1.3) * 0.4);
                ball.scale.set(1, 1.2, 1);
                balloons.add(ball);
                const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.4, 4), new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
                str.position.copy(ball.position); str.position.y -= 1.2;
                balloons.add(str);
            });
            balloons.position.set(11.5, 3.4, 8);
            hubGroup.add(balloons);
            hubAnimated.push({ update: (el) => { balloons.position.y = 3.4 + Math.sin(el * 1.4) * 0.25; balloons.rotation.z = Math.sin(el * 0.9) * 0.08; balloons.rotation.y = Math.sin(el * 0.6) * 0.2; } });

            // ---------- Fountain water droplets ----------
            const dropMat = new THREE.MeshStandardMaterial({ color: 0x6bbce4, emissive: 0x0a7ea0, emissiveIntensity: 0.12, transparent: true, opacity: 0.85 });
            const drops = [];
            for (let i = 0; i < 34; i++) {
                const d = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 6, 6), dropMat);
                d.position.set(0, 2.3, 0);
                hubGroup.add(d);
                drops.push({ mesh: d, vx: 0, vy: 0, vz: 0, life: Math.random() * 1.2 });
            }
            hubAnimated.push({
                update: (el, dt) => {
                    drops.forEach(dr => {
                        dr.life -= dt;
                        dr.mesh.position.y += dr.vy * dt;
                        dr.mesh.position.x += dr.vx * dt;
                        dr.mesh.position.z += dr.vz * dt;
                        dr.vy -= 9.5 * dt;
                        if (dr.life <= 0 || dr.mesh.position.y < 0.65) {
                            const a = Math.random() * Math.PI * 2;
                            const sp = 0.4 + Math.random() * 0.9;
                            dr.mesh.position.set(Math.cos(a) * 0.2, 2.35, Math.sin(a) * 0.2);
                            dr.vx = Math.cos(a) * sp; dr.vz = Math.sin(a) * sp;
                            dr.vy = 2.6 + Math.random() * 1.6;
                            dr.life = 1.4;
                        }
                    });
                }
            });

            // ---------- Windmill ----------
            const millWallMat = new THREE.MeshStandardMaterial({ color: 0xc9b79a, roughness: 0.9 });
            const mill = new THREE.Group();
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 4.2, 12), millWallMat);
            tower.position.y = 2.1; tower.castShadow = true; mill.add(tower);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 }));
            roof.position.y = 4.7; mill.add(roof);
            const blades = new THREE.Group();
            blades.position.set(0, 3.4, 1.05);
            const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.7 });
            for (let k = 0; k < 4; k++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.1), bladeMat);
                blade.position.y = 1.2;
                const arm = new THREE.Group();
                arm.add(blade);
                arm.rotation.z = (Math.PI / 2) * k;
                blades.add(arm);
            }
            const hubCap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshStandardMaterial({ color: 0x9a6b3f }));
            blades.add(hubCap);
            mill.add(blades);
            mill.position.set(-15, 0, 10);
            hubGroup.add(mill);
            hubDecor.push({ cx: -15, cz: 10, r: 1.5 });
            hubAnimated.push({ update: (el) => { blades.rotation.z = el * 0.9; } });

            // ---------- Pond with ripples ----------
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.7 });
            const pondWaterMat = new THREE.MeshStandardMaterial({ color: 0x3169c4, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85, emissive: 0x16337e, emissiveIntensity: 0.05 });
            const pond = new THREE.Mesh(new THREE.CircleGeometry(3, 34), pondWaterMat);
            pond.rotation.x = -Math.PI / 2; pond.position.set(10, 0.06, 10); hubGroup.add(pond);
            const pondRim = new THREE.Mesh(new THREE.TorusGeometry(3, 0.28, 10, 40), stoneMat);
            pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(10, 0.12, 10); hubGroup.add(pondRim);
            const ripples = [];
            for (let i = 0; i < 3; i++) {
                const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 28), new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
                r.rotation.x = -Math.PI / 2; r.position.set(10, 0.09, 10); hubGroup.add(r);
                ripples.push({ mesh: r, t: i * 0.8 });
            }
            hubDecor.push({ cx: 10, cz: 10, r: 3.0 });
            hubAnimated.push({ update: (el, dt) => { ripples.forEach(rp => { rp.t += dt * 0.5; if (rp.t > 1) rp.t -= 1; rp.mesh.scale.setScalar(0.4 + rp.t * 2.6); rp.mesh.material.opacity = (1 - rp.t) * 0.5; }); } });

            // ---------- Butterflies (fluttering around flowers) ----------
            const bfWingMat = new THREE.MeshStandardMaterial({ color: 0xe8c84e, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xcc7f10, emissiveIntensity: 0.04 });
            const bfWingMat2 = new THREE.MeshStandardMaterial({ color: 0x5288d8, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x2f66bb, emissiveIntensity: 0.04 });
            for (let i = 0; i < 12; i++) {
                const anchor = flowerSpots[i % flowerSpots.length];
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
                body.rotation.z = Math.PI / 2; g.add(body);
                const wl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), i % 2 ? bfWingMat : bfWingMat2);
                const wr = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), i % 2 ? bfWingMat : bfWingMat2);
                wl.position.set(-0.14, 0, 0); wr.position.set(0.14, 0, 0);
                g.add(wl); g.add(wr);
                g.position.set(anchor[0], 1, anchor[1]);
                hubGroup.add(g);
                const phase = i * 2.1;
                hubAnimated.push({
                    update: (el) => {
                        const a = el * 0.9 + phase;
                        g.position.x = anchor[0] + Math.cos(a) * 1.6;
                        g.position.z = anchor[1] + Math.sin(a * 1.3) * 1.6;
                        g.position.y = 0.9 + Math.sin(el * 3 + phase) * 0.25;
                        g.rotation.y = a + Math.PI / 2;
                        const flap = Math.sin(el * 22 + phase) * 0.9;
                        wl.rotation.y = flap; wr.rotation.y = -flap;
                    }
                });
            }

            // ---------- Picnic blanket ----------
            const picnic = new THREE.Group();
            const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.2), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.9 }));
            blanket.receiveShadow = true; picnic.add(blanket);
            const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }));
            basket.position.set(0.7, 0.33, 0.4); basket.castShadow = true; picnic.add(basket);
            [[-0.6, 0.2], [-0.2, -0.5], [0.3, -0.6]].forEach(cp => {
                const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xd5dbe3 }));
                plate.position.set(cp[0], 0.06, cp[1]); picnic.add(plate);
            });
            picnic.position.set(-14, 0.02, -5);
            picnic.rotation.y = 0.5;
            hubGroup.add(picnic);

            // ---------- Floating pollen / fireflies ----------
            const pollenCount = 120;
            const pollenGeo = new THREE.BufferGeometry();
            const pollenPos = new Float32Array(pollenCount * 3);
            for (let i = 0; i < pollenCount; i++) {
                pollenPos[i * 3] = (Math.random() - 0.5) * HX * 1.9;
                pollenPos[i * 3 + 1] = 0.5 + Math.random() * 6;
                pollenPos[i * 3 + 2] = (Math.random() - 0.5) * HZ * 1.9;
            }
            pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
            const pollenMat = new THREE.PointsMaterial({ color: 0xe8d98f, size: 0.24, transparent: true, opacity: 0.45, depthWrite: false });
            const pollen = new THREE.Points(pollenGeo, pollenMat);
            hubGroup.add(pollen);
            hubAnimated.push({
                update: (el, dt) => {
                    const arr = pollenGeo.attributes.position.array;
                    for (let i = 0; i < pollenCount; i++) {
                        arr[i * 3 + 1] += dt * 0.5;
                        arr[i * 3] += Math.sin(el * 0.6 + i) * dt * 0.35;
                        arr[i * 3 + 2] += Math.cos(el * 0.5 + i) * dt * 0.35;
                        if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = 0.4;
                    }
                    pollenGeo.attributes.position.needsUpdate = true;
                }
            });
        }

        function setChefBaseVisible(v) {
            if (!chefParts) return;
            chefParts.legL.visible = v;
            chefParts.legR.visible = v;
            chefParts.armL.visible = v;
            chefParts.armR.visible = v;
            chefParts.chefUpper.visible = v;
        }

        function applyChefSkin(i) {
            if (i >= SPECIAL_START) {
                const k = i - SPECIAL_START;
                const sp = SPECIAL_SKINS[k];
                if (!sp) return;
                if (!specialUnlocked[k]) {
                    if (typeof showHitPopup === 'function') showHitPopup('SKIN BLOQUEADA', false, 'Encuentra su personaje en el patio');
                    return;
                }
                setChefBaseVisible(false);
                Object.keys(chefSpecialFigures).forEach(id => { chefSpecialFigures[id].group.visible = (id === sp.id); });
                chefActiveSpecial = sp.id;
                chefSkinIndex = i;
                playSFX('pickup');
                if (typeof showHitPopup === 'function') showHitPopup('SKIN: ' + sp.name.toUpperCase(), true, '¡Ahora eres ' + sp.name + '!');
                updateSkinPanelUI();
                return;
            }
            setChefBaseVisible(true);
            Object.keys(chefSpecialFigures).forEach(id => { chefSpecialFigures[id].group.visible = false; });
            chefActiveSpecial = null;
            if (!chefMaterials) return;
            const s = CHEF_SKINS[i];
            if (!s) return;
            chefMaterials.coat.color.setHex(s.coat);
            chefMaterials.apron.color.setHex(s.apron);
            chefMaterials.hat.color.setHex(s.hat);
            chefMaterials.skin.color.setHex(s.skin);
            chefMaterials.dark.color.setHex(s.dark);
            chefMaterials.shoe.color.setHex(s.shoe);
            chefSkinIndex = i;
        }

        function updateSkinPanelUI() {
            SPECIAL_SKINS.forEach((sp, k) => {
                const slot = document.getElementById('skin-slot-' + sp.id);
                if (!slot) return;
                if (specialUnlocked[k]) {
                    slot.innerHTML = sp.name;
                    slot.style.background = sp.color;
                    slot.style.color = sp.text;
                    slot.title = sp.name;
                    slot.className = 'w-9 h-9 rounded-lg border-2 border-white/60 hover:border-white transition flex items-center justify-center text-[10px] font-extrabold mono-font px-0.5';
                } else {
                    slot.innerHTML = '<i class="fa-solid fa-lock"></i>';
                    slot.style.background = '#1e293b';
                    slot.style.color = '#64748b';
                    slot.title = 'Bloqueada';
                    slot.className = 'w-9 h-9 rounded-lg border-2 border-slate-600 transition flex items-center justify-center text-[11px]';
                }
            });
        }

        function cycleChefSkin() {
            applyChefSkin((chefSkinIndex + 1) % CHEF_SKINS.length);
            playSFX('pickup');
            if (typeof showHitPopup === 'function') showHitPopup('SKIN: ' + CHEF_SKINS[chefSkinIndex].name.toUpperCase(), true, '👕 NUEVO LOOK');
        }

        function talkToNpc(station) {
            playSFX('success');
            const k = station.specialIndex;
            const sp = SPECIAL_SKINS[k];
            if (sp == null) return;
            if (!specialUnlocked[k]) {
                specialUnlocked[k] = true;
                if (station.label && station.label.div) station.label.div.innerHTML = sp.after;
                showHitPopup(sp.talk, true, '¡SKIN ' + sp.name.toUpperCase() + ' DESBLOQUEADA!', 3200);
                updateSkinPanelUI();
            } else {
                showHitPopup(sp.idle, true, 'Skin ' + sp.name + ' disponible en el Vestidor');
            }
        }

        function updateHubMovement(dt, elapsed) {
            if (gangnamTimer > 0) {
                if (chefKeys.w || chefKeys.a || chefKeys.s || chefKeys.d || mobileInputActive()) {
                    gangnamTimer = 0;
                } else {
                    chefVel.set(0, 0, 0);
                    return;
                }
            }
            const moveIn = readChefInput();
            const inputX = moveIn.x;
            const inputZ = moveIn.z;
            let dirX = inputX, dirZ = inputZ;
            const dirLen = Math.hypot(dirX, dirZ);
            if (dirLen > 0.001) { dirX /= dirLen; dirZ /= dirLen; }

            const maxSpeed = 8.2;
            const accel = 55;
            chefVel.x += dirX * accel * dt;
            chefVel.z += dirZ * accel * dt;
            const spd = Math.hypot(chefVel.x, chefVel.z);
            if (spd > maxSpeed) { chefVel.x = (chefVel.x / spd) * maxSpeed; chefVel.z = (chefVel.z / spd) * maxSpeed; }
            const decay = Math.max(0, 1 - 6 * dt);
            chefVel.x *= decay; chefVel.z *= decay;

            let nx = chefMesh.position.x + chefVel.x * dt;
            let nz = chefMesh.position.z + chefVel.z * dt;
            nx = Math.max(-HUB_WALK.halfX + 0.6, Math.min(HUB_WALK.halfX - 0.6, nx));
            nz = Math.max(-HUB_WALK.halfZ + 0.6, Math.min(HUB_WALK.halfZ - 0.6, nz));
            hubDecor.forEach(d => {
                const dx = nx - d.cx, dz = nz - d.cz;
                const dist = Math.hypot(dx, dz);
                const min = d.r + 0.5;
                if (dist < min && dist > 0.0001) { nx = d.cx + (dx / dist) * min; nz = d.cz + (dz / dist) * min; }
            });
            chefMesh.position.x = nx;
            chefMesh.position.z = nz;

            if (dirLen > 0.001 || spd > 0.4) {
                chefMesh.rotation.y = Math.atan2(chefVel.x, chefVel.z);
            }
        }

        function updateHubProximity() {
            let nearest = null, best = INTERACT_RADIUS;
            hubStations.forEach(s => {
                const dx = chefMesh.position.x - s.position.x;
                const dz = chefMesh.position.z - s.position.z;
                const d = Math.hypot(dx, dz);
                if (d < best) { best = d; nearest = s; }
            });
            hubNearStation = nearest;
            hubStations.forEach(s => {
                const active = (s === hubNearStation);
                if (s.gem) s.gem.material.emissiveIntensity = active ? 0.8 : 0.35;
                if (s.mesh && s.mesh.material) s.mesh.material.emissiveIntensity = active ? 0.5 : 0.2;
                if (s.beam && s.beam.material) s.beam.material.opacity = active ? 0.25 : 0.11;
            });
            const prompt = document.getElementById('hub-prompt');
            const promptText = document.getElementById('hub-prompt-text');
            if (prompt && promptText) {
                if (hubNearStation && hubNearStation.type !== 'skin') {
                    const label = hubNearStation.type === 'npc' ? ('Hablar con ' + hubNearStation.labelText) : ('Entrar a ' + hubNearStation.labelText);
                    const touchHint = document.documentElement.classList.contains('is-mobile');
                    const keyHtml = touchHint
                        ? '<i class="fa-solid fa-hand"></i>'
                        : '<kbd class="px-1.5 py-0.5 bg-lime-500 text-slate-950 rounded font-extrabold">E</kbd>';
                    promptText.innerHTML = keyHtml + ' ' + label;
                    prompt.classList.remove('hidden'); prompt.classList.add('flex');
                } else {
                    prompt.classList.add('hidden'); prompt.classList.remove('flex');
                }
            }
            const skinPanel = document.getElementById('skin-panel');
            if (skinPanel) {
                if (hubNearStation && hubNearStation.type === 'skin') {
                    skinPanel.classList.remove('hidden'); skinPanel.classList.add('flex');
                } else {
                    skinPanel.classList.add('hidden'); skinPanel.classList.remove('flex');
                }
            }
        }

        function interactHubStation() {
            if (currentMode !== 'hub' || !hubNearStation) return;
            if (hubNearStation.type === 'skin') { cycleChefSkin(); return; }
            if (hubNearStation.type === 'npc') { talkToNpc(hubNearStation); return; }
            if (hubNearStation.type === 'portal') { switchGameMode(hubNearStation.mode); }
        }

        function backToMenu() {
            playSFX('pickup');
            switchGameMode('hub');
            const landing = document.getElementById('landing-screen');
            if (landing) landing.classList.remove('hidden');
        }

        function switchGameMode(mode) {
            playSFX('pickup');
            currentMode = mode;
            document.body.className = document.body.className
                .replace(/\bmode-\S+/g, '').trim() + ' mode-' + mode;
            if (mode !== 'overcooked') { setCrowdWarning(false); clearCrowdPeople(); kitchenCrowd = null; hideKitchenGameOver(); }
            if (mode !== 'aim') hideAimGameOver();
            if (mode !== 'connect') hideConnectGameOver();
            if (mode !== 'millonario') hideMillionGameOver();
            if (mode !== 'duelo') hideDuelGameOver();

            // Sky/fog: daytime park in the hub, Duck Hunt sky for aim, dark arena elsewhere
            if (mode === 'hub') {
                scene.background.set(0x5f9cc4);
                scene.fog.color.set(0x8fb4c9);
                scene.fog.density = 0.006;
            } else if (mode === 'aim') {
                scene.background.set(0x8fd0f0);
                scene.fog.color.set(0x9fd8f2);
                scene.fog.density = 0.006;
            } else if (mode === 'connect') {
                scene.background.set(0x061019);
                scene.fog.color.set(0x061019);
                scene.fog.density = 0.018;
            } else if (mode === 'millonario') {
                scene.background.set(0x0b0714);
                scene.fog.color.set(0x0b0714);
                scene.fog.density = 0.013;
            } else if (mode === 'duelo') {
                scene.background.set(0x140b06);
                scene.fog.color.set(0x140b06);
                scene.fog.density = 0.014;
            } else {
                scene.background.set(0x090d16);
                scene.fog.color.set(0x090d16);
                scene.fog.density = 0.015;
            }
            aimGun.visible = (mode === 'aim');

            // Keep the sun's shadow frustum over the active arena
            pointSunAt(mode === 'hub' ? 150 : mode === 'millonario' ? -120 : mode === 'duelo' ? -180 : 0);

            // El patio se veia quemado: luz mas suave solo en el hub
            ambientLight.intensity = mode === 'hub' ? 0.34 : 0.65;
            dirLight.intensity = mode === 'hub' ? 0.48 : 0.95;

            // The chef model travels with the player: hub and kitchen share it
            if (chefMesh) {
                if (mode === 'hub') {
                    if (chefMesh.parent !== hubGroup) hubGroup.add(chefMesh);
                    chefMesh.position.set(0, 0, 4);
                    chefMesh.rotation.y = 0;
                    chefVel.set(0, 0, 0);
                    hubNearStation = null;
                } else if (mode === 'millonario') {
                    // Detrás de la mesa del plató, a la derecha y mirando a cámara
                    if (chefMesh.parent !== millionGroup) millionGroup.add(chefMesh);
                    chefMesh.position.set(3.2, 0, -0.35);
                    chefMesh.rotation.y = 0;
                    chefVel.set(0, 0, 0);
                } else if (mode === 'duelo') {
                    // Detrás de la mesa del saloon, de perfil mirando a su rival
                    if (chefMesh.parent !== duelGroup) duelGroup.add(chefMesh);
                    chefMesh.position.set(2.6, 0, -0.45);
                    chefMesh.rotation.y = Math.PI / 2;
                    chefVel.set(0, 0, 0);
                } else if (chefMesh.parent !== kitchenGroup) {
                    kitchenGroup.add(chefMesh);
                }
            }

            const modes = [
                { id: 'hub', btn: 'btn-mode-hub', activeClass: 'bg-lime-500 text-slate-950 shadow-md' },
                { id: 'overcooked', btn: 'btn-mode-overcooked', activeClass: 'bg-amber-500 text-slate-950 shadow-md' },
                { id: 'aim', btn: 'btn-mode-aim', activeClass: 'bg-rose-500 text-white shadow-md' },
                { id: 'connect', btn: 'btn-mode-connect', activeClass: 'bg-emerald-500 text-slate-950 shadow-md' },
                { id: 'millonario', btn: 'btn-mode-millonario', activeClass: 'bg-yellow-400 text-slate-950 shadow-md' },
                { id: 'duelo', btn: 'btn-mode-duelo', activeClass: 'bg-orange-500 text-slate-950 shadow-md' }
            ];

            modes.forEach(m => {
                const el = document.getElementById(m.btn);
                if (!el) return;
                if (m.id === mode) {
                    el.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${m.activeClass}`;
                } else {
                    el.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-300 hover:bg-slate-800';
                }
            });

            document.getElementById('hud-score').textContent = modeScores[mode] || 0;
            globalStreak = 0;
            document.getElementById('hud-streak').textContent = 'x1';

            const quickKitchen = document.getElementById('kitchen-quick-actions');
            const quickConnect = document.getElementById('connect-quick-actions');
            const quickAim = document.getElementById('aim-quick-actions');
            const quickHub = document.getElementById('hub-quick-actions');
            const quickMillion = document.getElementById('million-quick-actions');
            const quickDuel = document.getElementById('duel-quick-actions');
            const millionPanel = document.getElementById('million-panel');
            const duelPanel = document.getElementById('duel-panel');
            const crosshair = document.getElementById('fps-crosshair');
            const controlsHint = document.getElementById('hud-controls-hint');
            const ticketHeader = document.getElementById('ticket-header-strip');
            const ticketCard = document.getElementById('mission-ticket-card');
            const hubPrompt = document.getElementById('hub-prompt');
            const bigTimer = document.getElementById('big-timer');
            const btnTop10 = document.getElementById('btn-top10');

            if (quickAim) { quickAim.classList.add('hidden'); quickAim.classList.remove('flex'); }
            if (quickHub) { quickHub.classList.add('hidden'); quickHub.classList.remove('flex'); }
            if (quickMillion) { quickMillion.classList.add('hidden'); quickMillion.classList.remove('flex'); }
            if (millionPanel) { millionPanel.classList.add('hidden'); millionPanel.classList.remove('flex'); }
            if (quickDuel) { quickDuel.classList.add('hidden'); quickDuel.classList.remove('flex'); }
            if (duelPanel) { duelPanel.classList.add('hidden'); duelPanel.classList.remove('flex'); }
            if (hubPrompt) { hubPrompt.classList.add('hidden'); hubPrompt.classList.remove('flex'); }
            const skinPanel = document.getElementById('skin-panel');
            if (skinPanel) { skinPanel.classList.add('hidden'); skinPanel.classList.remove('flex'); }
            if (bigTimer) { bigTimer.classList.remove('hidden'); bigTimer.classList.add('flex'); }
            if (btnTop10) { btnTop10.classList.remove('hidden'); btnTop10.classList.add('flex'); }

            if (mode === 'hub') {
                camTargetPos.set(150, 13, 4 + 11);
                camLookAtPos.set(150, 0.6, 4 - 1);
                quickKitchen.classList.add('hidden');
                quickConnect.classList.add('hidden');
                quickConnect.classList.remove('flex');
                if (quickHub) { quickHub.classList.remove('hidden'); quickHub.classList.add('flex'); }
                ticketCard.classList.add('hidden');
                crosshair.classList.add('hidden');
                crosshair.classList.remove('flex');
                container.className = 'pointer-mode';
                if (bigTimer) { bigTimer.classList.add('hidden'); bigTimer.classList.remove('flex'); }
                awaitingStart = false;
                hideStartHint();
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-lime-300">WASD</kbd> Caminar • <kbd class="px-1.5 py-0.5 bg-lime-500 text-slate-950 font-bold rounded">E</kbd> Interactuar con la zona`;
                document.getElementById('static-mode-badge').textContent = 'PATIO DE JUEGOS';
            } else if (mode === 'overcooked') {
                applyKitchenDifficulty(kitchenDifficulty);
                quickKitchen.classList.remove('hidden');
                quickConnect.classList.add('hidden');
                quickConnect.classList.remove('flex');
                ticketCard.classList.remove('hidden');
                crosshair.classList.add('hidden');
                crosshair.classList.remove('flex');
                container.className = 'pointer-mode';
                ticketHeader.className = 'bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center justify-between';
                ticketCard.style.borderColor = 'rgba(245, 158, 11, 0.6)';
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">WASD</kbd> Mover • <kbd class="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded">E</kbd> Interactuar • <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-emerald-300">Espacio</kbd> Entregar`;
                startKitchenRun();
            } else if (mode === 'aim') {
                camTargetPos.set(60, 4.2, 13.5);
                camLookAtPos.set(60, 3.8, -4);
                quickKitchen.classList.add('hidden');
                quickConnect.classList.add('hidden');
                quickConnect.classList.remove('flex');
                if (quickAim) { quickAim.classList.remove('hidden'); quickAim.classList.add('flex'); }
                updateAimDifficultyButtons();
                aimGameOver = false;
                statHits = 0;
                statMisses = 0;
                document.getElementById('hud-accuracy-stats').textContent = '✔ 0 | ✖ 0';
                hideAimGameOver();
                ticketCard.classList.remove('hidden');
                crosshair.classList.remove('hidden');
                crosshair.classList.add('flex');
                container.className = 'crosshair-mode';
                ticketHeader.className = 'bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 flex items-center justify-between';
                ticketCard.style.borderColor = 'rgba(244, 63, 94, 0.6)';
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-rose-500 text-white font-bold rounded">Clic Izquierdo</kbd> Disparar Rayo a la Proposición Correcta`;
                spawn3DAimTargets();
            } else if (mode === 'connect') {
                camTargetPos.set(-60, 14.2, 12.2);
                camLookAtPos.set(-60, 0.3, 0);
                quickKitchen.classList.add('hidden');
                quickConnect.classList.remove('hidden');
                quickConnect.classList.add('flex');
                ticketCard.classList.add('hidden');
                crosshair.classList.add('hidden');
                crosshair.classList.remove('flex');
                container.className = 'pointer-mode';
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-indigo-500 text-white font-bold rounded">Clic Izq.</kbd> Elegir Nodo Azul → Llevar Cable al Nodo Verde Equivalente`;
                connectGameOver = false;
                statHits = 0;
                statMisses = 0;
                document.getElementById('hud-accuracy-stats').textContent = '✔ 0 | ✖ 0';
                hideConnectGameOver();
                spawn3DConnectNodes();
            } else if (mode === 'millonario') {
                camTargetPos.set(-120 - 0.6, 2.35, 9.4);
                camLookAtPos.set(-120 - 1.5, 1.5, 0);
                quickKitchen.classList.add('hidden');
                quickConnect.classList.add('hidden');
                quickConnect.classList.remove('flex');
                if (quickMillion) { quickMillion.classList.remove('hidden'); quickMillion.classList.add('flex'); }
                if (millionPanel) { millionPanel.classList.remove('hidden'); millionPanel.classList.add('flex'); }
                ticketCard.classList.add('hidden');
                crosshair.classList.add('hidden');
                crosshair.classList.remove('flex');
                container.className = 'pointer-mode';
                hideMillionGameOver();
                updateMillionDifficultyButtons();
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-yellow-300">Clic</kbd> Elegir respuesta • <kbd class="px-1.5 py-0.5 bg-yellow-400 text-slate-950 font-bold rounded">1-4</kbd> Atajos de teclado • <kbd class="px-1.5 py-0.5 bg-yellow-400 text-slate-950 font-bold rounded">B</kbd> Bailar`;
                document.getElementById('static-mode-badge').textContent = 'MILLONARIO • LÓGICA';
                startMillionRun();
            } else if (mode === 'duelo') {
                updateDuelCamera(0);
                quickKitchen.classList.add('hidden');
                quickConnect.classList.add('hidden');
                quickConnect.classList.remove('flex');
                if (quickDuel) { quickDuel.classList.remove('hidden'); quickDuel.classList.add('flex'); }
                if (duelPanel) { duelPanel.classList.remove('hidden'); duelPanel.classList.add('flex'); }
                if (btnTop10) { btnTop10.classList.add('hidden'); btnTop10.classList.remove('flex'); }
                ticketCard.classList.add('hidden');
                crosshair.classList.add('hidden');
                crosshair.classList.remove('flex');
                container.className = 'pointer-mode';
                hideDuelGameOver();
                updateDuelDifficultyButtons();
                updateDuelLivesButtons();
                if (controlsHint) controlsHint.innerHTML = `<kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-orange-300">Clic</kbd> Elegir respuesta • <kbd class="px-1.5 py-0.5 bg-orange-500 text-slate-950 font-bold rounded">1-4</kbd> Atajos • <kbd class="px-1.5 py-0.5 bg-orange-500 text-slate-950 font-bold rounded">1-3</kbd> Poderes • <kbd class="px-1.5 py-0.5 bg-slate-800 rounded text-orange-300">B</kbd> Bailar`;
                document.getElementById('static-mode-badge').textContent = 'DUELO • RULETA RUSA';
                startDuelRun();
            }

            updateBigTimer();
            if (mode === 'hub') { awaitingStart = false; hideStartHint(); }
            else armStartHint();
            renderLeaderboardUI();
        }

        function triggerNewChallenge() {
            playSFX('pickup');
            if (currentMode === 'overcooked') {
                kitchenGameOver = false;
                hideKitchenGameOver();
                generateKitchenOrder();
            } else if (currentMode === 'aim') {
                aimGameOver = false;
                hideAimGameOver();
                spawn3DAimTargets();
            } else if (currentMode === 'connect') {
                connectGameOver = false;
                hideConnectGameOver();
                spawn3DConnectNodes();
            } else if (currentMode === 'millonario') {
                if (!millGameOver && !millLocked) nextMillionQuestion();
            } else if (currentMode === 'duelo') {
                if (!duelGameOver && !duelLocked && duelPhase === 'question') nextDuelQuestion();
            }
            updateBigTimer();
        }

        window.addEventListener('pointermove', (e) => {
            if (currentMode === 'aim') {
                aimPointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
                aimPointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
                const reticle = document.getElementById('crosshair-reticle');
                if (reticle) {
                    reticle.style.left = e.clientX + 'px';
                    reticle.style.top = e.clientY + 'px';
                    reticle.style.transform = 'translate(-50%, -50%)';
                }
            }
            if (currentMode !== 'connect' || !selectedLeftNode3D) return;
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const worldHit = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(connectDragPlane, worldHit)) {
                const localHit = connectGroup.worldToLocal(worldHit.clone());
                localHit.x = THREE.MathUtils.clamp(localHit.x, -6, 6);
                localHit.z = THREE.MathUtils.clamp(localHit.z, -5.5, 5.5);
                localHit.y = 1.15;
                updateLivePreviewCable(localHit);
            }
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.target !== renderer.domElement) return;

            if (awaitingStart && !landingVisible()) {
                awaitingStart = false;
                hideStartHint();
                playSFX('pickup');
                updateBigTimer();
                refreshMillionReady();
                refreshDuelReady();
            }

            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableMeshes, false);

            if (intersects.length > 0) {
                const hitObj = intersects[0].object;
                const uData = hitObj.userData;

                if (uData.type === 'kitchen_crate' && currentMode === 'overcooked') {
                    placeChefNear(hitObj.parent.position.x, hitObj.parent.position.z);
                    toggleKitchenElement(uData.elementId);
                } else if (uData.type === 'kitchen_deliver' && currentMode === 'overcooked') {
                    const dSt = interactableStations.find(s => s.stationType === 'deliver');
                    if (dSt) placeChefNear(dSt.position.x, dSt.position.z + (dSt.position.z < 0 ? 2.0 : -2.0));
                    deliverKitchenOrder();
                } else if (uData.type === 'kitchen_clear' && currentMode === 'overcooked') {
                    const tSt = interactableStations.find(s => s.stationType === 'clear');
                    if (tSt) placeChefNear(tSt.position.x, tSt.position.z + (tSt.position.z < 0 ? 2.0 : -2.0));
                    clearKitchenPlate();
                } else if (uData.type === 'aim_target' && currentMode === 'aim') {
                    if (aimGameOver) return;
                    const worldPos = new THREE.Vector3();
                    hitObj.getWorldPosition(worldPos);
                    fire3DLaserBeam(worldPos, uData.isCorrect);

                    const ball = aimField.find(b => b.mesh === hitObj);
                    if (uData.isCorrect) {
                        recordOutcome(45, true, `Blanco certero: "${uData.formula}" corresponde a [${uData.labelText}].`);
                        if (ball) removeAimBall(ball);
                        rotateAimChallenge();
                    } else {
                        recordOutcome(0, false, `Diana incorrecta: "${uData.formula}" NO es [${uData.labelText}].`);
                        if (ball) removeAimBall(ball);
                        spawnAimDistractor();
                    }
                } else if (uData.type === 'connect_node' && currentMode === 'connect') {
                    handleConnectNodeClick(hitObj);
                }
            } else if (currentMode === 'aim') {
                if (aimGameOver) return;
                // Missed shot: still fire a bullet into the distance
                const farPoint = raycaster.ray.at(40, new THREE.Vector3());
                const startVec = new THREE.Vector3();
                if (aimGunMuzzle) aimGunMuzzle.getWorldPosition(startVec);
                else startVec.copy(raycaster.ray.origin);
                playSFX('laser');
                spawnAimBullet(startVec, farPoint, false);
                if (aimGunFlash) {
                    aimGunFlash.visible = true;
                    aimGunFlash.rotation.z = Math.random() * Math.PI;
                    aimGunFlashUntil = clock.getElapsedTime() + 0.07;
                }
            }
        });

        window.addEventListener('keydown', (e) => {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            const wasAwaitingStart = awaitingStart;
            if (awaitingStart && !landingVisible()) {
                awaitingStart = false;
                hideStartHint();
                playSFX('pickup');
                updateBigTimer();
                refreshMillionReady();
                refreshDuelReady();
            }
            const k = e.key.toLowerCase();
            if (k === 'w' || e.key === 'ArrowUp') { chefKeys.w = true; if (window.chefKeys) window.chefKeys.w = true; }
            if (k === 's' || e.key === 'ArrowDown') { chefKeys.s = true; if (window.chefKeys) window.chefKeys.s = true; }
            if (k === 'a' || e.key === 'ArrowLeft') { chefKeys.a = true; if (window.chefKeys) window.chefKeys.a = true; }
            if (k === 'd' || e.key === 'ArrowRight') { chefKeys.d = true; if (window.chefKeys) window.chefKeys.d = true; }
            if (k === 'e' && currentMode === 'overcooked') {
                e.preventDefault();
                interactWithNearestStation();
            }
            if (k === 'e' && currentMode === 'hub') {
                e.preventDefault();
                interactHubStation();
            }
            if (e.code === 'Space' && currentMode === 'overcooked') {
                e.preventDefault();
                deliverKitchenOrder();
            }
            if (k === 'b' && (currentMode === 'overcooked' || currentMode === 'hub' || currentMode === 'millonario' || currentMode === 'duelo')) {
                e.preventDefault();
                triggerGangnamStyle();
            }
            if (currentMode === 'millonario' && !wasAwaitingStart && e.key >= '1' && e.key <= '4') {
                answerMillion(parseInt(e.key, 10) - 1);
            }
            if (currentMode === 'duelo' && !wasAwaitingStart) {
                if (duelPhase === 'power' && e.key >= '1' && e.key <= '3') {
                    duelShoot(DUEL_POWER_KEYS[parseInt(e.key, 10) - 1]);
                } else if (duelPhase === 'question' && e.key >= '1' && e.key <= '4') {
                    answerDuel(parseInt(e.key, 10) - 1);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || e.key === 'ArrowUp') chefKeys.w = false;
            if (k === 's' || e.key === 'ArrowDown') chefKeys.s = false;
            if (k === 'a' || e.key === 'ArrowLeft') chefKeys.a = false;
            if (k === 'd' || e.key === 'ArrowRight') chefKeys.d = false;
        });

        // Mantiene el FOV horizontal roughly constante: en pantallas estrechas
        // (móviles verticales) amplía el FOV vertical para que quepa la escena.
        const MILL_CAM_BASE_FOV = 50;
        const MILL_CAM_BASE_ASPECT = 16 / 9;
        function updateCameraViewport() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            if (camera.aspect < MILL_CAM_BASE_ASPECT) {
                const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(MILL_CAM_BASE_FOV) / 2) * MILL_CAM_BASE_ASPECT);
                camera.fov = Math.min(85, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hHalf) / camera.aspect)));
            } else {
                camera.fov = MILL_CAM_BASE_FOV;
            }
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }

        window.addEventListener('resize', updateCameraViewport);
        window.addEventListener('orientationchange', () => setTimeout(updateCameraViewport, 250));
        updateCameraViewport();

        setInterval(() => {
            if (awaitingStart) return;
            if (currentMode === 'hub') return;
            if (currentMode === 'overcooked' && kitchenGameOver) return;
            if (currentMode === 'aim' && aimGameOver) return;
            if (currentMode === 'connect' && connectGameOver) return;
            if (currentMode === 'millonario' && (millGameOver || millLocked)) return;
            if (currentMode === 'duelo' && (duelGameOver || duelLocked || duelPhase !== 'question')) return;
            let tickStep = 1;
            if (currentMode === 'connect') {
                if (statHits >= 6) tickStep = 4;
                else if (statHits >= 3) tickStep = 2;
            }
            roundTimer -= tickStep;
            if (roundTimer <= 0) {
                if (currentMode === 'overcooked') {
                    endKitchenGame();
                } else if (currentMode === 'aim') {
                    endAimGame();
                } else if (currentMode === 'connect') {
                    endConnectGame();
                } else if (currentMode === 'millonario') {
                    handleMillionTimeout();
                } else if (currentMode === 'duelo') {
                    handleDuelTimeout();
                } else {
                    recordOutcome(0, false, 'Tiempo de la ronda agotado. Generando nuevo desafío...');
                    triggerNewChallenge();
                }
            }
            document.getElementById('hud-timer').textContent = `${roundTimer}s`;
            updateBigTimer();
        }, 1000);

        const clock = new THREE.Clock();

        function animate3D() {
            requestAnimationFrame(animate3D);
            const dt = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            camera.position.lerp(camTargetPos, 0.08);
            currentLookAt.lerp(camLookAtPos, 0.08);
            camera.lookAt(currentLookAt);

            if (currentMode === 'overcooked' && chefMesh) {
                updateKitchenHazards(dt, elapsed);
                updateChefMovement(dt, elapsed);
                animateChef(dt, elapsed);

                updateChefProximityHighlight(elapsed);

                kitchenCrates.forEach((c, idx) => {
                    c.topper.rotation.y = elapsed * 2 + idx;
                    c.topper.position.y = 1.1 + Math.sin(elapsed * 3 + idx) * 0.12;
                });
            }

            if (currentMode === 'hub' && chefMesh) {
                updateHubMovement(dt, elapsed);
                animateChef(dt, elapsed);
                updateHubProximity();

                // Third-person camera that follows the chef around the patio
                const cx = hubGroup.position.x + chefMesh.position.x;
                const cz = hubGroup.position.z + chefMesh.position.z;
                camTargetPos.set(cx, 13, cz + 11);
                camLookAtPos.set(cx, 0.6, cz - 1);

                hubStations.forEach((s, i) => {
                    if (s.beam) s.beam.rotation.y = elapsed * 0.4 + i;
                    if (s.npcModel) {
                        s.npcModel.body.position.y = Math.abs(Math.sin(elapsed * 2.2)) * 0.12;
                        s.npcModel.legL.rotation.x = Math.sin(elapsed * 2.2) * 0.3;
                        s.npcModel.legR.rotation.x = -Math.sin(elapsed * 2.2) * 0.3;
                        if (s.npcModel.armL) s.npcModel.armL.rotation.x = -Math.sin(elapsed * 2.2) * 0.25;
                        if (s.npcModel.armR) s.npcModel.armR.rotation.x = Math.sin(elapsed * 2.2) * 0.25;
                    }
                    const sc = s.showcase;
                    if (!sc) return;
                    sc.group.rotation.y = elapsed * (sc.spinSpeed || 0.5);
                    if (sc.flames) {
                        sc.flames.forEach((f, j) => {
                            f.scale.y = 1 + Math.sin(elapsed * 8 + j) * 0.35;
                            f.material.opacity = 0.55 + Math.abs(Math.sin(elapsed * 6 + j)) * 0.4;
                            f.position.y = f.userData.baseY + Math.abs(Math.sin(elapsed * 8 + j)) * 0.12;
                        });
                    }
                    if (sc.glow) sc.glow.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.15);
                    if (sc.spark) sc.spark.position.y = 1.75 + Math.sin(elapsed * 4) * 0.12;
                });

                for (let ai = 0; ai < hubAnimated.length; ai++) hubAnimated[ai].update(elapsed, dt);
            }

            if (currentMode === 'aim') {
                updateAimField(dt, elapsed);
                updateAimGun(elapsed);
                aimClouds.forEach(c => {
                    c.position.x += c.userData.speed * dt;
                    if (c.position.x > 36) c.position.x = -36;
                });
            }

            if (currentMode === 'millonario') {
                if (chefMesh) animateChef(dt, elapsed);
                for (let mi = 0; mi < millionAnimated.length; mi++) millionAnimated[mi].update(elapsed, dt);
            }

            if (currentMode === 'duelo') {
                if (chefMesh) { chefMesh.rotation.y = Math.PI / 2; animateChef(dt, elapsed); }
                for (let di = 0; di < duelAnimated.length; di++) duelAnimated[di].update(elapsed, dt);
                updateDuelCamera(elapsed);
            }

            updateAimBullets(dt);
            updateConnectFx(dt);

            if (currentMode === 'connect') {
                connectNodes3D.forEach((n, i) => {
                    n.mesh.position.y = 0.8 + Math.sin(elapsed * 2.5 + i) * 0.06;
                    if (n.ring) n.ring.rotation.z = elapsed * 1.6 + i;
                    if (n.crystal) {
                        n.crystal.rotation.x = elapsed * 1.1 + i;
                        n.crystal.rotation.y = elapsed * 1.4 + i;
                        n.crystal.position.y = 1.3 + Math.sin(elapsed * 3 + i) * 0.08;
                    }
                    if (n.portSocket) {
                        const pulse = 0.7 + Math.abs(Math.sin(elapsed * 3 + i)) * 0.5;
                        n.portSocket.material.emissiveIntensity = pulse;
                        n.portSocket.scale.setScalar(0.9 + pulse * 0.15);
                    }
                    if (n.halo) n.halo.material.opacity = 0.35 + Math.abs(Math.sin(elapsed * 2 + i)) * 0.25;
                });
                connectBeamsGroup.children.forEach((c, i) => {
                    if (c.material && c.material.emissiveIntensity !== undefined) {
                        c.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(elapsed * 2.4 + i)) * 0.6;
                    }
                });
                if (connectParticles) {
                    connectParticles.rotation.y = elapsed * 0.03;
                    connectParticles.position.y = Math.sin(elapsed * 0.5) * 0.3;
                }
                if (connectHorizon) {
                    connectHorizon.material.opacity = 0.08 + Math.abs(Math.sin(elapsed * 0.8)) * 0.08;
                }
            }

            update3DLabels();
            renderer.render(scene, camera);
        }

        window.onload = function () {
            build3DKitchenArena();
            build3DAimArena();
            build3DConnectArena();
            build3DMillionArena();
            build3DDuelArena();
            build3DHubArena();
            buildAimGun();
            renderLeaderboardUI();
            updateKitchenTimeButtons();
            updateAimDifficultyButtons();
            refreshPlayerNameDisplay();
            updateSkinPanelUI();
            switchGameMode('hub');
            animate3D();
        };

        // ---- Bootstrap de la música de fondo (YouTube) ----
        (function initBackgroundMusic() {
            const container = document.getElementById('yt-bg-player');
            if (!container) return;

            function createPlayer() {
                if (bgMusic.player || !window.YT || !window.YT.Player) return;
                bgMusic.player = new window.YT.Player('yt-bg-player', {
                    videoId: bgMusic.videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        disablekb: 1,
                        loop: 1,
                        playlist: bgMusic.videoId,
                        modestbranding: 1,
                        rel: 0,
                        fs: 0,
                        playsinline: 1,
                        iv_load_policy: 3
                    },
                    events: {
                        onReady: function (e) {
                            bgMusic.ready = true;
                            try { e.target.setVolume(bgMusic.volume); } catch (err) { }
                            resumeBackgroundMusic();
                        },
                        onStateChange: function (e) {
                            // Si termina la pista, vuelve a empezar (respaldo del loop)
                            if (e.data === window.YT.PlayerState.ENDED) {
                                try { e.target.seekTo(0); e.target.playVideo(); } catch (err) { }
                            }
                        }
                    }
                });
            }

            if (window.YT && window.YT.Player) {
                createPlayer();
            } else {
                window.onYouTubeIframeAPIReady = createPlayer;
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                tag.async = true;
                document.head.appendChild(tag);
            }

            // Reanudar con el primer gesto del usuario (política de autoplay)
            const kick = () => { resumeBackgroundMusic(); };
            window.addEventListener('pointerdown', kick);
            window.addEventListener('keydown', kick);
        })();
