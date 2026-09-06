/* Bonds Mall Seller — state platform traffic columns
 * Enhances the existing 50-state mission economics table in seller.html.
 * State traffic is a planning estimate: current platform U.S./site-wide monthly
 * traffic is converted to a daily average and allocated by 2025 Census state
 * population share. It is not measured state-level analytics.
 */
(function () {
  'use strict';

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
  const DAYS = 30.4375;
  const platforms = [
    { name:'Bonds Mall', url:'https://bondsmall.com/', monthly:null, basis:'First-party; live analytics required' },
    { name:'Craigslist', url:'https://www.craigslist.org/', monthly:119540000, basis:'119.54M U.S. visits, July 2026' },
    { name:'Facebook', url:'https://www.facebook.com/', monthly:2380000000, basis:'2.38B U.S. visits, July 2026; parent Facebook site, not Marketplace-only' },
    { name:'Nextdoor', url:'https://nextdoor.com/', monthly:159180000, basis:'159.18M site visits, July 2026; state value is a population-share planning model' },
    { name:'OfferUp', url:'https://offerup.com/', monthly:8500000, basis:'8.50M site visits, June 2026; latest surfaced Semrush benchmark' },
    { name:'Mercari', url:'https://www.mercari.com/us/', monthly:23010000, basis:'23.01M U.S. visits, July 2026' }
  ];

  const traffic = n => {
    if (n == null) return 'Live analytics required';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M/day';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K/day';
    return Math.round(n).toLocaleString('en-US') + '/day';
  };

  function stateTraffic(platform, state) {
    if (platform.monthly == null) return null;
    const share = (POP[state] || 0) / totalPopulation;
    return (platform.monthly / DAYS) * share;
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function findMissionTable() {
    const candidates = [...document.querySelectorAll('table')];
    return candidates.find(table => {
      const headerCells = [...table.querySelectorAll('thead th')];
      const headers = headerCells.length
        ? headerCells.map(th => normalize(th.textContent))
        : [...(table.rows[0]?.cells || [])].map(cell => normalize(cell.textContent));
      return headers.some(h => h === 'state') &&
        headers.some(h => h === 'locations') &&
        headers.some(h => h.includes('state profit target')) &&
        headers.some(h => h.includes('per-location target'));
    }) || null;
  }

  function getHeaderRow(table) {
    return table.querySelector('thead tr') || table.rows[0] || null;
  }

  function getBodyRows(table) {
    const tbody = table.querySelector('tbody');
    if (tbody) return [...tbody.querySelectorAll('tr')];
    return [...table.rows].slice(1);
  }

  function cell(platform, state) {
    const value = stateTraffic(platform, state);
    return `<td class="workspace-platform-traffic-cell">
      <strong>${platform.name}</strong>
      <a href="${platform.url}" target="_blank" rel="noopener noreferrer">Website</a>
      <span class="workspace-platform-daily">${traffic(value)}</span>
      <small>${platform.basis}</small>
    </td>`;
  }

  function makeScrollControls(scrollWrap) {
    const controls = document.createElement('div');
    controls.className = 'workspace-platform-scroll-controls';
    controls.innerHTML = `
      <span class="workspace-platform-scroll-label">Platform statistics → swipe left/right</span>
      <button type="button" class="workspace-platform-scroll-btn" data-scroll-dir="left" aria-label="Scroll platform statistics left">←</button>
      <button type="button" class="workspace-platform-scroll-btn" data-scroll-dir="right" aria-label="Scroll platform statistics right">→</button>`;
    controls.querySelectorAll('[data-scroll-dir]').forEach(button => {
      button.addEventListener('click', () => {
        const direction = button.dataset.scrollDir === 'right' ? 1 : -1;
        scrollWrap.scrollBy({ left: direction * Math.max(280, scrollWrap.clientWidth * 0.8), behavior: 'smooth' });
      });
    });
    return controls;
  }

  function createScrollWrapper(table) {
    if (table.parentElement?.classList.contains('workspace-platform-scroll')) return table.parentElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'workspace-platform-scroll';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Bonds Mall state platform traffic statistics');
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    return wrapper;
  }

  function enhance() {
    const table = findMissionTable();
    if (!table || table.dataset.platformTrafficEnhanced === '1') return false;

    const head = getHeaderRow(table);
    const rows = getBodyRows(table);
    if (!head || rows.length === 0) return false;

    const firstStateRow = rows.find(row => POP[String(row.cells[0]?.textContent || '').trim()]);
    if (!firstStateRow) return false;

    platforms.forEach(p => {
      const th = document.createElement('th');
      th.className = 'workspace-platform-traffic-head';
      th.innerHTML = `<strong>${p.name}</strong><small>Estimated daily state web traffic</small>`;
      head.appendChild(th);
    });

    rows.forEach(row => {
      const state = String(row.cells[0]?.textContent || '').trim();
      if (!state || !POP[state]) return;
      platforms.forEach(p => row.insertAdjacentHTML('beforeend', cell(p, state)));
    });

    table.dataset.platformTrafficEnhanced = '1';
    table.classList.add('workspace-platform-traffic-table');

    const scrollWrap = createScrollWrapper(table);
    const controls = makeScrollControls(scrollWrap);
    scrollWrap.parentNode.insertBefore(controls, scrollWrap);

    const wrap = scrollWrap.closest('.workspace-econ-table-wrap') || scrollWrap.parentElement;
    if (wrap && !wrap.previousElementSibling?.classList.contains('workspace-platform-traffic-note')) {
      const note = document.createElement('div');
      note.className = 'workspace-platform-traffic-note';
      note.innerHTML = '<strong>Platform traffic by state:</strong> Each platform is shown side by side. Daily state figures are modeled estimates derived from the latest surfaced platform traffic benchmark and the state\'s 2025 Census population share. They are not platform-reported state analytics. Bonds Mall remains live-analytics only until first-party analytics are connected.';
      wrap.parentElement.insertBefore(note, wrap);
    }
    return true;
  }

  function installStyle() {
    if (document.getElementById('workspace-platform-traffic-style')) return;
    const style = document.createElement('style');
    style.id = 'workspace-platform-traffic-style';
    style.textContent = `
      .workspace-platform-traffic-note{margin:8px 0;padding:9px 10px;border:1px solid #e3d8cc;border-radius:9px;background:#f7f1ea;color:#665950;font-size:.66rem;line-height:1.45}
      .workspace-platform-scroll-controls{display:flex;align-items:center;gap:7px;margin:8px 0 5px;min-height:34px}
      .workspace-platform-scroll-label{flex:1;color:#75695f;font-size:.68rem;font-weight:700}
      .workspace-platform-scroll-btn{appearance:none;border:1px solid #d8cbbd;border-radius:8px;background:#fff8f0;color:#8c2f39;width:38px;height:34px;font-size:1.05rem;font-weight:800;cursor:pointer;touch-action:manipulation}
      .workspace-platform-scroll-btn:active{transform:scale(.96)}
      .workspace-platform-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x;scrollbar-width:auto;scrollbar-color:#8c2f39 #eee5dc;border:1px solid #e3d8cc;border-radius:10px;}
      .workspace-platform-scroll::-webkit-scrollbar{height:12px}
      .workspace-platform-scroll::-webkit-scrollbar-track{background:#eee5dc;border-radius:10px}
      .workspace-platform-scroll::-webkit-scrollbar-thumb{background:#8c2f39;border-radius:10px;border:2px solid #eee5dc}
      .workspace-platform-traffic-table{width:max-content;min-width:1480px;display:table;border-collapse:collapse;table-layout:auto}
      .workspace-platform-traffic-table th,.workspace-platform-traffic-table td{box-sizing:border-box}
      .workspace-platform-traffic-head{min-width:175px;vertical-align:top;white-space:normal}
      .workspace-platform-traffic-head strong{display:block;color:#8c2f39}
      .workspace-platform-traffic-head small{display:block;color:#75695f;font-weight:500;margin-top:2px}
      .workspace-platform-traffic-cell{min-width:175px;vertical-align:top;white-space:normal}
      .workspace-platform-traffic-cell strong{display:block;color:#8c2f39}
      .workspace-platform-traffic-cell a{display:block;color:#8c2f39;font-size:.66rem;text-decoration:underline;margin:2px 0}
      .workspace-platform-traffic-cell .workspace-platform-daily{display:block;font-weight:800;color:#241f1b;margin:2px 0}
      .workspace-platform-traffic-cell small{display:block;color:#75695f;font-size:.57rem;line-height:1.35}
      @media(max-width:700px){
        .workspace-platform-scroll{width:100%;max-width:100%;}
        .workspace-platform-traffic-table{min-width:1480px}
        .workspace-platform-traffic-head,.workspace-platform-traffic-cell{min-width:160px}
        .workspace-platform-scroll-label{font-size:.63rem}
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    installStyle();
    enhance();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (enhance() || attempts >= 120) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
  document.addEventListener('bondsmall-locale-change', enhance);
  window.BondsMallStatePlatformTraffic = { enhance, platforms, population: POP };
})();
