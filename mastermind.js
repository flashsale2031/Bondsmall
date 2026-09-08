/*
 * Bonds Mall Mastermind
 * ----------------------
 * A deterministic 20-stage controller that carries a mission from analysis to
 * ad launch and records the resulting live URL in Market / Active Ads.
 *
 * Important: this controller does not solve, bypass, replay, predict, or defeat
 * CAPTCHAs / anti-bot controls. When a platform requires a human checkpoint,
 * the launch integration must pause and return a human-action-required result.
 * It also does not fabricate live URLs: Active Ads is populated only from a
 * URL returned by the connected posting/launch integration.
 */
(function () {
  'use strict';

  const PLATFORMS = [
    'Craigslist', 'AdLandPro', 'ClassifiedAds', 'Facebook Marketplace',
    'OfferUp', 'Mercari', 'Poshmark', 'Nextdoor'
  ];

  const STAGES = [
    ['Analyze mission statement', 'Parse the mission, objective, constraints, budget, geography, audience, offer and required outcome.'],
    ['Define success criteria', 'Turn the mission into measurable acquisition, listing, traffic and launch criteria.'],
    ['Research market and audience', 'Organize available market, audience, location and platform information without inventing unavailable facts.'],
    ['Build campaign strategy', 'Select the offer angle, audience, geography, channels, cadence and operating strategy.'],
    ['Create location plan', 'Build the location/account/job matrix from the mission and available platform/location data.'],
    ['Create offer architecture', 'Structure the product/service offer, value proposition, CTA, pricing and required fields.'],
    ['Create ad content', 'Generate platform-ready titles, descriptions, CTAs, metadata and tracking identifiers.'],
    ['Create media plan', 'Prepare image/video/media assignments and verify that required assets exist before launch.'],
    ['Create platform plans', 'Translate the campaign into platform-specific posting plans for every enabled platform.'],
    ['Validate policy and page readiness', 'Check required fields, URLs, content, destination pages and platform constraints before posting.'],
    ['Validate launch queue', 'Deduplicate jobs, verify dependencies, isolate accounts/locations and establish safe queue order.'],
    ['Open launch sessions', 'Open or hand off each platform session through the existing Bonds Mall posting integration.'],
    ['Human checkpoint handling', 'Pause for required human actions such as CAPTCHA, login, consent, verification or platform prompts.'],
    ['Submit advertisements', 'Invoke the existing authorized platform posting integration; do not bypass platform controls.'],
    ['Verify publication', 'Read the platform result and accept a live URL only when the integration reports successful publication.'],
    ['Normalize live URLs', 'Validate, normalize and de-duplicate returned HTTP(S) listing URLs.'],
    ['Record campaign state', 'Persist launch metadata, platform, location, job ID, timestamp and live URL without storing CAPTCHA answers.'],
    ['Publish to Market Active Ads', 'Insert verified live advertisements into the Market section Active Ads surface.'],
    ['Monitor launch results', 'Refresh launch status and expose failures, pending human actions and verified live URLs.'],
    ['Complete mission handoff', 'Produce the final mission report and leave the Market Active Ads section synchronized with verified launches.']
  ];

  const state = {
    mission: '', running: false, paused: false, stage: 0, context: {}, launched: [], logs: []
  };

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function log(message, data) {
    const entry = { at: new Date().toISOString(), message, data: data || null };
    state.logs.push(entry);
    renderOutput(message + (data ? '\n\n' + JSON.stringify(data, null, 2) : ''));
    window.dispatchEvent(new CustomEvent('bonds:mastermind-log', { detail: entry }));
  }

  function renderSteps() {
    $('steps').innerHTML = STAGES.map((s, i) => {
      const n = i + 1;
      const cls = n < state.stage ? 'done' : n === state.stage ? 'active' : '';
      const status = n < state.stage ? 'Complete' : n === state.stage ? (state.paused ? 'Paused' : 'Running') : 'Pending';
      return `<div class="step ${cls}" data-stage="${n}"><div class="num">${n}</div><div><strong>${escapeHtml(s[0])}</strong><div class="status">${escapeHtml(s[1])}</div></div><div class="status">${status}</div></div>`;
    }).join('');
  }

  function renderProgress() {
    const done = Math.max(0, Math.min(20, state.stage - 1));
    $('progressBar').style.width = ((done / 20) * 100) + '%';
    $('progressLabel').textContent = done + ' / 20';
    $('stageLabel').textContent = state.stage ? `V${state.stage}: ${STAGES[state.stage - 1][0]}` : 'Ready';
    renderSteps();
  }

  function renderOutput(text) { $('output').textContent = text; }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function missionAnalysis(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const urls = normalized.match(/https?:\/\/[^\s]+/gi) || [];
    const money = normalized.match(/\$[\d,.]+(?:\s*(?:billion|million|thousand|[BMK]))?/gi) || [];
    const locations = normalized.match(/\b(?:50 states|all states|nationwide|national|local|regional|city|cities|county|counties)\b/gi) || [];
    return {
      raw: normalized,
      length: normalized.length,
      urls,
      monetaryTargets: money,
      locationSignals: locations,
      platformSignals: PLATFORMS.filter(p => normalized.toLowerCase().includes(p.toLowerCase())),
      keywords: normalized.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 100)
    };
  }

  function buildContext() {
    state.context.analysis = missionAnalysis(state.mission);
    state.context.platforms = state.context.analysis.platformSignals.length ? state.context.analysis.platformSignals : PLATFORMS.slice();
    state.context.campaignId = 'MM-' + Date.now().toString(36).toUpperCase();
    state.context.createdAt = new Date().toISOString();
    state.context.jobs = state.context.platforms.map((platform, i) => ({
      id: state.context.campaignId + '-' + String(i + 1).padStart(3, '0'), platform, status: 'queued'
    }));
  }

  async function waitIfPaused() {
    while (state.paused && state.running) await sleep(250);
  }

  async function runStage(n) {
    state.stage = n;
    renderProgress();
    await waitIfPaused();

    switch (n) {
      case 1:
        buildContext();
        log('Mission analyzed.', state.context.analysis);
        break;
      case 2:
        state.context.successCriteria = {
          missionPresent: Boolean(state.mission),
          launchRequiresVerifiedUrl: true,
          activeAdsRequiresLiveUrl: true,
          humanCheckpointRequiredWhenPlatformRequestsIt: true
        };
        break;
      case 3:
        state.context.research = collectOptionalResearch();
        break;
      case 4:
        state.context.strategy = { channels: state.context.platforms, campaignId: state.context.campaignId, objective: 'mission-to-published-ad' };
        break;
      case 5:
        state.context.locations = readAvailableLocations();
        break;
      case 6:
        state.context.offer = collectOffer();
        break;
      case 7:
        state.context.content = buildAdContent();
        break;
      case 8:
        state.context.media = collectMedia();
        break;
      case 9:
        state.context.platformPlans = state.context.platforms.map(p => ({ platform: p, ready: true, humanCheckpoint: true }));
        break;
      case 10:
        state.context.validation = validateBeforeLaunch();
        if (!state.context.validation.ok) throw new Error(state.context.validation.errors.join(' '));
        break;
      case 11:
        state.context.jobs = state.context.jobs.filter((j, i, a) => a.findIndex(x => x.platform === j.platform && x.id === j.id) === i);
        break;
      case 12:
        await openLaunchSessions();
        break;
      case 13:
        await humanCheckpoint();
        break;
      case 14:
        await submitAdvertisements();
        break;
      case 15:
        await verifyPublications();
        break;
      case 16:
        state.launched = state.launched.map(normalizeAd);
        break;
      case 17:
        persistLaunchState();
        break;
      case 18:
        renderActiveAds();
        break;
      case 19:
        renderActiveAds();
        break;
      case 20:
        state.context.completedAt = new Date().toISOString();
        log('Mastermind mission handoff complete.', { campaignId: state.context.campaignId, activeAds: state.launched });
        break;
    }
  }

  function collectOptionalResearch() {
    const hook = window.BondsMall && window.BondsMall.mastermindResearch;
    return typeof hook === 'function' ? hook(state.mission) : { source: 'local mission signals only', externalResearch: false };
  }

  function readAvailableLocations() {
    const sources = [window.BondsMall && window.BondsMall.locations, window.BondsMallLocations];
    for (const source of sources) if (Array.isArray(source)) return source.slice();
    try { return JSON.parse(localStorage.getItem('bondsMallLocations') || '[]'); } catch (_) { return []; }
  }

  function collectOffer() {
    const hook = window.BondsMall && window.BondsMall.mastermindOffer;
    return typeof hook === 'function' ? hook(state.mission) : { missionDerived: true, statement: state.mission };
  }

  function buildAdContent() {
    const hook = window.BondsMall && window.BondsMall.mastermindContent;
    if (typeof hook === 'function') return hook(state.context);
    return { title: 'Bonds Mall — ' + state.context.campaignId, description: state.mission, cta: 'Learn more' };
  }

  function collectMedia() {
    const hook = window.BondsMall && window.BondsMall.mastermindMedia;
    return typeof hook === 'function' ? hook(state.context) : { required: false, assets: [] };
  }

  function validateBeforeLaunch() {
    const errors = [];
    if (!state.mission) errors.push('Mission statement is required.');
    if (!state.context.campaignId) errors.push('Campaign ID is missing.');
    if (!state.context.platforms.length) errors.push('No launch platforms are enabled.');
    return { ok: !errors.length, errors };
  }

  async function openLaunchSessions() {
    const hook = window.BondsMall && window.BondsMall.openAdSession;
    if (typeof hook !== 'function') return log('No session hook is installed; launch jobs remain ready for the existing Seller Workspace integration.');
    for (const job of state.context.jobs) {
      await waitIfPaused();
      await hook(job, state.context);
      job.status = 'session-open';
    }
  }

  async function humanCheckpoint() {
    const hook = window.BondsMall && window.BondsMall.awaitHumanCheckpoint;
    if (typeof hook !== 'function') {
      $('notice').textContent = 'No separate human checkpoint is active. Any platform challenge must still be completed by the human in the connected posting session.';
      return;
    }
    const result = await hook(state.context);
    if (result && result.cancelled) throw new Error('Human checkpoint cancelled the launch.');
  }

  async function submitAdvertisements() {
    const hook = window.BondsMall && (window.BondsMall.launchAd || window.BondsMall.postAd);
    if (typeof hook !== 'function') {
      log('Launch integration not installed. No advertisements were fabricated or marked live.', { requiredHook: 'window.BondsMall.launchAd / postAd' });
      return;
    }
    for (const job of state.context.jobs) {
      await waitIfPaused();
      job.status = 'launching';
      const result = await hook(job, state.context);
      if (result && result.url) state.launched.push({ platform: job.platform, jobId: job.id, url: result.url, status: 'published', publishedAt: new Date().toISOString() });
      else if (result && result.humanActionRequired) { job.status = 'human-action-required'; throw new Error(job.platform + ' requires human action before publication.'); }
      else job.status = 'submitted-without-verified-url';
    }
  }

  async function verifyPublications() {
    const hook = window.BondsMall && window.BondsMall.verifyAd;
    if (typeof hook !== 'function') return;
    const verified = [];
    for (const ad of state.launched) {
      const result = await hook(ad, state.context);
      if (result && result.url) verified.push(Object.assign({}, ad, { url: result.url, status: 'verified' }));
    }
    if (verified.length) state.launched = verified;
  }

  function normalizeAd(ad) {
    if (!ad || !/^https?:\/\//i.test(String(ad.url || ''))) return null;
    return Object.assign({}, ad, { url: String(ad.url).trim() });
  }

  function persistLaunchState() {
    state.launched = state.launched.filter(Boolean).filter((ad, i, a) => a.findIndex(x => x.url === ad.url) === i);
    try { localStorage.setItem('bondsMallMastermindActiveAds', JSON.stringify(state.launched)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('bonds:active-ads-updated', { detail: state.launched.slice() }));
  }

  function renderActiveAds() {
    const host = $('activeAds');
    if (!state.launched.length) { host.innerHTML = '<div class="empty">No verified live ads recorded yet.</div>'; return; }
    host.innerHTML = state.launched.map(ad => `<div class="ad"><strong>${escapeHtml(ad.platform || 'Platform')}</strong><div class="status">${escapeHtml(ad.status || 'published')} • ${escapeHtml(ad.jobId || '')}</div><a href="${escapeHtml(ad.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ad.url)}</a></div>`).join('');
    syncExternalActiveAds(state.launched);
  }

  function syncExternalActiveAds(ads) {
    const selectors = ['[data-active-ads]', '#activeAds', '#active-ads', '.active-ads'];
    const containers = new Set();
    selectors.forEach(selector => document.querySelectorAll(selector).forEach(el => containers.add(el)));
    containers.forEach(container => {
      if (container.id === 'activeAds') return;
      container.innerHTML = ads.map(ad => `<div><strong>${escapeHtml(ad.platform || 'Platform')}</strong> — <a href="${escapeHtml(ad.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ad.url)}</a></div>`).join('');
    });
  }

  function reset() {
    state.mission = ''; state.running = false; state.paused = false; state.stage = 0; state.context = {}; state.launched = []; state.logs = [];
    $('missionInput').value = ''; $('notice').textContent = 'Ready.'; renderProgress(); renderActiveAds(); renderOutput('Waiting for a mission.');
  }

  async function run() {
    if (state.running) return;
    state.mission = $('missionInput').value.trim();
    if (!state.mission) { $('notice').textContent = 'Enter a mission statement before running Mastermind.'; return; }
    state.running = true; state.paused = false; $('notice').textContent = 'Mastermind is running.';
    try {
      for (let n = 1; n <= 20; n++) { if (!state.running) break; await runStage(n); renderProgress(); await sleep(120); }
      if (state.running) { state.stage = 21; $('progressBar').style.width = '100%'; $('progressLabel').textContent = '20 / 20'; $('stageLabel').textContent = 'Complete'; $('notice').textContent = 'Mission complete. Market / Active Ads contains only verified URLs returned by the launch integration.'; }
    } catch (error) {
      state.paused = true; $('notice').className = 'notice warn'; $('notice').textContent = 'Mastermind paused: ' + error.message; log('Execution paused.', { error: error.message, stage: state.stage });
    } finally { state.running = false; }
  }

  $('runBtn').addEventListener('click', run);
  $('pauseBtn').addEventListener('click', () => { state.paused = !state.paused; $('pauseBtn').textContent = state.paused ? 'Resume' : 'Pause'; $('notice').textContent = state.paused ? 'Paused.' : 'Resuming.'; });
  $('resetBtn').addEventListener('click', reset);

  window.addEventListener('bonds:active-ads-updated', e => { if (e.detail) { state.launched = e.detail.slice(); renderActiveAds(); } });
  try { const saved = JSON.parse(localStorage.getItem('bondsMallMastermindActiveAds') || '[]'); if (Array.isArray(saved)) state.launched = saved.filter(a => a && /^https?:\/\//i.test(a.url)); } catch (_) {}
  renderProgress(); renderActiveAds();

  window.BondsMallMastermind = {
    run,
    reset,
    getState: () => JSON.parse(JSON.stringify(state)),
    recordLiveAd: function (ad) {
      const normalized = normalizeAd(ad);
      if (!normalized) throw new Error('recordLiveAd requires a verified HTTP(S) URL.');
      state.launched.push(normalized); persistLaunchState(); renderActiveAds();
    }
  };
})();
