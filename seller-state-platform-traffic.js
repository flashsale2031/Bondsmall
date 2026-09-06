/* Bonds Mall Seller — separate state platform daily traffic table
 * Renders BELOW the existing U.S. locations / mission economics table.
 * It is intentionally a separate table so Seller.html's existing table
 * can continue rendering independently.
 *
 * The same standalone table source is also surfaced inside the
 * "Live Mission Pulse" area when that area is present on Seller.html.
 */
(function () {
  'use strict';

  const TRAFFIC_SOURCE = 'seller-platform-traffic.html';

  const POP = {
    Alabama:5193088, Alaska:737270, Arizona:7623818, Arkansas:3114791,
    California:39355309, Colorado:6012561, Connecticut:3688496, Delaware:1059952,
    Florida:23462518, Georgia:11302748, Hawaii:1432820, Idaho:2029733,
    Illinois:12719141, Indiana:6973333, Iowa:3238387, Kansas:2977220,
    Kentucky:4606864, Louisiana:4618189, Maine:1414874, Maryland:6265347,
    Massachusetts:7154084, Michigan:10127884, Minnesota:5830405, Mississippi:2954160,
    Missouri:6270541, Montana:1144694, Nebraska:2018006, Nevada:3282188,
    'New Hampshire':1415342, 'New Jersey':9548215, 'New Mexico':2125498,
    'New York':20002427, 'North Carolina':11197968, 'North Dakota':799358,
    Ohio:11900510, Oklahoma:4123288, Oregon:4273586, Pennsylvania:13059432,
    'Rhode Island':1114521, 'South Carolina':5570274, 'South Dakota':935094,
    Tennessee:7315076, Texas:31709821, Utah:3538904, Vermont:644663,
    Virginia:8880107, Washington:8001020, 'West Virginia':1766147,
    Wisconsin:5972787, Wyoming:588753
  };

  const totalPopulation = Object.values(POP).reduce((a,b) => a + b, 0);

  const platforms = [
    { name:'Bonds Mall', url:'https://bondsmall.com/', daily:null, basis:'First-party; live analytics required' },
    { name:'Craigslist', url:'https://www.craigslist.org/', daily:3927392.1971252565, basis:'3.93M/day average; derived from 119.54M U.S. visits, July 2026' },
    { name:'Facebook', url:'https://www.facebook.com/', daily:78193018.48049282, basis:'78.19M/day average; derived from 2.38B U.S. visits, July 2026; Facebook site, not Marketplace-only' },
    { name:'Nextdoor', url:'https://nextdoor.com/', daily:5229733.059548255, basis:'5.23M/day average; derived from 159.18M site visits, July 2026' },
    { name:'OfferUp', url:'https://offerup.com/', daily:279260.78028747434, basis:'279.3K/day average; derived from 8.50M site visits, June 2026' },
    { name:'Mercari', url:'https://www.mercari.com/us/', daily:755975.3593429158, basis:'756.0K/day average; derived from 23.01M U.S. visits, July 2026' },
    { name:'Classified Ads', url:'https://www.classifiedads.com/', daily:4731.006160164271, basis:'4.73K/day average; derived from 144K U.S. visits, July 2026' },
    { name:'AdlandPro', url:'https://www.adlandpro.com/', daily:99595.1704312115, basis:'99.6K/day average; current third-party estimate' },
    { name:'Gumtree', url:'https://www.gumtree.com/', daily:320657.0841889117, basis:'320.7K/day average; derived from 9.76M visits, June 2026' },
    { name:'Locanto', url:'https://www.locanto.us/', daily:10651.663244353183, basis:'10.7K/day average; derived from 324.21K U.S. visits, July 2026' }
  ];

  const states = Object.keys(POP);

  function traffic(n) {
    if (n == null) return 'Live analytics required';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M/day';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K/day';
    return Math.round(n).toLocaleString('en-US') + '/day';
  }

  function stateTraffic(platform, state) {
    if (platform.daily == null) return null;
    return platform.daily * (POP[state] / totalPopulation);
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function findLocationsTable() {
    const host = document.getElementById('workspace-mission-economics');
    if (!host) return null;
    const tables = [...host.querySelectorAll('table')];
    return tables.find(table => {
      const headers = [...table.querySelectorAll('thead th')].map(th => normalize(th.textContent));
      return headers.includes('state') && headers.includes('locations') &&
        headers.some(h => h.includes('state profit target')) &&
        headers.some(h => h.includes('per-location target'));
    }) || null;
  }

  function buildTable() {
    const existing = document.getElementById('seller-platform-daily-traffic-table');
    if (existing) return existing;

    const locationsTable = findLocationsTable();
    if (!locationsTable) return null;

    const section = document.createElement('section');
    section.id = 'seller-platform-daily-traffic-section';
    section.className = 'seller-platform-daily-traffic-section';

    const title = document.createElement('div');
    title.className = 'seller-platform-daily-traffic-title';
    title.innerHTML = '<strong>U.S. State Platform Daily Traffic</strong><span>Separate traffic table — estimated daily averages</span>';
    section.appendChild(title);

    const note = document.createElement('div');
    note.className = 'seller-platform-daily-traffic-note';
    note.textContent = 'State figures are modeled daily averages based on each platform traffic benchmark and 2025 Census population share. They are not platform-reported state analytics. Bonds Mall requires first-party live analytics.';
    section.appendChild(note);

    const scroll = document.createElement('div');
    scroll.className = 'seller-platform-daily-traffic-scroll';
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'U.S. state platform daily traffic table');
    scroll.setAttribute('tabindex', '0');

    const table = document.createElement('table');
    table.id = 'seller-platform-daily-traffic-table';
    table.className = 'seller-platform-daily-traffic-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const stateHead = document.createElement('th');
    stateHead.textContent = 'State';
    headRow.appendChild(stateHead);
    platforms.forEach(platform => {
      const th = document.createElement('th');
      th.innerHTML = `<strong>${platform.name}</strong><small>Daily traffic</small>`;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    states.forEach(state => {
      const row = document.createElement('tr');
      const stateCell = document.createElement('th');
      stateCell.scope = 'row';
      stateCell.textContent = state;
      row.appendChild(stateCell);
      platforms.forEach(platform => {
        const td = document.createElement('td');
        const value = stateTraffic(platform, state);
        td.innerHTML = `<a href="${platform.url}" target="_blank" rel="noopener noreferrer">${platform.name}</a><strong>${traffic(value)}</strong>`;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    section.appendChild(scroll);

    locationsTable.parentNode.insertBefore(section, locationsTable.nextSibling);
    return table;
  }

  function installStyle() {
    if (document.getElementById('seller-platform-daily-traffic-style')) return;
    const style = document.createElement('style');
    style.id = 'seller-platform-daily-traffic-style';
    style.textContent = `
      #workspace-mission-economics .seller-platform-daily-traffic-section{margin:16px 0 18px;border:1px solid #e3d8cc;border-radius:12px;background:#fffdf9;overflow:hidden}
      #workspace-mission-economics .seller-platform-daily-traffic-title{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:12px 12px 5px;color:#241f1b}
      #workspace-mission-economics .seller-platform-daily-traffic-title strong{font-size:.92rem;color:#8c2f39}
      #workspace-mission-economics .seller-platform-daily-traffic-title span{font-size:.68rem;color:#75695f}
      #workspace-mission-economics .seller-platform-daily-traffic-note{padding:0 12px 10px;color:#665950;font-size:.65rem;line-height:1.4}
      #workspace-mission-economics .seller-platform-daily-traffic-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;scrollbar-width:auto;scrollbar-color:#8c2f39 #eee5dc}
      #workspace-mission-economics .seller-platform-daily-traffic-scroll:focus-visible{outline:3px solid rgba(140,47,57,.18);outline-offset:-3px}
      #workspace-mission-economics .seller-platform-daily-traffic-scroll::-webkit-scrollbar{height:12px}
      #workspace-mission-economics .seller-platform-daily-traffic-scroll::-webkit-scrollbar-track{background:#eee5dc}
      #workspace-mission-economics .seller-platform-daily-traffic-scroll::-webkit-scrollbar-thumb{background:#8c2f39;border-radius:8px;border:2px solid #eee5dc}
      #workspace-mission-economics table.seller-platform-daily-traffic-table{width:max-content;min-width:1480px;border-collapse:collapse;table-layout:auto;margin:0}
      #workspace-mission-economics .seller-platform-daily-traffic-table th,#workspace-mission-economics .seller-platform-daily-traffic-table td{min-width:145px;padding:9px 10px;border-bottom:1px solid #e8ddd2;text-align:left;vertical-align:top;background:#fffdf9}
      #workspace-mission-economics .seller-platform-daily-traffic-table thead th{position:sticky;top:0;background:#f2ebe3;color:#665950;font-size:.72rem}
      #workspace-mission-economics .seller-platform-daily-traffic-table thead th strong{display:block;color:#8c2f39;font-size:.72rem}
      #workspace-mission-economics .seller-platform-daily-traffic-table thead th small{display:block;margin-top:2px;font-size:.62rem;font-weight:500}
      #workspace-mission-economics .seller-platform-daily-traffic-table tbody th{min-width:120px;color:#241f1b;font-size:.72rem;background:#faf6f0}
      #workspace-mission-economics .seller-platform-daily-traffic-table td a{display:block;color:#8c2f39;font-size:.63rem;text-decoration:underline;margin-bottom:2px}
      #workspace-mission-economics .seller-platform-daily-traffic-table td strong{display:block;color:#241f1b;font-size:.74rem;white-space:nowrap}

      .seller-live-mission-pulse-traffic{margin-top:16px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(17,24,39,.55);overflow:hidden}
      .seller-live-mission-pulse-traffic-header{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:12px 14px 7px}
      .seller-live-mission-pulse-traffic-header strong{color:var(--text,#f0f2f5);font-size:.9rem}
      .seller-live-mission-pulse-traffic-header span{color:var(--text2,#8b95a5);font-size:.66rem}
      .seller-live-mission-pulse-traffic-note{padding:0 14px 10px;color:var(--text2,#8b95a5);font-size:.64rem;line-height:1.4}
      .seller-live-mission-pulse-traffic-frame{display:block;width:100%;height:640px;border:0;border-top:1px solid rgba(255,255,255,.08);background:#f7f2ec}
      @media(max-width:700px){
        #workspace-mission-economics .seller-platform-daily-traffic-title{display:block}
        #workspace-mission-economics .seller-platform-daily-traffic-title span{display:block;margin-top:3px}
        #workspace-mission-economics table.seller-platform-daily-traffic-table{min-width:1480px}
        .seller-live-mission-pulse-traffic-frame{height:72vh;min-height:520px}
      }
    `;
    document.head.appendChild(style);
  }

  function findLiveMissionPulse() {
    const candidates = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],.section-title,.card-title,.panel-title,.workspace-panel-label')];
    const heading = candidates.find(el => normalize(el.textContent).includes('live mission pulse'));
    if (!heading) return null;

    let container = heading.parentElement;
    while (container && container !== document.body) {
      const text = normalize(container.textContent);
      if (text.includes('live mission pulse') && (container.matches('section,article,.card,.panel,.workspace-card,.window') || container.children.length >= 2)) {
        return container;
      }
      container = container.parentElement;
    }
    return heading.parentElement || heading;
  }

  function renderPulseTable() {
    if (document.getElementById('seller-live-mission-pulse-traffic')) return true;
    const pulse = findLiveMissionPulse();
    if (!pulse) return false;

    const section = document.createElement('section');
    section.id = 'seller-live-mission-pulse-traffic';
    section.className = 'seller-live-mission-pulse-traffic';

    const header = document.createElement('div');
    header.className = 'seller-live-mission-pulse-traffic-header';
    header.innerHTML = '<strong>U.S. State Platform Daily Traffic</strong><span>Mission traffic table · 50 states</span>';
    section.appendChild(header);

    const note = document.createElement('div');
    note.className = 'seller-live-mission-pulse-traffic-note';
    note.textContent = 'The Live Mission Pulse uses the same standalone platform traffic table source used by the mission statement. State traffic remains a modeled population-share estimate, not platform-reported state analytics.';
    section.appendChild(note);

    const frame = document.createElement('iframe');
    frame.className = 'seller-live-mission-pulse-traffic-frame';
    frame.src = TRAFFIC_SOURCE + '?embed=live-mission-pulse';
    frame.title = 'U.S. State Platform Daily Traffic — Live Mission Pulse';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('scrolling', 'yes');
    section.appendChild(frame);

    pulse.appendChild(section);
    return true;
  }

  function start() {
    installStyle();
    buildTable();
    renderPulseTable();

    const host = document.getElementById('workspace-mission-economics');
    const observerTarget = host || document.body;
    const observer = new MutationObserver(() => {
      const tableReady = Boolean(buildTable());
      const pulseReady = renderPulseTable();
      if (tableReady && pulseReady) observer.disconnect();
    });
    observer.observe(observerTarget, {childList:true, subtree:true});

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const tableReady = Boolean(buildTable());
      const pulseReady = renderPulseTable();
      if ((tableReady && pulseReady) || attempts >= 120) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();

  window.BondsMallStatePlatformTraffic = {buildTable, renderPulseTable, platforms, population:POP};
  if (typeof window.renderWorkspaceMission === 'function') window.renderWorkspaceMission();
})();
