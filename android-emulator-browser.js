/*
 * Bonds Mall Android emulator browser popup.
 *
 * This is the browser-side companion to the android-emulator-on-web service.
 * It renders the same phone/browser popup used by the standalone emulator and
 * communicates with the emulator service over Socket.IO.
 *
 * Configure the service endpoint with:
 *   window.BONDS_MALL_EMULATOR_SOCKET_URL = 'http://host:41000';
 * or localStorage.setItem('bonds_mall_emulator_socket_url', 'http://host:41000')
 * before opening the emulator.
 *
 * ClassifiedAds integration: the Seller post flow opens this component instead
 * of the old readable mini-browser window.
 */
(function (global) {
  'use strict';

  const DEFAULT_SOCKET_URL = (() => {
    try {
      const stored = global.localStorage?.getItem('bonds_mall_emulator_socket_url');
      if (stored) return stored;
    } catch (_) {}
    if (global.BONDS_MALL_EMULATOR_SOCKET_URL) return String(global.BONDS_MALL_EMULATOR_SOCKET_URL);
    if (global.location?.hostname) {
      const protocol = global.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${global.location.hostname}:41000`;
    }
    return 'http://localhost:41000';
  })();

  const SOCKET_IO_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.3.6/socket.io.min.js';
  const HOME_URL = 'https://bondsmall.com/';
  const STYLE_ID = 'bonds-mall-android-emulator-style';
  const ROOT_ID = 'bonds-mall-android-emulator-root';

  let socket = null;
  let socketPromise = null;
  let activeUrl = '';
  let pointerStart = null;
  let lastPointerEnd = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return HOME_URL;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
    return `https://duckduckgo.com/?q=${encodeURIComponent(raw)}`;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} .bme-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.78);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #${ROOT_ID} .bme-modal{width:min(96vw,560px);max-height:96vh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:#202124;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.65)}
      #${ROOT_ID} .bme-titlebar,#${ROOT_ID} .bme-toolbar{display:flex;align-items:center;gap:8px;padding:10px 12px}
      #${ROOT_ID} .bme-titlebar{justify-content:space-between;color:#f8f9fa;border-bottom:1px solid rgba(255,255,255,.06)}
      #${ROOT_ID} .bme-titlebar span{color:#9aa0a6;font-weight:400}
      #${ROOT_ID} .bme-close,#${ROOT_ID} .bme-toolbar button,#${ROOT_ID} .bme-nav button,#${ROOT_ID} .bme-retry{border:0;border-radius:8px;background:#3c4043;color:#fff;cursor:pointer}
      #${ROOT_ID} .bme-close{width:34px;height:34px;font-size:24px;line-height:1}
      #${ROOT_ID} .bme-toolbar{background:#292a2d}
      #${ROOT_ID} .bme-toolbar input{min-width:0;flex:1;height:34px;border:0;border-radius:18px;padding:0 13px;background:#f1f3f4;color:#202124;outline:none}
      #${ROOT_ID} .bme-toolbar button{min-width:34px;height:34px;padding:0 10px;font-weight:700}
      #${ROOT_ID} .bme-device{width:min(86vw,380px);margin:14px auto;padding:18px 10px 12px;border-radius:30px;background:#090909;box-shadow:inset 0 0 0 2px #333,0 16px 45px rgba(0,0,0,.45)}
      #${ROOT_ID} .bme-camera{width:64px;height:7px;margin:0 auto 10px;border-radius:8px;background:#242424}
      #${ROOT_ID} .bme-screen-shell{width:100%;aspect-ratio:9/19.5;overflow:hidden;border-radius:15px;background:#000;touch-action:none;user-select:none}
      #${ROOT_ID} .bme-screen{width:100%;height:100%;display:block;object-fit:cover;cursor:grab;user-select:none;-webkit-user-drag:none}
      #${ROOT_ID} .bme-screen:active{cursor:grabbing}
      #${ROOT_ID} .bme-boot{height:100%;display:grid;place-items:center;padding:20px;box-sizing:border-box;color:#bbb;text-align:center}
      #${ROOT_ID} .bme-nav{display:flex;justify-content:center;gap:8px;padding-top:10px}
      #${ROOT_ID} .bme-nav button{padding:7px 10px}
      #${ROOT_ID} .bme-status{padding:9px 14px 13px;color:#9aa0a6;font-size:12px;text-align:center}
      #${ROOT_ID} .bme-status[data-state="error"]{color:#fca5a5}
      #${ROOT_ID} .bme-status[data-state="connected"]{color:#86efac}
      #${ROOT_ID} .bme-retry{display:inline-block;margin-left:6px;padding:3px 8px;font-size:11px}
      @media(max-width:520px){#${ROOT_ID} .bme-backdrop{padding:4px}#${ROOT_ID} .bme-modal{width:100%;max-height:99vh;border-radius:14px}#${ROOT_ID} .bme-device{width:min(90vw,360px)}}
    `;
    document.head.appendChild(style);
  }

  function ensureSocketIo() {
    if (global.io) return Promise.resolve(global.io);
    if (socketPromise) return socketPromise;
    socketPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SOCKET_IO_CDN}"]`);
      if (existing) {
        existing.addEventListener('load', () => global.io ? resolve(global.io) : reject(new Error('Socket.IO loaded without a client library.')));
        existing.addEventListener('error', () => reject(new Error('Socket.IO client could not be loaded.')));
        return;
      }
      const script = document.createElement('script');
      script.src = SOCKET_IO_CDN;
      script.async = true;
      script.onload = () => global.io ? resolve(global.io) : reject(new Error('Socket.IO loaded without a client library.'));
      script.onerror = () => reject(new Error('Socket.IO client could not be loaded from the CDN.'));
      document.head.appendChild(script);
    });
    return socketPromise;
  }

  function setStatus(message, state) {
    const el = document.getElementById('bme-status');
    if (!el) return;
    el.dataset.state = state || '';
    el.textContent = message;
  }

  function getScreenImage() {
    return document.getElementById('bme-screen-image');
  }

  function screenPoint(event) {
    const image = getScreenImage();
    if (!image) return { x: 0, y: 0 };
    const rect = image.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || rect.width || 1;
    const naturalHeight = image.naturalHeight || rect.height || 1;
    const x = Math.max(0, Math.min(naturalWidth - 1, ((event.clientX - rect.left) / rect.width) * naturalWidth));
    const y = Math.max(0, Math.min(naturalHeight - 1, ((event.clientY - rect.top) / rect.height) * naturalHeight));
    return { x: Math.round(x), y: Math.round(y) };
  }

  function emitKey(key) {
    if (!socket) return;
    socket.emit('key', { key });
  }

  function connectSocket() {
    return ensureSocketIo().then(io => {
      if (socket && socket.connected) return socket;
      socket = io(DEFAULT_SOCKET_URL, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        setStatus('Android emulator connected · browser session ready.', 'connected');
      });
      socket.on('disconnect', () => {
        setStatus('Android emulator disconnected. Check the emulator service and retry.', 'error');
      });
      socket.on('connect_error', error => {
        setStatus(`Android emulator connection failed: ${error?.message || 'connection error'}`, 'error');
      });
      socket.on('error', error => {
        setStatus(`Android emulator error: ${error?.message || error || 'unknown error'}`, 'error');
      });
      socket.on('data', data => {
        const image = getScreenImage();
        if (!image || !data) return;
        image.src = `data:image/jpeg;base64,${data}`;
        image.hidden = false;
        const boot = document.getElementById('bme-boot');
        if (boot) boot.hidden = true;
      });
      return socket;
    });
  }

  function launchBrowser(url) {
    const normalized = normalizeUrl(url);
    activeUrl = normalized;
    const address = document.getElementById('bme-address');
    if (address) address.value = normalized;
    return connectSocket().then(client => {
      client.emit('openBrowser', { url: normalized });
      setStatus(`Opening ${normalized} in Android browser…`, 'connected');
      return normalized;
    }).catch(error => {
      setStatus(`${error.message} `, 'error');
      const status = document.getElementById('bme-status');
      if (status && !status.querySelector('button')) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'bme-retry';
        retry.textContent = 'Retry';
        retry.onclick = () => launchBrowser(activeUrl);
        status.appendChild(retry);
      }
      return normalized;
    });
  }

  function bindScreen() {
    const shell = document.getElementById('bme-screen-shell');
    if (!shell || shell.dataset.bound === '1') return;
    shell.dataset.bound = '1';
    shell.addEventListener('pointerdown', event => {
      pointerStart = screenPoint(event);
      lastPointerEnd = pointerStart;
    });
    shell.addEventListener('pointerup', event => {
      if (!pointerStart || !socket) return;
      lastPointerEnd = screenPoint(event);
      const dx = lastPointerEnd.x - pointerStart.x;
      const dy = lastPointerEnd.y - pointerStart.y;
      if (Math.abs(dx) >= 25 || Math.abs(dy) >= 25) {
        socket.emit('swipe', { from: pointerStart, to: lastPointerEnd });
      } else {
        socket.emit('tap', pointerStart);
      }
      pointerStart = null;
    });
    shell.addEventListener('pointercancel', () => { pointerStart = null; });
  }

  function close() {
    const root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    pointerStart = null;
  }

  function render(url) {
    ensureStyles();
    let root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="bme-backdrop" role="dialog" aria-modal="true" aria-label="Android emulator browser">
        <div class="bme-modal">
          <div class="bme-titlebar">
            <div><strong>Android Emulator</strong><span> • Browser</span></div>
            <button type="button" class="bme-close" id="bme-close" aria-label="Close emulator">×</button>
          </div>
          <div class="bme-toolbar">
            <button type="button" id="bme-back" aria-label="Android back">‹</button>
            <button type="button" id="bme-home" aria-label="Android home">⌂</button>
            <input id="bme-address" aria-label="Browser address" autocomplete="off" spellcheck="false" value="${escapeHtml(normalizeUrl(url))}">
            <button type="button" id="bme-go">Go</button>
          </div>
          <div class="bme-device">
            <div class="bme-camera"></div>
            <div class="bme-screen-shell" id="bme-screen-shell">
              <div class="bme-boot" id="bme-boot">Starting Android emulator…</div>
              <img class="bme-screen" id="bme-screen-image" alt="Android emulator screen" hidden>
            </div>
            <div class="bme-nav">
              <button type="button" id="bme-nav-back">Back</button>
              <button type="button" id="bme-nav-home">Home</button>
              <button type="button" id="bme-nav-recents">Recents</button>
            </div>
          </div>
          <div class="bme-status" id="bme-status">Connecting to Android emulator…</div>
        </div>
      </div>`;
    document.body.appendChild(root);

    document.getElementById('bme-close').onclick = close;
    document.getElementById('bme-back').onclick = () => emitKey('Back');
    document.getElementById('bme-home').onclick = () => emitKey('Home');
    document.getElementById('bme-nav-back').onclick = () => emitKey('Back');
    document.getElementById('bme-nav-home').onclick = () => emitKey('Home');
    document.getElementById('bme-nav-recents').onclick = () => emitKey('Recents');
    document.getElementById('bme-go').onclick = () => launchBrowser(document.getElementById('bme-address')?.value || url);
    document.getElementById('bme-address').addEventListener('keydown', event => {
      if (event.key === 'Enter') launchBrowser(event.currentTarget.value);
    });
    document.querySelector(`#${ROOT_ID} .bme-backdrop`).addEventListener('click', event => {
      if (event.target === event.currentTarget) close();
    });
    bindScreen();
    launchBrowser(url);
  }

  function open(url) {
    render(url || HOME_URL);
  }

  function setSocketUrl(url) {
    const value = String(url || '').trim();
    if (!value) return;
    try { global.localStorage?.setItem('bonds_mall_emulator_socket_url', value); } catch (_) {}
  }

  global.BondsMallAndroidEmulator = Object.freeze({
    open,
    close,
    connect: connectSocket,
    setSocketUrl,
    getSocketUrl: () => DEFAULT_SOCKET_URL,
    launchBrowser
  });
})(window);
