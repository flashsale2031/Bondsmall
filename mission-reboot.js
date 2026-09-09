/*
 * Bonds Mall Mission Reboot Controller
 * -------------------------------------
 * Re-checks the Mastermind mission at every :00 and :30 boundary.
 * If a mission is failed or inactive, it restarts the existing mission flow.
 * A completed mission is NOT rebooted.
 *
 * Browser mode is the authoritative reboot path because Mastermind runs in the
 * user's browser. Node mode can optionally notify a configured reboot endpoint
 * from GitHub Actions when an external mission-status service reports failure
 * or inactivity.
 *
 * This controller never solves or bypasses CAPTCHA / anti-bot checkpoints.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BondsMallMissionReboot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOUNDARY_MINUTES = [0, 30];
  const MIN_REBOOT_GAP_MS = 20 * 60 * 1000;
  const STORAGE_KEY = 'bondsMallMissionReboot';
  const MAX_INACTIVE_MS = 30 * 60 * 1000;

  function iso(date) { return (date || new Date()).toISOString(); }
  function minuteBoundary(date) {
    const d = date || new Date();
    return BOUNDARY_MINUTES.includes(d.getMinutes());
  }

  function readBrowserState() {
    if (typeof window === 'undefined') return null;
    const controller = window.BondsMallMastermind;
    if (!controller || typeof controller.getState !== 'function') return null;
    try { return controller.getState(); } catch (_) { return null; }
  }

  function classify(state, now) {
    if (!state) return { inactive: true, failed: false, reason: 'mastermind-unavailable' };
    if (state.stage === 21) return { inactive: false, failed: false, completed: true, reason: 'mission-complete' };
    if (state.paused) return { inactive: false, failed: true, reason: 'mission-paused-or-failed' };
    if (state.stage === 0) return { inactive: true, failed: false, reason: 'mission-not-started' };
    if (!state.running && state.stage >= 1 && state.stage <= 20) {
      return { inactive: true, failed: false, reason: 'mission-inactive-between-stages' };
    }
    if (!state.running && state.context && state.context.createdAt) {
      const age = now.getTime() - new Date(state.context.createdAt).getTime();
      if (Number.isFinite(age) && age >= MAX_INACTIVE_MS) {
        return { inactive: true, failed: false, reason: 'mission-inactive-timeout' };
      }
    }
    return { inactive: false, failed: false, reason: 'mission-active' };
  }

  function lastReboot() {
    if (typeof localStorage === 'undefined') return 0;
    try { return Number(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').at || 0); } catch (_) { return 0; }
  }

  function rememberReboot(reason, at) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ at:at.getTime(), reason, iso:iso(at) })); } catch (_) {}
  }

  async function rebootBrowser(reason) {
    if (typeof window === 'undefined') return { rebooted:false, reason:'not-browser' };
    const mastermind = window.BondsMallMastermind;
    if (!mastermind || typeof mastermind.run !== 'function' || typeof mastermind.reset !== 'function') {
      return { rebooted:false, reason:'mastermind-controller-unavailable' };
    }

    const state = readBrowserState();
    const mission = state && state.mission ? state.mission : ((document.getElementById('missionInput') || {}).value || '').trim();
    if (!mission) return { rebooted:false, reason:'mission-statement-unavailable' };

    const now = new Date();
    const previous = lastReboot();
    if (previous && now.getTime() - previous < MIN_REBOOT_GAP_MS) {
      return { rebooted:false, reason:'reboot-cooldown' };
    }

    mastermind.reset();
    const input = document.getElementById('missionInput');
    if (input) input.value = mission;
    rememberReboot(reason, now);
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('bonds:mission-reboot-started', { detail:{ at:iso(now), reason } }));
    }
    await new Promise(resolve => setTimeout(resolve, 250));
    await mastermind.run();
    const result = { rebooted:true, at:iso(now), reason };
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('bonds:mission-reboot-complete', { detail:result }));
    }
    return result;
  }

  async function checkAndReboot(at) {
    const d = at || new Date();
    if (!minuteBoundary(d)) return { action:'none', reason:'not-boundary' };
    const classification = classify(readBrowserState(), d);
    if (classification.completed || (!classification.failed && !classification.inactive)) return { action:'none', reason:classification.reason };
    return Object.assign({ action:'reboot' }, await rebootBrowser(classification.reason));
  }

  function start() {
    if (typeof setInterval !== 'function') return false;
    if (start.timer) return true;
    let lastBoundary = '';
    start.timer = setInterval(() => {
      const d = new Date();
      if (!minuteBoundary(d)) return;
      const key = d.toISOString().slice(0,16);
      if (key === lastBoundary) return;
      lastBoundary = key;
      checkAndReboot(d);
    }, 15000);
    return true;
  }

  function stop() {
    if (start.timer) clearInterval(start.timer);
    start.timer = null;
  }

  async function nodeScheduledCheck() {
    const statusUrl = process.env.BONDS_MALL_MISSION_STATUS_URL;
    const rebootUrl = process.env.BONDS_MALL_MISSION_REBOOT_WEBHOOK;
    if (!statusUrl) {
      console.log(JSON.stringify({ action:'none', reason:'BONDS_MALL_MISSION_STATUS_URL not configured; browser controller remains authoritative.' }));
      return;
    }
    const response = await fetch(statusUrl, { headers:{ accept:'application/json' } });
    if (!response.ok) throw new Error('Mission status endpoint returned HTTP ' + response.status);
    const status = await response.json();
    const failed = status.failed === true || status.status === 'failed';
    const inactive = status.inactive === true || status.status === 'inactive';
    if (!failed && !inactive) {
      console.log(JSON.stringify({ action:'none', reason:'mission-active', status }));
      return;
    }
    if (!rebootUrl) {
      console.log(JSON.stringify({ action:'reboot-required', reason:failed ? 'mission-failed' : 'mission-inactive', status, note:'No reboot webhook configured.' }));
      return;
    }
    const rebootResponse = await fetch(rebootUrl, {
      method:'POST', headers:{ 'content-type':'application/json', accept:'application/json' },
      body:JSON.stringify({ reason:failed ? 'mission-failed' : 'mission-inactive', requestedAt:iso(), status })
    });
    if (!rebootResponse.ok) throw new Error('Mission reboot webhook returned HTTP ' + rebootResponse.status);
    console.log(JSON.stringify({ action:'reboot-requested', reason:failed ? 'mission-failed' : 'mission-inactive', status }));
  }

  const api = { BOUNDARY_MINUTES, classify, checkAndReboot, rebootBrowser, start, stop };
  if (typeof process !== 'undefined' && process.argv && require.main === module) {
    nodeScheduledCheck().catch(error => { console.error(error); process.exitCode = 1; });
  }
  return api;
});
