/* Bonds Mall Resubmission Flow
 * Scans seller.html for product-ad URLs, checks each URL through the optional
 * same-origin/server URL-status endpoint, and displays only non-live ads that
 * need resubmission. A browser cannot reliably perform arbitrary cross-origin
 * HEAD/GET checks because of CORS, so the checker supports a configurable
 * server-side status endpoint and a same-origin fallback.
 */
(function () {
  'use strict';

  const PLATFORMS = [
    'Craigslist', 'AdLandPro', 'ClassifiedAds', 'Facebook Marketplace',
    'OfferUp', 'Mercari', 'Poshmark', 'Nextdoor'
  ];
  const state = { ads: [], broken: [], checkedAt: null, scanning: false };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getSellerDocument() {
    // If this script is loaded by seller.html itself, use its live DOM.
    if (document.title && /seller/i.test(document.title)) return document;
    return null;
  }

  async function fetchSellerHtml() {
    const local = getSellerDocument();
    if (local) return local;
    const response = await fetch('seller.html', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('seller.html could not be loaded (' + response.status + ').');
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }

  function looksLikeAdUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (!/^https?:$/.test(u.protocol)) return false;
      if (/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) return false;
      // Exclude ordinary navigation/assets and retain recognizable listing URLs.
      const text = (u.hostname + u.pathname + u.search).toLowerCase();
      return /(craigslist|adlandpro|classifiedads|facebook|marketplace|offerup|mercari|poshmark|nextdoor|listing|classified|ad[-_]?id|product)/.test(text);
    } catch (_) { return false; }
  }

  function inferPlatform(url) {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('craigslist')) return 'Craigslist';
    if (host.includes('adlandpro')) return 'AdLandPro';
    if (host.includes('classifiedads')) return 'ClassifiedAds';
    if (host.includes('facebook')) return 'Facebook Marketplace';
    if (host.includes('offerup')) return 'OfferUp';
    if (host.includes('mercari')) return 'Mercari';
    if (host.includes('poshmark')) return 'Poshmark';
    if (host.includes('nextdoor')) return 'Nextdoor';
    return 'Unknown';
  }

  function findValue(root, names) {
    const candidates = [...root.querySelectorAll('[data-product],[data-ad],[data-listing],[data-location]')];
    for (const el of candidates) {
      for (const name of names) {
        const value = el.dataset && el.dataset[name];
        if (value) return value;
      }
    }
    const text = root.textContent || '';
    for (const name of names) {
      const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:=-]\\s*([^\\n|]+)', 'i');
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return '';
  }

  function extractAds(doc) {
    const ads = [];
    const anchors = [...doc.querySelectorAll('a[href]')];
    anchors.forEach((a, index) => {
      const href = a.href;
      if (!looksLikeAdUrl(href)) return;
      const root = a.closest('[data-product],[data-ad],[data-listing],article,tr,li,.ad,.listing,.product') || a.parentElement || a;
      const product = a.dataset.product || root.dataset?.product || root.dataset?.productName || findValue(root, ['product','productName','item','title']) || a.textContent.trim() || 'Unknown product';
      const location = a.dataset.location || root.dataset?.location || root.dataset?.city || findValue(root, ['location','city','market','state']) || 'Unknown location';
      ads.push({ id: 'seller-ad-' + index, url: href, product: product.slice(0, 240), location: location.slice(0, 240), platform: inferPlatform(href) });
    });

    // Also consume explicit records exposed by seller/mastermind integrations.
    const recordSources = [window.BondsMall && window.BondsMall.activeAds, window.BondsMallActiveAds];
    recordSources.forEach(source => {
      if (!Array.isArray(source)) return;
      source.forEach((ad, index) => {
        if (!ad || !looksLikeAdUrl(ad.url)) return;
        ads.push({ id: ad.jobId || 'record-' + index, url: ad.url, product: ad.product || ad.title || 'Unknown product', location: ad.location || 'Unknown location', platform: ad.platform || inferPlatform(ad.url) });
      });
    });

    return ads.filter((ad, i, all) => all.findIndex(x => x.url === ad.url) === i);
  }

  async function checkUrl(url) {
    const endpoint = window.BONDS_MALL_URL_STATUS_ENDPOINT || localStorage.getItem('bondsMallUrlStatusEndpoint');
    if (endpoint) {
      const response = await fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(url), { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('URL status service returned ' + response.status);
      const result = await response.json();
      return { live: result.status === 200 || result.live === true, status: result.status || null, finalUrl: result.url || url };
    }

    // Same-origin fallback. HEAD is preferred, with GET as a fallback.
    const target = new URL(url, location.href);
    if (target.origin !== location.origin) return { live: false, status: null, error: 'Cross-origin URL requires BONDS_MALL_URL_STATUS_ENDPOINT.' };
    let response;
    try { response = await fetch(target.href, { method: 'HEAD', cache: 'no-store', redirect: 'follow', credentials: 'same-origin' }); }
    catch (_) { response = null; }
    if (!response || response.status === 405 || response.status === 501) response = await fetch(target.href, { method: 'GET', cache: 'no-store', redirect: 'follow', credentials: 'same-origin' });
    return { live: !!response && response.status === 200, status: response ? response.status : null, finalUrl: response ? response.url : url };
  }

  async function scan() {
    if (state.scanning) return state;
    state.scanning = true;
    setStatus('Scanning seller.html for live product-ad URLs…');
    try {
      const doc = await fetchSellerHtml();
      state.ads = extractAds(doc);
      state.broken = [];
      for (const ad of state.ads) {
        try {
          const result = await checkUrl(ad.url);
          ad.status = result.status;
          ad.finalUrl = result.finalUrl;
          ad.live = result.live;
          if (!result.live) state.broken.push(Object.assign({}, ad, { reason: result.error || ('HTTP ' + (result.status || 'unreachable')) }));
        } catch (error) {
          ad.live = false;
          ad.status = null;
          state.broken.push(Object.assign({}, ad, { reason: error.message }));
        }
      }
      state.checkedAt = new Date().toISOString();
      render();
      setStatus('Scan complete: ' + state.ads.length + ' ad URL(s), ' + state.broken.length + ' requiring resubmission.');
      window.dispatchEvent(new CustomEvent('bonds:resubmission-scan-complete', { detail: getState() }));
    } finally { state.scanning = false; }
    return state;
  }

  function render() {
    const host = document.querySelector('[data-resubmission-list]') || document.querySelector('#resubmissionList');
    if (!host) return;
    if (!state.broken.length) { host.innerHTML = '<div class="empty">No non-live product ads found.</div>'; return; }
    host.innerHTML = state.broken.map(ad => `<article class="resubmission-item"><strong>${esc(ad.product)}</strong><div>${esc(ad.location)}</div><div>${esc(ad.platform)}</div><div class="reason">${esc(ad.reason)}</div><div class="url">${esc(ad.url)}</div><button type="button" data-resubmit="${esc(ad.id)}">Add to resubmission queue</button></article>`).join('');
    host.querySelectorAll('[data-resubmit]').forEach(button => button.addEventListener('click', () => queueForResubmission(button.dataset.resubmit)));
  }

  function queueForResubmission(id) {
    const ad = state.broken.find(x => x.id === id);
    if (!ad) return;
    const key = 'bondsMallResubmissionQueue';
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    if (!queue.some(x => x.url === ad.url)) queue.push({ product: ad.product, location: ad.location, platform: ad.platform, sourceUrl: ad.url, queuedAt: new Date().toISOString(), status: 'ready-for-resubmission' });
    localStorage.setItem(key, JSON.stringify(queue));
    setStatus('Added ' + ad.product + ' / ' + ad.location + ' to the resubmission queue.');
    window.dispatchEvent(new CustomEvent('bonds:resubmission-queued', { detail: ad }));
  }

  function setStatus(message) {
    const el = document.querySelector('[data-resubmission-status]') || document.querySelector('#resubmissionStatus');
    if (el) el.textContent = message;
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  window.BondsMallResubmission = { scan, getState, queueForResubmission };
  window.addEventListener('DOMContentLoaded', scan);
})();
