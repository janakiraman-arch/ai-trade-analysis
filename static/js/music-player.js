document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('ambient-audio');
    const players = Array.from(document.querySelectorAll('[data-music-player]'));

    if (!audio || players.length === 0) {
        return;
    }

    const ENABLED_KEY = 'apexMusicEnabled';
    const VOLUME_KEY = 'apexMusicVolume';
    const storedVolumeRaw = localStorage.getItem(VOLUME_KEY);
    const storedVolume = storedVolumeRaw === null ? NaN : Number(storedVolumeRaw);
    const initialVolume = Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
        ? storedVolume
        : 0.35;

    let wantsPlayback = localStorage.getItem(ENABLED_KEY) === 'true';
    let awaitingGesture = false;

    audio.volume = initialVolume;

    function syncUI() {
        const isPlaying = !audio.paused;
        const label = isPlaying ? 'Ambient On' : (awaitingGesture ? 'Tap to Start' : 'Ambient Off');
        const title = isPlaying ? 'Pause ambient music' : 'Play ambient music';

        players.forEach(player => {
            const toggle = player.querySelector('[data-music-toggle]');
            const volume = player.querySelector('[data-music-volume]');
            const text = player.querySelector('[data-music-label]');

            if (toggle) {
                toggle.classList.toggle('active', isPlaying);
                toggle.title = title;
                toggle.setAttribute('aria-pressed', String(isPlaying));
            }

            if (volume) {
                volume.value = String(Math.round(audio.volume * 100));
            }

            if (text) {
                text.textContent = label;
            }
        });
    }

    async function startPlayback() {
        wantsPlayback = true;
        localStorage.setItem(ENABLED_KEY, 'true');

        try {
            await audio.play();
            awaitingGesture = false;
        } catch (error) {
            awaitingGesture = true;
        }

        syncUI();
    }

    function stopPlayback() {
        wantsPlayback = false;
        awaitingGesture = false;
        audio.pause();
        localStorage.setItem(ENABLED_KEY, 'false');
        syncUI();
    }

    function resumeAfterGesture() {
        if (!wantsPlayback || !awaitingGesture) {
            return;
        }

        startPlayback();
    }

    players.forEach(player => {
        const toggle = player.querySelector('[data-music-toggle]');
        const volume = player.querySelector('[data-music-volume]');

        if (toggle) {
            toggle.addEventListener('click', () => {
                if (audio.paused || awaitingGesture) {
                    startPlayback();
                } else {
                    stopPlayback();
                }
            });
        }

        if (volume) {
            volume.addEventListener('input', event => {
                const nextVolume = Number(event.target.value) / 100;
                audio.volume = nextVolume;
                localStorage.setItem(VOLUME_KEY, String(nextVolume));
            });
        }
    });

    document.addEventListener('pointerdown', resumeAfterGesture, { passive: true });
    document.addEventListener('keydown', resumeAfterGesture);
    audio.addEventListener('play', syncUI);
    audio.addEventListener('pause', syncUI);

    syncUI();

    if (wantsPlayback) {
        startPlayback();
    }
});
