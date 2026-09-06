(() => {
    if (window.__bondsMallLogoCycleStarted) return;
    window.__bondsMallLogoCycleStarted = true;

    const sequence = ['text', 'black', 'text', 'gold'];
    const duration = 5000;
    let index = 0;

    function triggerTextGleam() {
        document.querySelectorAll('.logo').forEach((logoContainer) => {
            if (!logoContainer.querySelector('.logo-text')) return;
            const overlay = document.createElement('div');
            overlay.className = 'logo-gleam-overlay';
            const sweep = document.createElement('span');
            sweep.className = 'logo-gleam-sweep';
            overlay.appendChild(sweep);
            logoContainer.appendChild(overlay);
            window.setTimeout(() => overlay.remove(), 2800);
        });
    }

    function applyFace(faceName) {
        document.querySelectorAll('.logo').forEach((logoContainer) => {
            const faces = {
                text: logoContainer.querySelector('.logo-text'),
                black: logoContainer.querySelector('.logo-img--black'),
                gold: logoContainer.querySelector('.logo-img--gold')
            };
            Object.entries(faces).forEach(([name, face]) => {
                if (face) face.classList.toggle('logo-face--active', name === faceName);
            });
        });
        if (faceName === 'text') triggerTextGleam();
    }

    function advance() {
        index = (index + 1) % sequence.length;
        applyFace(sequence[index]);
        window.setTimeout(advance, duration);
    }

    function start() {
        applyFace('text');
        window.setTimeout(advance, duration);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
