        // LANDING SCREEN LOGIC
        const landingScreen = document.getElementById('landing-screen');
        const startBtn = document.getElementById('start-btn');
        const usernameInput = document.getElementById('username-input');

        // Check username input
        function updateStartButton() {
            if (!startBtn || !usernameInput) return;
            const username = usernameInput.value.trim();
            if (username.length > 0) {
                startBtn.disabled = false;
                startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        if (usernameInput) {
            usernameInput.addEventListener('input', updateStartButton);
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !startBtn.disabled) {
                    startBtn.click();
                }
            });
            updateStartButton();
        }

        // Start button
        startBtn.addEventListener('click', () => {
            if (startBtn.disabled) return;
            const username = usernameInput ? usernameInput.value.trim() : 'Chef3D';
            localStorage.setItem('LogicCooked3D_PlayerName', username);
            if (typeof playSFX === 'function') {
                playSFX('success');
            }
            if (typeof startBackgroundMusic === 'function') {
                startBackgroundMusic();
            }
            landingScreen.classList.add('hidden');
        });

        // Window resize noop for new bg (no JS positioning needed)
        window.addEventListener('resize', () => { });
