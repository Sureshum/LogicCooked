// PANEL ADMIN: tema de color + ajustes basicos del dispositivo
(function () {
    const THEME_KEY = 'LogicCooked3D_UITheme';
    const MUSIC_ENABLED_KEY = 'LogicCooked3D_AdminMusic';
    const SFX_ENABLED_KEY = 'LogicCooked3D_AdminSFX';
    const MUSIC_VOL_KEY = 'LogicCooked3D_AdminMusicVol';
    const THEMES = ['default', 'violeta', 'bosque', 'rosa', 'magma', 'oceano'];

    const panel = document.getElementById('admin-panel');
    const openBtn = document.getElementById('admin-open-btn');
    const closeBtn = document.getElementById('admin-close-btn');
    if (!panel || !openBtn) return;

    // ---- Persistencia ----
    function load(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (e) { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { }
    }

    // ---- Tema ----
    function applyTheme(theme) {
        if (theme && theme !== 'default') {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        save(THEME_KEY, theme || 'default');
        document.querySelectorAll('.admin-theme-swatch').forEach((sw) => {
            sw.classList.toggle('active', (sw.dataset.theme || 'default') === (theme || 'default'));
        });
    }

    // ---- Aplicar ajustes guardados al cargar ----
    const savedTheme = load(THEME_KEY, 'default');
    applyTheme(savedTheme);

    const musicEnabled = load(MUSIC_ENABLED_KEY, '1') === '1';
    const sfxEnabled = load(SFX_ENABLED_KEY, '1') === '1';
    const musicVol = Math.min(30, Math.max(0, parseInt(load(MUSIC_VOL_KEY, '5'), 10) || 5));

    if (typeof bgMusic !== 'undefined') {
        bgMusic.adminMuted = !musicEnabled;
        bgMusic.volume = musicVol;
    }
    if (typeof setSFXEnabled === 'function') setSFXEnabled(sfxEnabled);

    // ---- UI del panel ----
    const musicToggle = document.getElementById('admin-music-toggle');
    const sfxToggle = document.getElementById('admin-sfx-toggle');
    const volSlider = document.getElementById('admin-music-volume');
    const volLabel = document.getElementById('admin-music-volume-label');

    if (musicToggle) musicToggle.checked = musicEnabled;
    if (sfxToggle) sfxToggle.checked = sfxEnabled;
    if (volSlider) volSlider.value = String(musicVol);
    if (volLabel) volLabel.textContent = String(musicVol);

    // ---- Abrir / cerrar ----
    function openPanel() {
        panel.classList.remove('hidden');
    }
    function closePanel() {
        panel.classList.add('hidden');
    }
    openBtn.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.classList.contains('hidden')) closePanel();
    });

    // ---- Temas: swatches ----
    document.querySelectorAll('.admin-theme-swatch').forEach((sw) => {
        sw.addEventListener('click', () => {
            applyTheme(sw.dataset.theme || 'default');
            if (typeof playSFX === 'function') playSFX('pickup');
        });
    });

    // ---- Música on/off ----
    if (musicToggle) {
        musicToggle.addEventListener('change', () => {
            save(MUSIC_ENABLED_KEY, musicToggle.checked ? '1' : '0');
            if (typeof bgMusic !== 'undefined') {
                bgMusic.adminMuted = !musicToggle.checked;
                try {
                    if (bgMusic.player && bgMusic.ready) {
                        if (musicToggle.checked && bgMusic.started) bgMusic.player.playVideo();
                        else bgMusic.player.pauseVideo();
                    }
                } catch (e) { }
            }
        });
    }

    // ---- SFX on/off ----
    if (sfxToggle) {
        sfxToggle.addEventListener('change', () => {
            save(SFX_ENABLED_KEY, sfxToggle.checked ? '1' : '0');
            if (typeof setSFXEnabled === 'function') setSFXEnabled(sfxToggle.checked);
        });
    }

    // ---- Volumen música ----
    if (volSlider) {
        volSlider.addEventListener('input', () => {
            const v = Math.min(30, Math.max(0, parseInt(volSlider.value, 10) || 0));
            if (volLabel) volLabel.textContent = String(v);
            save(MUSIC_VOL_KEY, String(v));
            if (typeof bgMusic !== 'undefined') {
                bgMusic.volume = v;
                try { if (bgMusic.player && bgMusic.ready) bgMusic.player.setVolume(v); } catch (e) { }
            }
        });
    }

    // ---- Borrar Top 10 ----
    const clearScoresBtn = document.getElementById('admin-clear-scores');
    if (clearScoresBtn) {
        clearScoresBtn.addEventListener('click', () => {
            if (!confirm('¿Borrar todas las puntuaciones Top 10 de este dispositivo?')) return;
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf('LogicCooked3D_Top_v1_') === 0) keys.push(k);
                }
                keys.forEach((k) => localStorage.removeItem(k));
            } catch (e) { }
            if (typeof playSFX === 'function') playSFX('success');
            alert('Puntuaciones borradas.');
        });
    }

    // ---- Restablecer todo ----
    const resetAllBtn = document.getElementById('admin-reset-all');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            if (!confirm('¿Restablecer todos los datos guardados (nombre, Top 10, ajustes y tema)?')) return;
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf('LogicCooked3D_') === 0) keys.push(k);
                }
                keys.forEach((k) => localStorage.removeItem(k));
            } catch (e) { }
            location.reload();
        });
    }
})();
