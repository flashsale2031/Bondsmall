/*
 * Facebook Marketplace client-only browser adapter.
 *
 * This adapter prepares a listing in a user-authenticated Marketplace page.
 * It does not collect or persist passwords, solve CAPTCHA, bypass platform
 * safeguards, or submit a listing unless the caller explicitly passes
 * confirmPublish: true.
 */
(function (global) {
  'use strict';

  const BASE_URL = 'https://www.facebook.com';
  const MARKETPLACE_URL = `${BASE_URL}/marketplace/`;
  const SELLING_ITEM_URL = `${BASE_URL}/marketplace/selling/item/`;
  const SELLING_URL = `${BASE_URL}/marketplace/selling/`;

  const registeredJobs = new Map();

  const SELECTORS = Object.freeze({
    form: ['form[action*="marketplace" i]', 'form', '[role="dialog"]'],
    title: ['input[name="title"]', 'input[aria-label*="Title" i]', 'input[placeholder*="title" i]', 'textarea[aria-label*="Title" i]'],
    price: ['input[name="price"]', 'input[aria-label*="Price" i]', 'input[placeholder*="price" i]'],
    description: ['textarea[name="description"]', 'textarea[aria-label*="Description" i]', 'textarea[placeholder*="description" i]'],
    category: ['select[name="category"]', '[role="combobox"][aria-label*="category" i]', 'input[aria-label*="category" i]'],
    location: ['input[name="location"]', 'input[aria-label*="Location" i]', 'input[placeholder*="location" i]'],
    photos: ['input[type="file"][accept*="image" i]', 'input[type="file"]'],
    next: ['button[aria-label*="Next" i]', 'button[type="button"]'],
    publish: ['button[aria-label*="Publish" i]', 'button[name="publish"]', 'button[type="submit"]', '[role="button"][aria-label*="Publish" i]']
  });

  function firstMatch(root, candidates) {
    for (const selector of candidates || []) {
      try {
        const element = root?.querySelector(selector);
        if (element) return { element, selector };
      } catch (_) {}
    }
    return { element: null, selector: '' };
  }

  function normalizeListing(product) {
    const source = product || {};
    const images = Array.isArray(source.images) && source.images.length
      ? source.images
      : (Array.isArray(source.photo_paths) ? source.photo_paths : (source.image ? [source.image] : []));
    const price = source.salePrice ?? source['sale price'] ?? source.retailPrice ?? source['retail price'] ?? source.price ?? '';
    return {
      id: source.id,
      sku: source.sku,
      title: String(source.name || source.title || '').trim(),
      description: String(source.description || '').trim(),
      category: String(source.category || '').trim(),
      price: String(price),
      images,
      source_url: source.source_url || source.sourceUrl || ''
    };
  }

  function discoverControls(root = global.document) {
    return Object.fromEntries(Object.entries(SELECTORS).map(([name, candidates]) => {
      const match = firstMatch(root, candidates);
      return [name, { found: Boolean(match.element), selector: match.selector }];
    }));
  }

  function routeForListing(listingId = '') {
    const id = String(listingId || '').trim();
    return id ? `${SELLING_ITEM_URL}?listing_id=${encodeURIComponent(id)}` : SELLING_URL;
  }

  function validateUrl(rawUrl = global.location?.href || MARKETPLACE_URL, stage = 'marketplace') {
    try {
      const parsed = new URL(rawUrl, BASE_URL);
      const hostValid = /^(?:www\.)?facebook\.com$/i.test(parsed.hostname);
      if (!hostValid || parsed.protocol !== 'https:') return { valid: false, url: parsed.href, stage, reason: 'Expected an HTTPS Facebook URL.' };
      const path = parsed.pathname.replace(/\/+$/, '') || '/';
      const valid = stage === 'marketplace'
        ? path === '/marketplace' || path === '/marketplace/selling' || path === '/marketplace/selling/item'
        : stage === 'item'
          ? path === '/marketplace/selling/item'
          : stage === 'selling'
            ? path === '/marketplace/selling'
            : path.startsWith('/marketplace');
      return { valid, url: parsed.href, stage, reason: valid ? '' : `Unexpected Facebook Marketplace route for ${stage}.` };
    } catch (_) {
      return { valid: false, url: String(rawUrl || ''), stage, reason: 'Invalid URL.' };
    }
  }

  function dispatchFieldEvents(element) {
    ['input', 'change', 'blur'].forEach(type => element.dispatchEvent(new Event(type, { bubbles: true })));
  }

  function setField(root, field, value, { required = true } = {}) {
    const match = firstMatch(root, SELECTORS[field]);
    if (!match.element || !('value' in match.element)) {
      if (required) throw new Error(`Facebook Marketplace field not found: ${field}`);
      return { field, selector: '', set: false };
    }
    match.element.value = String(value ?? '');
    dispatchFieldEvents(match.element);
    return { field, selector: match.selector, set: true };
  }

  function fillDraft(root, product, { location } = {}) {
    const listing = normalizeListing(product);
    const filled = [];
    filled.push(setField(root, 'title', listing.title));
    filled.push(setField(root, 'price', listing.price));
    filled.push(setField(root, 'description', listing.description));
    if (listing.category) filled.push(setField(root, 'category', listing.category, { required: false }));
    if (location) filled.push(setField(root, 'location', location.city || location.label || '', { required: false }));
    return { listing, filled };
  }

  async function prepareImageUpload(root, productOrImages) {
    const images = Array.isArray(productOrImages) ? productOrImages : normalizeListing(productOrImages).images;
    const match = firstMatch(root, SELECTORS.photos);
    if (!match.element) return { prepared: false, selector: '', files: [], reason: 'No Marketplace image input found.' };
    if (!images.length) return { prepared: false, selector: match.selector, files: [], reason: 'No product images provided.' };
    if (typeof File === 'undefined' || typeof DataTransfer === 'undefined') return { prepared: false, selector: match.selector, files: [], reason: 'Browser File/DataTransfer APIs unavailable.' };
    const transfer = new DataTransfer();
    const files = [];
    for (let index = 0; index < images.length; index += 1) {
      const source = images[index];
      if (source instanceof File) { transfer.items.add(source); files.push({ name: source.name, size: source.size, type: source.type }); continue; }
      if (source instanceof Blob) { const file = new File([source], `marketplace-image-${index + 1}`, { type: source.type || 'image/jpeg' }); transfer.items.add(file); files.push({ name: file.name, size: file.size, type: file.type }); continue; }
      if (typeof source !== 'string') continue;
      const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`Image fetch failed (${response.status}) for image ${index + 1}.`);
      const blob = await response.blob();
      const extension = (blob.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
      const file = new File([blob], `marketplace-image-${index + 1}.${extension}`, { type: blob.type || 'image/jpeg' });
      transfer.items.add(file); files.push({ name: file.name, size: file.size, type: file.type });
    }
    match.element.files = transfer.files;
    match.element.dispatchEvent(new Event('input', { bubbles: true }));
    match.element.dispatchEvent(new Event('change', { bubbles: true }));
    return { prepared: files.length > 0, selector: match.selector, files };
  }

  function buildDraft(product, location = {}) {
    const listing = normalizeListing(product);
    return {
      platform: 'facebook_marketplace',
      destination: MARKETPLACE_URL,
      item_url: routeForListing(listing.id),
      selling_url: SELLING_URL,
      listing,
      location,
      controls: SELECTORS,
      requires_user_confirmation: true,
      publish_automation: 'client-only-with-explicit-confirmation'
    };
  }

  async function navigateTo(adapter, url, stage) {
    const checked = validateUrl(url, stage);
    if (!checked.valid) throw new Error(checked.reason);
    if (!adapter || typeof adapter.navigate !== 'function') return { status: 'handoff-required', url: checked.url, stage };
    await adapter.navigate(checked.url);
    return { status: 'navigated', url: checked.url, stage };
  }

  async function prepareFlow({ product, location = {}, root = global.document, adapter } = {}) {
    const draft = buildDraft(product, location);
    const steps = [];
    steps.push(await navigateTo(adapter, MARKETPLACE_URL, 'marketplace'));
    steps.push(await navigateTo(adapter, routeForListing(draft.listing.id), 'item'));
    const filled = fillDraft(root, product, { location });
    const images = await prepareImageUpload(root, product);
    return { status: 'prepared', draft, steps, filled, images, publishReady: false, requiresExplicitConfirmation: true };
  }

  function submitForm(root = global.document, { confirmPublish = false } = {}) {
    if (!confirmPublish) return { submitted: false, requiresExplicitConfirmation: true, reason: 'Final Marketplace submission requires explicit user confirmation.' };
    const match = firstMatch(root, SELECTORS.publish);
    if (!match.element) return { submitted: false, selector: '', reason: 'Facebook Marketplace publish control not found.' };
    match.element.click();
    return { submitted: true, selector: match.selector, requiresExplicitConfirmation: true };
  }

  function escapeHtml(value) {
    const esc = global.escHtml;
    if (typeof esc === 'function') return esc(value);
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  }

  function marketplaceRouteForJob(job, stage) {
    const listingId = job?.handoff?.products?.[0]?.id || job?.marketplaceFlow?.listing?.id || '';
    if (stage === 'item') return routeForListing(listingId);
    if (stage === 'selling') return SELLING_URL;
    return MARKETPLACE_URL;
  }

  function openMarketplaceRoute(jobIndex, stage = 'marketplace') {
    const job = registeredJobs.get(jobIndex) || null;
    const url = marketplaceRouteForJob(job, stage);
    const checked = validateUrl(url, stage === 'item' ? 'item' : stage === 'selling' ? 'selling' : 'marketplace');
    if (!checked.valid) { global.showToast?.(checked.reason, 'error'); return { opened: false, reason: checked.reason }; }
    global.requirePlatformDestination?.('facebook_marketplace', 'Marketplace route');
    global.openJobSessionWindow?.(jobIndex);
    global.openMiniBrowser?.(checked.url);
    return { opened: true, url: checked.url, stage };
  }

  function renderMarketplaceFlowPanel(job) {
    const view = global.document?.getElementById(`session-view-job-${job?.index}`) || global.document?.getElementById('session-view-facebook_marketplace');
    if (!view || !job?.handoff) return;
    const product = job.handoff.products?.[0] || {};
    const location = job.handoff.location || {};
    const draft = job.marketplaceFlow || buildDraft(product, location);
    view.innerHTML = `<div class="session-listing-workflow marketplace-session-workflow">
      <div class="session-workflow-title">Facebook Marketplace listing · ${escapeHtml(job.accountLabel || '')}</div>
      <div class="session-workflow-note">Use the connected Facebook session. Open each route in order, prepare the listing fields, and submit only after reviewing the listing yourself. CAPTCHA, login, and final publication remain user-controlled.</div>
      <div class="marketplace-route-actions"><button type="button" class="session-open-page" onclick="MarketplaceAdapter.openMarketplaceRoute(${job.index}, 'marketplace')">1. Open Marketplace</button><button type="button" class="session-open-page" onclick="MarketplaceAdapter.openMarketplaceRoute(${job.index}, 'item')">2. Open listing form</button><button type="button" class="session-open-page" onclick="MarketplaceAdapter.openMarketplaceRoute(${job.index}, 'selling')">3. Verify selling page</button></div>
      <article class="session-listing-card"><div class="session-listing-card-head"><strong>${escapeHtml(product.name || 'Untitled product')}</strong><button type="button" class="session-copy-btn" onclick="copyClientListing(${job.index}, 0)">Copy listing</button></div><div class="session-listing-meta">Sale $${Number(product.sale_price ?? 0).toFixed(2)} · ${escapeHtml(product.category || '')} · ${escapeHtml([location.city, location.state, location.zip].filter(Boolean).join(', '))}</div><textarea id="session-listing-${job.index}-0" readonly>${escapeHtml(JSON.stringify({ title: draft.listing.title, description: draft.listing.description, price: draft.listing.price, category: draft.listing.category, images: draft.listing.images || [], source_url: draft.listing.source_url || '' }, null, 2))}</textarea></article>
      <div class="session-workflow-actions"><button type="button" class="session-captcha-btn" onclick="setCaptchaRequired(${job.index}, true)">⚠ CAPTCHA needed</button><button type="button" class="session-posted-btn" onclick="markClientJobPosted(${job.index})">✓ Confirm listing posted</button><button type="button" class="session-skip-btn" onclick="markClientJobSkipped(${job.index})">Skip / failed</button></div>
    </div>`;
  }

  function registerJob(job) {
    if (job && Number.isInteger(job.index)) registeredJobs.set(job.index, job);
    return job;
  }

  const adapter = Object.freeze({
    BASE_URL, MARKETPLACE_URL, SELLING_ITEM_URL, SELLING_URL, SELECTORS,
    routeForListing, validateUrl, discoverControls, normalizeListing, buildDraft,
    fillDraft, prepareImageUpload, prepareFlow, submitForm, openMarketplaceRoute, renderMarketplaceFlowPanel, registerJob
  });
  global.MarketplaceAdapter = adapter;
})(typeof window !== 'undefined' ? window : globalThis);

