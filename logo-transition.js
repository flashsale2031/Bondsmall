(() => {
    if (window.__bondsMallLogoCycleStarted) return;
    window.__bondsMallLogoCycleStarted = true;

    const PHASE_DURATION = 10000;
    const BEAM_DELAY = 8000;

    function installTextLogoStyles() {
        if (document.getElementById('bonds-mall-text-logo-style')) return;
        const style = document.createElement('style');
        style.id = 'bonds-mall-text-logo-style';
        style.textContent = `
            .logo { position: relative !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; min-width: 9.5rem !important; min-height: 42px !important; overflow: visible !important; }
            .logo-img { display: none !important; }
            .logo-text, .logo-text-smile { color: #111 !important; font-family: inherit !important; font-weight: 800 !important; letter-spacing: .12em !important; line-height: 1 !important; }
            .logo-text { position: relative !important; display: inline-block !important; white-space: nowrap !important; }
            .logo-text::after { content: ''; position: absolute; inset: -35% -12%; pointer-events: none; opacity: 0; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0) 44%, rgba(255,255,255,.95) 50%, rgba(255,255,255,0) 56%, transparent 65%); transform: translateX(-120%); }
            .logo.logo-beam .logo-text::after { opacity: 1; animation: bonds-logo-beam 1.8s ease-out both; }
            .logo-text-smile { display: inline-flex !important; align-items: center !important; justify-content: center !important; white-space: nowrap !important; letter-spacing: 0 !important; font-size: .95em !important; }
            .logo-text-smile .logo-smile-char { display: inline-block; margin: 0 -.01em; transition: transform .8s ease, opacity .8s ease; }
            .logo-text-smile .logo-smile-char:nth-child(1) { transform: translateY(-.22em) rotate(-20deg); }
            .logo-text-smile .logo-smile-char:nth-child(2) { transform: translateY(-.08em) rotate(-12deg); }
            .logo-text-smile .logo-smile-char:nth-child(3) { transform: translateY(.08em) rotate(-6deg); }
            .logo-text-smile .logo-smile-char:nth-child(4) { transform: translateY(.18em) rotate(-2deg); }
            .logo-text-smile .logo-smile-char:nth-child(5) { transform: translateY(.22em) rotate(0deg); }
            .logo-text-smile .logo-smile-char:nth-child(6) { transform: translateY(.18em) rotate(2deg); }
            .logo-text-smile .logo-smile-char:nth-child(7) { transform: translateY(.08em) rotate(6deg); }
            .logo-text-smile .logo-smile-char:nth-child(8) { transform: translateY(-.08em) rotate(12deg); }
            .logo-text-smile .logo-smile-char:nth-child(9) { transform: translateY(-.22em) rotate(20deg); }
            @keyframes bonds-logo-beam { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
            @media (max-width: 520px) {
                .logo { min-width: 8rem !important; min-height: 36px !important; }
                .logo-text, .logo-text-smile { font-size: .9rem !important; }
            }
        `;
        document.head.appendChild(style);
    }

    function installProfessionalSearchStyles() {
        if (document.getElementById('bonds-mall-professional-search-style')) return;
        const search = document.getElementById('header-search');
        if (!search) return;

        const style = document.createElement('style');
        style.id = 'bonds-mall-professional-search-style';
        style.textContent = `
            /* Professional storefront search sizing — index.html */
            .header #header-search {
                width: 100% !important;
                min-width: 0 !important;
                height: 48px !important;
                padding: 0 1.15rem !important;
                border: 1px solid #c9bfb4 !important;
                border-radius: 999px !important;
                background: #fff !important;
                color: #1c1b1a !important;
                font-size: 1rem !important;
                line-height: 1.2 !important;
                box-shadow: 0 3px 12px rgba(36, 29, 23, .08) !important;
                transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease !important;
            }
            .header #header-search::placeholder { color: #777069 !important; opacity: 1 !important; }
            .header #header-search:focus {
                border-color: #8f4338 !important;
                box-shadow: 0 0 0 4px rgba(143, 67, 56, .10), 0 5px 16px rgba(36, 29, 23, .10) !important;
                transform: translateY(-1px);
            }
            @media (min-width: 801px) {
                .header { grid-template-columns: minmax(220px, 1fr) minmax(360px, 620px) minmax(220px, 1fr) !important; }
                .header #header-search { height: 50px !important; font-size: 1.02rem !important; }
            }
            @media (max-width: 800px) {
                .header #header-search { height: 44px !important; font-size: .95rem !important; padding-inline: .95rem !important; }
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
        regular.classList.add('logo-face--active');
        return { regular, smile };
    }

    function showRegular(logo, withBeam = false) {
        const faces = ensureTextFaces(logo);
        if (!faces) return;
        faces.regular.classList.add('logo-face--active');
        faces.smile.classList.remove('logo-face--active');
        logo.classList.toggle('logo-beam', withBeam);
    }

    function showSmile(logo) {
        const faces = ensureTextFaces(logo);
        if (!faces) return;
        faces.regular.classList.remove('logo-face--active');
        faces.smile.classList.add('logo-face--active');
        logo.classList.remove('logo-beam');
    }

    function startLogoCycle(logo) {
        let phase = 1;
        let beamTimer = null;
        const advance = () => {
            window.clearTimeout(beamTimer);
            if (phase === 1) {
                showSmile(logo);
            } else {
                showRegular(logo, false);
                beamTimer = window.setTimeout(() => showRegular(logo, true), BEAM_DELAY);
            }
            phase = phase === 1 ? 2 : 1;
            window.setTimeout(advance, PHASE_DURATION);
        };
        showRegular(logo, false);
        window.setTimeout(advance, PHASE_DURATION);
    }

    function start() {
        installTextLogoStyles();
        installProfessionalSearchStyles();
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
