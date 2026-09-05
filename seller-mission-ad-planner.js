/* Bonds Mall Seller — Mission Ad Economics
 * Default mission: $500,000,000,000 annual net-yield target.
 * Default conversion assumption: 200 advertisements per sale.
 * This module is intentionally client-side and does not submit ads or contact
 * third-party platforms. It calculates planning estimates only.
 */
(function () {
  'use strict';

  const DEFAULTS = Object.freeze({
    financialGoal: 500000000000,
    adsPerSale: 200,
    locations: 19500
  });

  const money = (value) => Number(value || 0).toLocaleString(undefined, {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });
  const number = (value) => Math.max(0, Math.ceil(Number(value) || 0)).toLocaleString();
  const positive = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  function estimate(target, unitPrice, adsPerSale, locationCount) {
    const sales = unitPrice > 0 ? target / unitPrice : 0;
    const ads = sales * adsPerSale;
    return {
      target,
      unitPrice,
      sales,
      ads,
      adsPerLocation: locationCount > 0 ? ads / locationCount : ads
    };
  }

  function getProducts() {
    const candidates = [window.allProducts, window.products, window.PRODUCTS];
    const source = candidates.find(Array.isArray) || [];
    return source.map((p, i) => ({
      id: p.id ?? i,
      name: String(p.title || p.name || `Product ${i + 1}`),
      price: Number(p.price || 0)
    }));
  }

  function calculate(rows, goal, adsPerSale, locations) {
    const estimates = rows.map((row) => estimate(
      positive(row.target, 0), positive(row.price, 0), adsPerSale, locations
    ));
    return {
      estimates,
      aggregate: estimates.reduce((a, e) => ({
        target: a.target + e.target,
        sales: a.sales + e.sales,
        ads: a.ads + e.ads,
        adsPerLocation: a.adsPerLocation + e.adsPerLocation
      }), { target: 0, sales: 0, ads: 0, adsPerLocation: 0 }),
      goal,
      adsPerSale,
      locations
    };
  }

  function buildPanel() {
    if (document.getElementById('seller-mission-ad-planner')) return;
    const host = document.querySelector('main') || document.body;
    const section = document.createElement('section');
    section.id = 'seller-mission-ad-planner';
    section.setAttribute('aria-labelledby', 'seller-mission-ad-planner-title');
    section.style.cssText = 'margin:20px auto;max-width:1200px;padding:20px;border:1px solid #e3d8cc;border-radius:16px;background:rgba(255,253,248,.96);color:#241f1b;box-shadow:0 18px 45px rgba(57,43,29,.08);';
    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <div style="font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8c2f39">Mission economics</div>
          <h2 id="seller-mission-ad-planner-title" style="margin:5px 0 6px;font:700 1.5rem Georgia,serif">Ads-per-sale planning by product and city/town</h2>
          <p style="margin:0;color:#75695f;max-width:780px;line-height:1.5">Estimate the advertisement volume required to reach the financial goal for each product and in aggregate. The planning conversion is <strong>200 ads per sale</strong> by default.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px">
        <label style="display:grid;gap:5px;font-size:.75rem;font-weight:700">Financial goal ($)<input id="smap-goal" type="number" min="1" step="1000" value="${DEFAULTS.financialGoal}" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit"></label>
        <label style="display:grid;gap:5px;font-size:.75rem;font-weight:700">Ads per sale<input id="smap-ratio" type="number" min="1" step="1" value="${DEFAULTS.adsPerSale}" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit"></label>
        <label style="display:grid;gap:5px;font-size:.75rem;font-weight:700">Cities / towns<input id="smap-locations" type="number" min="1" step="1" value="${DEFAULTS.locations}" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit"></label>
      </div>
      <div id="smap-products" style="margin-top:14px"></div>
      <div id="smap-results" style="margin-top:14px"></div>
      <p style="margin:12px 0 0;font-size:.7rem;color:#75695f">Planning estimate only. It assumes the entered product price represents net yield per sale and that every sale requires the configured number of ads. Actual performance will vary.</p>`;
    host.appendChild(section);
    render();
  }

  function render() {
    const products = getProducts();
    const productHost = document.getElementById('smap-products');
    const goal = positive(document.getElementById('smap-goal')?.value, DEFAULTS.financialGoal);
    const ratio = positive(document.getElementById('smap-ratio')?.value, DEFAULTS.adsPerSale);
    const locations = positive(document.getElementById('smap-locations')?.value, DEFAULTS.locations);

    productHost.innerHTML = products.length ? products.map((p, i) => `
      <div data-smap-row="${i}" style="display:grid;grid-template-columns:minmax(180px,1.6fr) minmax(110px,.7fr) minmax(140px,.8fr);gap:8px;margin-bottom:8px;align-items:center">
        <input data-smap-name value="${p.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" aria-label="Product name" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit">
        <input data-smap-price type="number" min="0" step="0.01" value="${p.price}" aria-label="Product net yield per sale" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit">
        <input data-smap-target type="number" min="0" step="1000" value="${goal}" aria-label="Product financial target" style="padding:9px;border:1px solid #d8cbbd;border-radius:9px;font:inherit">
      </div>`).join('') : '<div style="padding:12px;border:1px dashed #d8cbbd;border-radius:9px;color:#75695f">No products are available in the current catalog. Add products or enter a product row in the mission-planning document.</div>';

    const header = products.length ? '<div style="display:grid;grid-template-columns:minmax(180px,1.6fr) minmax(110px,.7fr) minmax(140px,.8fr);gap:8px;margin-bottom:5px;color:#75695f;font-size:.65rem;font-weight:800;text-transform:uppercase"><span>Product</span><span>Net yield / sale</span><span>Financial target</span></div>' : '';
    productHost.insertAdjacentHTML('afterbegin', header);

    productHost.querySelectorAll('input').forEach(el => el.addEventListener('input', renderResults));
    ['smap-goal','smap-ratio','smap-locations'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
    renderResults();
  }

  function renderResults() {
    const rows = [...document.querySelectorAll('[data-smap-row]')].map(row => ({
      name: row.querySelector('[data-smap-name]')?.value || 'Product',
      price: Number(row.querySelector('[data-smap-price]')?.value || 0),
      target: Number(row.querySelector('[data-smap-target]')?.value || 0)
    }));
    const goal = positive(document.getElementById('smap-goal')?.value, DEFAULTS.financialGoal);
    const ratio = positive(document.getElementById('smap-ratio')?.value, DEFAULTS.adsPerSale);
    const locations = positive(document.getElementById('smap-locations')?.value, DEFAULTS.locations);
    const data = calculate(rows, goal, ratio, locations);
    const result = document.getElementById('smap-results');
    if (!result) return;
    const cards = rows.map((row, i) => {
      const e = data.estimates[i];
      return `<article style="padding:12px;border:1px solid #e3d8cc;border-radius:12px;background:#fff;margin-top:8px"><strong>${row.name.replace(/</g,'&lt;')}</strong><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px"><div><b>${money(e.target)}</b><small style="display:block;color:#75695f">target</small></div><div><b>${number(e.sales)}</b><small style="display:block;color:#75695f">sales needed</small></div><div><b>${number(e.ads)}</b><small style="display:block;color:#75695f">ads total</small></div><div><b>${number(e.adsPerLocation)}</b><small style="display:block;color:#75695f">ads / city or town</small></div></div></article>`;
    }).join('');
    result.innerHTML = `<div style="padding:12px;border-radius:12px;background:#f4eee7"><strong>Aggregate estimate</strong><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px"><div><b>${money(data.aggregate.target)}</b><small style="display:block;color:#75695f">combined target</small></div><div><b>${number(data.aggregate.sales)}</b><small style="display:block;color:#75695f">sales needed</small></div><div><b>${number(data.aggregate.ads)}</b><small style="display:block;color:#75695f">ads total</small></div><div><b>${number(data.aggregate.adsPerLocation)}</b><small style="display:block;color:#75695f">ads / city or town</small></div></div></div>${cards}`;
  }

  window.BondsMallSellerMissionAdPlanner = { DEFAULTS, estimate, calculate, getProducts, mount: buildPanel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
  else buildPanel();
})();
