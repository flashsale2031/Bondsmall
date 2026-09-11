(() => {
    if (window.__bondsMallLogoCycleStarted) return;
    window.__bondsMallLogoCycleStarted = true;

    // Exact 30-second cycle:
    // 0-10s  regular wordmark
    // 10-20s crammed/arched "smile" wordmark with eyes
    // 20-29s regular wordmark
    // 29-30s 1-second light beam
    // then repeat
    const REGULAR_START_MS = 0;
    const SMILE_START_MS = 10000;
    const REGULAR_AGAIN_MS = 20000;
    const BEAM_START_MS = 29000;
    const CYCLE_MS = 30000;

    function installTextLogoStyles() {
        if (document.getElementById('bonds-mall-text-logo-style')) return;
        const style = document.createElement('style');
        style.id = 'bonds-mall-text-logo-style';
        style.textContent = `
            .logo {
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 9.5rem !important;
                min-height: 42px !important;
                overflow: visible !important;
                flex: 0 0 auto !important;
                margin: 0 !important;
            }
            .logo-img { display: none !important; }

            /* Keep the two logo faces in exactly the same place so only one is visible. */
            .logo .logo-face {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                transition: opacity .35s ease, visibility 0s linear .35s !important;
            }
            .logo .logo-face--active {
                opacity: 1 !important;
                visibility: visible !important;
                transition: opacity .35s ease !important;
            }
            .logo-text, .logo-text-smile {
                color: #111 !important;
                font-family: inherit !important;
                font-weight: 800 !important;
                line-height: 1 !important;
            }
            .logo-text {
                display: block !important;
                white-space: nowrap !important;
                letter-spacing: .12em !important;
            }
            .logo-text::after {
                content: '';
                position: absolute;
                inset: -40% -16%;
                pointer-events: none;
                opacity: 0;
                background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0) 44%, rgba(255,255,255,.98) 50%, rgba(255,255,255,0) 56%, transparent 65%);
                transform: translateX(-120%);
            }
            .logo.logo-beam .logo-text::after {
                opacity: 1;
                animation: bonds-logo-beam 1s linear both;
            }

            /* The smile face tightens the letters into a crammed, upward-wrapped smile. */
            .logo-text-smile {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                white-space: nowrap !important;
                letter-spacing: -.16em !important;
                font-size: .98em !important;
                transform: translate(-50%, -50%) !important;
                position: absolute !important;
            }
            /* Two friendly dots sit above the smiling wordmark as eyes. */
            .logo-text-smile::before {
                content: '•  •';
                position: absolute !important;
                left: 50% !important;
                top: -1.02em !important;
                transform: translateX(-50%) !important;
                color: #111 !important;
                font-family: Arial, sans-serif !important;
                font-size: .62em !important;
                font-weight: 900 !important;
                letter-spacing: .16em !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                pointer-events: none !important;
            }
            .logo-text-smile .logo-smile-char {
                display: inline-block !important;
                margin: 0 -.045em !important;
                letter-spacing: -.08em !important;
                transition: transform .65s cubic-bezier(.23,1,.32,1), opacity .4s ease !important;
            }
            /* Ends rise, center dips: an upward-wrapping smile arc. */
            .logo-text-smile .logo-smile-char:nth-child(1) { transform: translateY(-.34em) rotate(-22deg); }
            .logo-text-smile .logo-smile-char:nth-child(2) { transform: translateY(-.20em) rotate(-15deg); }
            .logo-text-smile .logo-smile-char:nth-child(3) { transform: translateY(-.06em) rotate(-8deg); }
            .logo-text-smile .logo-smile-char:nth-child(4) { transform: translateY(.08em) rotate(-3deg); }
            .logo-text-smile .logo-smile-char:nth-child(5) { transform: translateY(.15em) rotate(0deg); }
            .logo-text-smile .logo-smile-char:nth-child(6) { transform: translateY(.08em) rotate(3deg); }
            .logo-text-smile .logo-smile-char:nth-child(7) { transform: translateY(-.06em) rotate(8deg); }
            .logo-text-smile .logo-smile-char:nth-child(8) { transform: translateY(-.20em) rotate(15deg); }
            .logo-text-smile .logo-smile-char:nth-child(9) { transform: translateY(-.34em) rotate(22deg); }

            @keyframes bonds-logo-beam {
                from { transform: translateX(-120%); }
                to { transform: translateX(120%); }
            }

            /* The header-left group always starts at the left: menu, then logo. */
            .header .header-left {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: .55rem !important;
                min-width: 0 !important;
                width: auto !important;
                flex: 0 0 auto !important;
            }
            .header .header-left .menu-btn {
                flex: 0 0 auto !important;
            }

            /* On phones use a clean two-row storefront header. */
            @media (max-width: 800px) {
                .header {
                    grid-template-columns: minmax(0, 1fr) !important;
                    grid-template-rows: auto auto !important;
                    gap: .55rem !important;
                    padding: .7rem .75rem .8rem !important;
                    min-height: 0 !important;
                }
                .header .header-left {
                    grid-column: 1 !important;
                    grid-row: 1 !important;
                    width: auto !important;
                    min-width: 0 !important;
                    justify-content: flex-start !important;
                    gap: .5rem !important;
                }
                .header .header-actions {
                    grid-column: 1 !important;
                    grid-row: 1 !important;
                    justify-self: end !important;
                    margin-left: auto !important;
                    flex: 0 0 auto !important;
                }
                .header #header-search {
                    grid-column: 1 !important;
                    grid-row: 2 !important;
                    display: block !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    height: 46px !important;
                    padding: 0 1rem !important;
                    font-size: .98rem !important;
                    border-radius: 999px !important;
                }
                .logo { min-width: 8rem !important; min-height: 36px !important; }
                .logo-text, .logo-text-smile { font-size: .9rem !important; }
            }

            @media (max-width: 520px) {
                .header #header-search { height: 44px !important; font-size: .95rem !important; }
                .logo { min-width: 7.5rem !important; }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureTextFaces(logo) {
        const regular = logo.querySelector('.logo-text');
        if (!regular) return null;

        logo.querySelectorAll('.logo-img').forEach((img) => img.remove());

        let smile = logo.querySelector('.logo-text-smile');
        if (!smile) {
            smile = document.createElement('span');
            smile.className = 'logo-text-smile logo-face';
            smile.setAttribute('aria-label', 'Bonds Mall');
            'BONDSMALL'.split('').forEach((letter) => {
                const char = document.createElement('span');
                char.className = 'logo-smile-char';
                char.textContent = letter;
                char.setAttribute('aria-hidden', 'true');
                smile.appendChild(char);
            });
            logo.appendChild(smile);
        }

        regular.classList.add('logo-face');
        return { regular, smile };
    }

    function showRegular(logo, withBeam = false) {
        const faces = ensureTextFaces(logo);
        if (!faces) return;
        faces.smile.classList.remove('logo-face--active');
        faces.regular.classList.add('logo-face--active');
        logo.classList.toggle('logo-beam', withBeam);
    }

    function showSmile(logo) {
        const faces = ensureTextFaces(logo);
        if (!faces) return;
        logo.classList.remove('logo-beam');
        faces.regular.classList.remove('logo-face--active');
        faces.smile.classList.add('logo-face--active');
    }

    function startLogoCycle(logo) {
        const startTime = performance.now();

        const render = () => {
            const elapsed = (performance.now() - startTime) % CYCLE_MS;

            if (elapsed < SMILE_START_MS) {
                showRegular(logo, false);
            } else if (elapsed < REGULAR_AGAIN_MS) {
                showSmile(logo);
            } else if (elapsed < BEAM_START_MS) {
                showRegular(logo, false);
            } else {
                showRegular(logo, true);
            }

            window.setTimeout(render, 100);
        };

        void REGULAR_START_MS;
        showRegular(logo, false);
        render();
    }

    function start() {
        installTextLogoStyles();
        document.querySelectorAll('.logo').forEach((logo) => {
            ensureTextFaces(logo);
            startLogoCycle(logo);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();