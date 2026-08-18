/* Bonds Mall authoritative catalog guard.
 * Load after products.js and before catalog-loader.js.
 * The snapshot is immutable and is used to protect original records from
 * later lazy-chunk replacements.
 */
(() => {
  'use strict';
  const source = Array.isArray(window.products) ? window.products : [];
  const records = source
    .filter(product => product && Number.isFinite(Number(product.id)))
    .map(product => Object.freeze({ ...product }));
  const byId = new Map(records.map(product => [Number(product.id), product]));
  window.BondsmallCatalogAuthority = Object.freeze({
    records: Object.freeze(records.slice()),
    count: records.length,
    has(id) { return byId.has(Number(id)); },
    get(id) { return byId.get(Number(id)) || null; },
    protect(product) {
      const original = byId.get(Number(product && product.id));
      return original || product;
    }
  });
})();