/* Bonds Mall Seller mission enhancement bootstrap.
 * marketplace.js is already loaded by seller.html, so use this existing
 * script entry point to load the mission/progress enhancement directly.
 * This avoids depending on a separate localization-loader cache path.
 */
(function () {
  'use strict';
  const path = String(window.location.pathname || '').toLowerCase();
  const isSeller = path === '/seller' || path.endsWith('/seller.html') || path.endsWith('/seller');
  if (!isSeller || document.getElementById('seller-state-platform-traffic-loader')) return;

  const script = document.createElement('script');
  script.id = 'seller-state-platform-traffic-loader';
  script.src = '/seller-state-platform-traffic.js?v=20260906-3';
  script.async = false;
  script.onload = function () {
    window.dispatchEvent(new CustomEvent('bondsmall-seller-traffic-loaded'));
    const progress = document.createElement('script');
    progress.id = 'seller-mission-progress-dollar-loader';
    progress.src = '/seller-mission-progress.js?v=20260906-1';
    progress.async = false;
    document.head.appendChild(progress);
  };
  script.onerror = function () {
    const retry = document.createElement('script');
    retry.id = 'seller-state-platform-traffic-loader-retry';
    retry.src = '/seller-state-platform-traffic.js?v=20260906-4';
    retry.async = false;
    retry.onload = function () {
      const progress = document.createElement('script');
      progress.id = 'seller-mission-progress-dollar-loader-retry';
      progress.src = '/seller-mission-progress.js?v=20260906-2';
      progress.async = false;
      document.head.appendChild(progress);
    };
    document.head.appendChild(retry);
  };
  (document.head || document.documentElement).appendChild(script);
})();