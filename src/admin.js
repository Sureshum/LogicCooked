// PANEL ADMIN: tema de color + ajustes basicos del dispositivo
(function () {
    const THEME_KEY = 'LogicCooked3D_UITheme';
    const MUSIC_ENABLED_KEY = 'LogicCooked3D_AdminMusic';
    const SFX_ENABLED_KEY = 'LogicCooked3D_AdminSFX';
    const MUSIC_VOL_KEY = 'LogicCooked3D_AdminMusicVol';
    const BRIGHTNESS_KEY = 'LogicCooked3D_AdminBrightness';
    const SATURATION_KEY = 'LogicCooked3D_AdminSaturation';
    const UISIZE_KEY = 'LogicCooked3D_AdminUISize';
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

    // ---- Brillo del juego ----
    function applyBrightness(v) {
        const val = Math.min(150, Math.max(0, Number(v) || 100));
        document.documentElement.style.setProperty('--game-brightness', (val / 100).toFixed(3));
        document.documentElement.style.setProperty('--hub-brightness', (val / 100).toFixed(3));
        save(BRIGHTNESS_KEY, String(val));
        return val;
    }

    // ---- Saturación del juego ----
    function applySaturation(v) {
        const val = Math.min(150, Math.max(0, Number(v) || 100));
        document.documentElement.style.setProperty('--game-saturation', (val / 100).toFixed(3));
        document.documentElement.style.setProperty('--hub-saturation', (val / 100).toFixed(3));
        save(SATURATION_KEY, String(val));
        return val;
    }

    // ---- Tamano de la UI ----
    const UI_SIZE_PX = { small: 16, medium: 18.5, large: 21.5 };
    function applyUISize(size) {
        if (!UI_SIZE_PX[size]) size = 'small';
        document.documentElement.style.fontSize = UI_SIZE_PX[size] + 'px';
        save(UISIZE_KEY, size);
        document.querySelectorAll('.admin-size-btn').forEach((b) => {
            b.classList.toggle('active', (b.dataset.size || 'small') === size);
        });
    }

    // ---- Aplicar ajustes guardados al cargar ----
    const savedTheme = load(THEME_KEY, 'default');
    applyTheme(savedTheme);

    const musicEnabled = load(MUSIC_ENABLED_KEY, '1') === '1';
    const sfxEnabled = load(SFX_ENABLED_KEY, '1') === '1';
    const musicVol = Math.min(30, Math.max(0, parseInt(load(MUSIC_VOL_KEY, '5'), 10) || 5));
    const brightness = Math.min(150, Math.max(0, parseInt(load(BRIGHTNESS_KEY, '100'), 10) || 100));
    const saturation = Math.min(150, Math.max(0, parseInt(load(SATURATION_KEY, '100'), 10) || 100));
    const uiSize = load(UISIZE_KEY, 'small');
    applyBrightness(brightness);
    applySaturation(saturation);
    applyUISize(uiSize);

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
    const brightnessSlider = document.getElementById('admin-brightness');
    const brightnessLabel = document.getElementById('admin-brightness-label');
    const saturationSlider = document.getElementById('admin-saturation');
    const saturationLabel = document.getElementById('admin-saturation-label');
    const colorPreview = document.getElementById('color-preview');

    if (musicToggle) musicToggle.checked = musicEnabled;
    if (sfxToggle) sfxToggle.checked = sfxEnabled;
    if (volSlider) volSlider.value = String(musicVol);
    if (volLabel) volLabel.textContent = String(musicVol);

    const bElInit = document.getElementById('admin-brightness');
    const sElInit = document.getElementById('admin-saturation');
    const bLblInit = document.getElementById('admin-brightness-label');
    const sLblInit = document.getElementById('admin-saturation-label');
    if (bElInit) {
        bElInit.min = '0';
        bElInit.max = '150';
        bElInit.step = '1';
        bElInit.value = String(brightness);
    }
    if (sElInit) {
        sElInit.min = '0';
        sElInit.max = '150';
        sElInit.step = '1';
        sElInit.value = String(saturation);
    }
    if (bLblInit) bLblInit.textContent = String(brightness) + '%';
    if (sLblInit) sLblInit.textContent = String(saturation) + '%';

    function updateColorPreview() {
        const bEl = document.getElementById('admin-brightness');
        const sEl = document.getElementById('admin-saturation');
        if (bEl) {
            bEl.min = '0';
            bEl.max = '150';
            bEl.step = '1';
        }
        if (sEl) {
            sEl.min = '0';
            sEl.max = '150';
            sEl.step = '1';
        }
        const b = Math.min(150, Math.max(0, parseInt(bEl?.value, 10) || 100));
        const s = Math.min(150, Math.max(0, parseInt(sEl?.value, 10) || 100));
        if (bEl && String(bEl.value) !== String(b)) bEl.value = String(b);
        if (sEl && String(sEl.value) !== String(s)) sEl.value = String(s);
        const bLbl = document.getElementById('admin-brightness-label');
        const sLbl = document.getElementById('admin-saturation-label');
        if (bLbl) bLbl.textContent = String(b) + '%';
        if (sLbl) sLbl.textContent = String(s) + '%';
        if (colorPreview) {
            colorPreview.style.filter = `brightness(${(b / 100).toFixed(3)}) saturate(${(s / 100).toFixed(3)})`;
            colorPreview.style.webkitFilter = `brightness(${(b / 100).toFixed(3)}) saturate(${(s / 100).toFixed(3)})`;
        }
        applyBrightness(b);
        applySaturation(s);
    }
    updateColorPreview();

    // ---- Abrir / cerrar ----
    function openPanel() {
        panel.classList.remove('hidden');
        updateColorPreview();
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

    // ---- Brillo del juego ----
    const brightnessSliderEl = document.getElementById('admin-brightness');
    if (brightnessSliderEl) {
        brightnessSliderEl.min = '0';
        brightnessSliderEl.max = '150';
        brightnessSliderEl.step = '1';
        const handleB = () => {
            applyBrightness(brightnessSliderEl.value);
            const lbl = document.getElementById('admin-brightness-label');
            const v = Math.min(150, Math.max(0, parseInt(brightnessSliderEl.value, 10) || 100));
            if (lbl) lbl.textContent = String(v) + '%';
            updateColorPreview();
        };
        brightnessSliderEl.addEventListener('input', handleB, { passive: true });
        brightnessSliderEl.addEventListener('change', handleB);
    }

    // ---- Saturación del juego ----
    const saturationSliderEl = document.getElementById('admin-saturation');
    if (saturationSliderEl) {
        saturationSliderEl.min = '0';
        saturationSliderEl.max = '150';
        saturationSliderEl.step = '1';
        const handleS = () => {
            applySaturation(saturationSliderEl.value);
            const lbl = document.getElementById('admin-saturation-label');
            const v = Math.min(150, Math.max(0, parseInt(saturationSliderEl.value, 10) || 100));
            if (lbl) lbl.textContent = String(v) + '%';
            updateColorPreview();
        };
        saturationSliderEl.addEventListener('input', handleS, { passive: true });
        saturationSliderEl.addEventListener('change', handleS);
    }

    // ---- Tamano de la UI ----
    document.querySelectorAll('.admin-size-btn').forEach((b) => {
        b.addEventListener('click', () => {
            applyUISize(b.dataset.size || 'small');
            if (typeof playSFX === 'function') playSFX('pickup');
        });
    });

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
