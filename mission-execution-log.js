/*
 * Bonds Mall Mission Execution Log
 * ---------------------------------
 * Documents the complete operational path from mission statement -> product/location
 * planning -> platform preparation -> human checkpoints -> posting -> live URL verification
 * -> Market / Active Ads.
 *
 * This file is an observer and execution coordinator. It never fabricates a listing URL,
 * bypasses CAPTCHA/anti-bot controls, or marks an ad live without a verified URL/result.
 */
(function () {
  'use strict';

  const PLATFORM_NAMES = [
    'Craigslist', 'AdLandPro', 'ClassifiedAds', 'Facebook Marketplace',
    'OfferUp', 'Mercari', 'Poshmark', 'Nextdoor'
  ];

  const PROCESS = [
    ['Read mission', 'Read the mission statement and preserve the exact objective, financial target, geography, product requirements, advertising requirements, and completion condition.'],
    ['Extract requirements', 'Convert the mission into structured requirements: products, locations, platforms, quantity, content, media, destination URLs, timing, and verification rules.'],
    ['Build product/location matrix', 'Create one posting job for each required product/location/platform combination. Do not invent missing products or locations; unresolved requirements remain blocked.'],
    ['Prepare offer', 'Load product facts, price/offer, description, CTA, destination URL, images/video, and any required platform fields.'],
    ['Prepare platform jobs', 'Apply each platform\'s posting requirements and account/location context while preserving job-level isolation.'],
    ['Validate before posting', 'Confirm required product, location, content, media, destination, account/session and platform fields are available.'],
    ['Open posting session', 'Hand the job to the existing Seller Workspace/platform integration.'],
    ['Human checkpoint', 'Pause for login, CAPTCHA, consent, identity/verification prompts, or other human-required actions. No CAPTCHA solving or bypassing is performed.'],
    ['Submit ad', 'Invoke the authorized posting integration to submit the advertisement.'],
    ['Verify publication', 'Accept publication only when the platform/integration returns a successful result and a usable public URL.'],
    ['Normalize and record URL', 'Normalize the returned URL and record platform, product, location, job ID, status and timestamp.'],
    ['Publish to Active Ads', 'Synchronize only verified live advertisements into Market / Active Ads.'],
    ['Queue failures', 'Send failed, blocked, expired, closed, or non-live jobs to the appropriate retry/resubmission queue with the failure reason.'],
    ['Report mission state', 'Document completed, pending-human, failed, queued, and verified jobs so the mission can be resumed without losing state.']
  ];

  const state = {
    startedAt: null,
    mission: '',
    requirements: {},
    jobs: [],
    events: [],
    activeAds: [],
    status: 'idle'
  };

  function now() { return new Date().toISOString(); }

  function record(step, action, detail, job) {
    const event = { at: now(), step, action, detail: detail || null, job: job || null };
    state.events.push(event);
    try { localStorage.setItem('bondsMallMissionExecutionLog', JSON.stringify(state)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('bonds:mission-execution-event', { detail: event }));
    render();
  }

  function parseMission(text) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const platforms = PLATFORM_NAMES.filter(p => raw.toLowerCase().includes(p.toLowerCase()));
    const money = raw.match(/\$[\d,.]+(?:\s*(?:billion|million|thousand|[BMK]))?/gi) || [];
    const urls = raw.match(/https?:\/\/[^\s]+/gi) || [];
    return { raw, platforms: platforms.length ? platforms : PLATFORM_NAMES.slice(), monetaryTargets: money, urls };
  }

  function readLocations() {
    const candidates = [
      window.BondsMall && window.BondsMall.locations,
      window.BondsMallLocations,
      window.BondsMall && window.BondsMall.missionLocations
    ];
    for (const value of candidates) if (Array.isArray(value)) return value.slice();
    try {
      const stored = JSON.parse(localStorage.getItem('bondsMallLocations') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) { return []; }
  }

  function readProducts() {
    const candidates = [
      window.BondsMall && window.BondsMall.products,
      window.BondsMallProducts,
      window.BondsMall && window.BondsMall.missionProducts
    ];
    for (const value of candidates) if (Array.isArray(value)) return value.slice();
    try {
      const stored = JSON.parse(localStorage.getItem('bondsMallProducts') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) { return []; }
  }

  function buildJobs(requirements) {
    const products = requirements.products;
    const locations = requirements.locations;
    const platforms = requirements.platforms;
    const jobs = [];
    products.forEach((product, pi) => locations.forEach((location, li) => platforms.forEach((platform, fi) => {
      jobs.push({
        id: 'MX-' + Date.now().toString(36).toUpperCase() + '-' + String(pi + 1).padStart(3, '0') + '-' + String(li + 1).padStart(3, '0') + '-' + String(fi + 1).padStart(2, '0'),
        product: product,
        location: location,
        platform: platform,
        status: 'queued',
        liveUrl: '',
        lastError: ''
      });
    })));
    return jobs;
  }

  function start(missionText) {
    state.startedAt = now();
    state.mission = String(missionText || '').trim();
    state.requirements = parseMission(state.mission);
    state.requirements.products = readProducts();
    state.requirements.locations = readLocations();
    state.requirements.missingProducts = state.requirements.products.length === 0;
    state.requirements.missingLocations = state.requirements.locations.length === 0;
    state.jobs = state.requirements.missingProducts || state.requirements.missingLocations
      ? []
      : buildJobs(state.requirements);
    state.events = [];
    state.activeAds = [];
    state.status = 'running';

    record('Read mission', 'mission-read', 'Mission statement loaded into the execution journal.');
    record('Extract requirements', 'requirements-extracted', state.requirements);
    record('Build product/location matrix', 'matrix-built', {
      jobCount: state.jobs.length,
      missingProducts: state.requirements.missingProducts,
      missingLocations: state.requirements.missingLocations
    });

    if (state.requirements.missingProducts || state.requirements.missingLocations) {
      state.status = 'blocked-missing-input';
      record('Build product/location matrix', 'blocked', 'Products and/or required locations are not available from the connected Bonds Mall data sources. No ad is fabricated or submitted.');
    }
    return getState();
  }

  async function execute() {
    if (state.status !== 'running') return getState();
    const bridge = window.BondsMall && window.BondsMall.postMissionJob;
    if (typeof bridge !== 'function') {
      state.status = 'waiting-for-posting-integration';
      record('Open posting session', 'integration-missing', 'No window.BondsMall.postMissionJob integration is installed. Jobs remain documented and queued for Seller Workspace execution.');
      return getState();
    }

    for (const job of state.jobs) {
      job.status = 'preparing';
      record('Prepare platform jobs', 'job-prepared', 'Preparing product/location/platform job.', job);
      try {
        record('Open posting session', 'session-open', 'Handing job to the authorized posting integration.', job);
        const result = await bridge(job, state.requirements);
        if (result && result.humanActionRequired) {
          job.status = 'human-action-required';
          record('Human checkpoint', 'human-action-required', result.message || 'Human action is required before this platform can continue.', job);
          continue;
        }
        if (result && result.url) {
          job.status = 'published';
          job.liveUrl = String(result.url);
          job.publishedAt = now();
          record('Submit ad', 'submitted', 'Posting integration returned a listing URL.', job);
          record('Verify publication', 'verified', 'Listing URL returned by posting integration and accepted for verification.', job);
        } else {
          job.status = 'submitted-without-url';
          record('Verify publication', 'not-verified', 'Posting result did not include a live URL. Job is not added to Active Ads.', job);
        }
      } catch (error) {
        job.status = 'failed';
        job.lastError = error && error.message ? error.message : String(error);
        record('Submit ad', 'failed', job.lastError, job);
      }
    }

    state.activeAds = state.jobs.filter(j => /^https?:\/\//i.test(j.liveUrl));
    state.status = 'complete';
    record('Publish to Active Ads', 'active-ads-sync', { verifiedAds: state.activeAds.length });
    try { localStorage.setItem('bondsMallMissionExecutionLog', JSON.stringify(state)); } catch (_) {}
    return getState();
  }

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function render() {
    const root = document.querySelector('[data-mission-execution-log]');
    if (!root) return;
    const summary = root.querySelector('[data-execution-summary]');
    const table = root.querySelector('[data-execution-table]');
    if (summary) {
      const completed = state.jobs.filter(j => j.status === 'published').length;
      const blocked = state.jobs.filter(j => j.status === 'human-action-required' || j.status === 'failed').length;
      summary.textContent = `Status: ${state.status} • Jobs: ${state.jobs.length} • Published: ${completed} • Blocked/failed: ${blocked} • Events: ${state.events.length}`;
    }
    if (table) {
      table.innerHTML = state.jobs.map(j => `<tr><td>${escapeHtml(j.product && (j.product.name || j.product.title || j.product) || '')}</td><td>${escapeHtml(j.location && (j.location.name || j.location.city || j.location) || '')}</td><td>${escapeHtml(j.platform)}</td><td>${escapeHtml(j.status)}</td><td>${j.liveUrl ? `<a href="${escapeHtml(j.liveUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(j.liveUrl)}</a>` : '—'}</td></tr>`).join('');
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.BondsMallMissionExecution = { start, execute, getState, process: PROCESS.slice() };
  window.addEventListener('bonds:active-ads-updated', function (event) {
    state.activeAds = Array.isArray(event.detail) ? event.detail.slice() : [];
    record('Publish to Active Ads', 'active-ads-updated', { count: state.activeAds.length });
  });
})();
