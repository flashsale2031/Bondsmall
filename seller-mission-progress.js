/* Bonds Mall Seller — mission dollar progress overlay.
 * Shows the amount actually acquired above the Mission Progress bar,
 * right aligned, with a dark-green dollar-proportional fill.
 * No amount is fabricated: when no verified dollar amount exists, it shows $0.
 */
(function () {
  'use strict';

  const TARGET = 500000000000;
  const BAR_ID = 'seller-mission-progress';
  const STYLE_ID = 'seller-mission-progress-dollar-style';

  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function clampAmount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(TARGET, n));
  }

  function readAmount() {
    const sources = [
      window.BondsMallMissionProgress,
      window.missionProgress,
      window.WORKSPACE_MISSION_PROGRESS,
      window.workspaceMissionProgress
    ];

    for (const source of sources) {
      if (source == null) continue;
      if (typeof source === 'object') {
        for (const key of ['amountAcquired','acquired','totalAcquired','completedAmount','completed','contributionProfit','profit','amount','value','dollars']) {
          const amount = clampAmount(source[key]);
          if (amount != null) return amount;
        }
        const percent = Number(source.percent ?? source.progress);
        if (Number.isFinite(percent)) return TARGET * Math.max(0, Math.min(100, percent)) / 100;
      } else {
        const numeric = Number(source);
        if (Number.isFinite(numeric)) {
          return numeric <= 100 ? TARGET * Math.max(0, Math.min(100, numeric)) / 100 : clampAmount(numeric);
        }
      }
    }

    const selectors = [
      '[data-mission-acquired]', '[data-total-acquired]', '[data-acquired-amount]',
      '#mission-acquired', '#mission-total-acquired', '#total-money-acquired',
      '.mission-acquired', '.total-money-acquired', '.mission-total-acquired'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const raw = el.dataset.missionAcquired || el.dataset.totalAcquired || el.dataset.acquiredAmount || el.textContent;
      const numeric = Number(String(raw || '').replace(/[$,\s]/g, '').replace(/[^0-9.-]/g, ''));
      const amount = clampAmount(numeric);
      if (amount != null) return amount;
    }

    try {
      for (const key of ['bondsmall-mission-acquired','bondsmall-total-money-acquired','bondsmall-mission-dollar-progress']) {
        const raw = localStorage.getItem(key);
        if (raw == null) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const amount = clampAmount(parsed.amountAcquired ?? parsed.acquired ?? parsed.totalAcquired ?? parsed.amount ?? parsed.value);
            if (amount != null) return amount;
          }
        } catch (_) {}
        const amount = clampAmount(String(raw).replace(/[$,\s]/g, ''));
        if (amount != null) return amount;
      }
      const percent = Number(localStorage.getItem('bondsmall-mission-progress'));
      if (Number.isFinite(percent)) return TARGET * Math.max(0, Math.min(100, percent)) / 100;
    } catch (_) {}

    return 0;
  }

  function formatMoney(value) {
    return '$' + Math.round(value).toLocaleString('en-US');
  }

  function findPulse() {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],.section-title,.card-title,.panel-title,.workspace-panel-label')];
    const heading = headings.find(el => normalize(el.textContent).includes('live mission pulse'));
    if (!heading) return null;
    let node = heading.parentElement;
    while (node && node !== document.body) {
      const text = normalize(node.textContent);
      if (text.includes('live mission pulse') && (node.matches('section,article,.card,.panel,.workspace-card,.window') || node.children.length >= 2)) return node;
      node = node.parentElement;
    }
    return heading.parentElement || heading;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BAR_ID}{
        margin:0 0 16px !important;
        border:1px solid rgba(255,255,255,.12) !important;
        border-radius:12px !important;
        background:rgba(17,24,39,.72) !important;
        overflow:hidden !important;
      }
      #${BAR_ID} .seller-mission-progress-header{
        display:flex !important;
        align-items:center !important;
        justify-content:space-between !important;
        gap:16px !important;
        padding:13px 14px 8px !important;
      }
      #${BAR_ID} .seller-mission-progress-header strong{color:#f0f2f5 !important;font-size:.92rem !important}
      #${BAR_ID} .seller-mission-progress-acquired{
        margin-left:auto !important;
        color:#62d58b !important;
        font-size:.9rem !important;
        font-weight:800 !important;
        text-align:right !important;
        white-space:nowrap !important;
      }
      #${BAR_ID} .seller-mission-progress-target{padding:0 14px 8px !important;color:#9aa4b2 !important;font-size:.68rem !important}
      #${BAR_ID} .seller-mission-progress-track{
        height:12px !important;
        margin:0 14px 8px !important;
        border-radius:999px !important;
        background:rgba(255,255,255,.10) !important;
        border:1px solid rgba(255,255,255,.12) !important;
        overflow:hidden !important;
      }
      #${BAR_ID} .seller-mission-progress-fill{
        height:100% !important;
        width:0 !important;
        border-radius:999px !important;
        background:#0b5d2a !important;
        transition:width .35s linear !important;
        box-shadow:0 0 7px rgba(11,93,42,.45) !important;
      }
      #${BAR_ID} .seller-mission-progress-meta{display:flex !important;justify-content:space-between !important;gap:10px !important;padding:0 14px 12px !important;color:#9aa4b2 !important;font-size:.65rem !important}
      #${BAR_ID} .seller-mission-progress-meta strong{color:#f0f2f5 !important}
      @media(max-width:700px){
        #${BAR_ID} .seller-mission-progress-header{gap:8px !important;padding:12px !important}
        #${BAR_ID} .seller-mission-progress-acquired{font-size:.8rem !important}
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    installStyle();
    const pulse = findPulse();
    if (!pulse) return false;

    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement('section');
      bar.id = BAR_ID;
      bar.className = 'seller-mission-progress';
      bar.setAttribute('aria-label', 'Mission Progress');
      bar.innerHTML = `
        <div class="seller-mission-progress-header">
          <strong>Mission Progress</strong>
          <span class="seller-mission-progress-acquired">$0 acquired</span>
        </div>
        <div class="seller-mission-progress-target">Annual contribution-profit mission target: <strong>$500,000,000,000</strong></div>
        <div class="seller-mission-progress-track" role="progressbar" aria-label="Bonds Mall mission progress in dollars" aria-valuemin="0" aria-valuemax="500000000000" aria-valuenow="0">
          <div class="seller-mission-progress-fill"></div>
        </div>
        <div class="seller-mission-progress-meta"><span>Target remaining: <strong>$500,000,000,000</strong></span><span class="seller-mission-progress-percent">0.00%</span></div>`;
    }

    if (bar.parentNode !== pulse) pulse.parentNode.insertBefore(bar, pulse);

    const amount = readAmount();
    const percent = (amount / TARGET) * 100;
    const remaining = Math.max(0, TARGET - amount);
    const fill = bar.querySelector('.seller-mission-progress-fill');
    const track = bar.querySelector('.seller-mission-progress-track');
    const acquired = bar.querySelector('.seller-mission-progress-acquired');
    const remainingNode = bar.querySelector('.seller-mission-progress-meta strong');
    const percentNode = bar.querySelector('.seller-mission-progress-percent');

    if (fill) fill.style.width = percent + '%';
    if (track) track.setAttribute('aria-valuenow', String(Math.round(amount)));
    if (acquired) acquired.textContent = formatMoney(amount) + ' acquired';
    if (remainingNode) remainingNode.textContent = formatMoney(remaining);
    if (percentNode) percentNode.textContent = percent.toFixed(8) + '%';
    return true;
  }

  function eventUpdate(event) {
    const detail = event?.detail;
    if (detail != null) {
      const amount = typeof detail === 'object' ? (detail.amountAcquired ?? detail.acquired ?? detail.totalAcquired ?? detail.amount ?? detail.value) : detail;
      if (Number.isFinite(Number(amount))) {
        try { localStorage.setItem('bondsmall-mission-acquired', String(amount)); } catch (_) {}
      }
    }
    render();
  }

  function start() {
    render();
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, {childList:true, subtree:true});
    window.addEventListener('bondsmall-mission-progress', eventUpdate);
    window.addEventListener('bondsmall-mission-acquired', eventUpdate);
    window.addEventListener('storage', event => {
      if (/bondsmall-(mission-progress|mission-acquired|total-money-acquired|mission-dollar-progress)/.test(event.key || '')) render();
    });
    setInterval(render, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();

  window.BondsMallMissionDollarProgress = Object.freeze({ render, readAmount, target: TARGET });
})();
