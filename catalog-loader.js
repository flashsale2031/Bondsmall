(function () {
  'use strict';
  const TOTAL_RECORDS = 1231539;
  const CHUNK_SIZE = 1000;
  const PART_COUNT = Math.ceil(TOTAL_RECORDS / CHUNK_SIZE);
  const loaded = new Map();
  const pending = new Map();
  const base = 'https://flashsale2031.github.io/Bondsmall/catalog-parts/';
  const target = window.products = window.products || [];

  function fetchChunk(index, force) {
    index = Math.max(0, Math.min(PART_COUNT - 1, Number(index) || 0));
    if (!force && loaded.has(index)) {
      target.length = 0;
      target.push(...loaded.get(index));
      return Promise.resolve(loaded.get(index));
    }
    if (pending.has(index)) return pending.get(index);
    const promise = new Promise((resolve, reject) => {
      const capture = [];
      const previousProducts = window.products;
      window.products = capture;
      const script = document.createElement('script');
      script.async = true;
      script.src = `${base}products-part-${String(index + 1).padStart(4, '0')}.js?v=1.1.4`;
      script.onload = () => {
        window.products = previousProducts;
        const records = capture.slice();
        loaded.set(index, records);
        target.length = 0;
        target.push(...records);
        pending.delete(index);
        resolve(records);
      };
      script.onerror = () => {
        window.products = previousProducts;
        pending.delete(index);
        reject(new Error(`Unable to load catalog chunk ${index + 1}`));
      };
      document.head.appendChild(script);
    });
    pending.set(index, promise);
    return promise;
  }

  window.BondsmallCatalog = {
    totalCount: TOTAL_RECORDS,
    chunkSize: CHUNK_SIZE,
    partCount: PART_COUNT,
    loadedChunks: loaded,
    get totalPages() {
      return Math.ceil(TOTAL_RECORDS / (window.innerWidth <= 600 ? 20 : 21));
    },
    loadChunk(index) {
      return fetchChunk(index, false);
    },
    ensurePage(page, perPage) {
      const offset = Math.max(0, (Number(page) - 1) * Number(perPage || 21));
      return fetchChunk(Math.floor(offset / CHUNK_SIZE), false);
    },
    async getProductById(productId) {
      const id = Number(productId);
      if (!Number.isFinite(id) || id < 1 || id > TOTAL_RECORDS) return null;
      const chunk = await fetchChunk(Math.floor((id - 1) / CHUNK_SIZE), false);
      return chunk.find((product) => Number(product.id) === id) || null;
    },
    hydrateFirstChunk() {
      return fetchChunk(0, true);
    }
  };

  // catalog-first-page.js is synchronous and already populated the first 21 records.
  // Keep them intact through the first render; hydrate the complete first chunk only
  // after the browser has had time to paint the initial product grid.
  if (target.length > 0) {
    window.BondsmallCatalogReady = true;
    document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    const hydrate = () => window.BondsmallCatalog.hydrateFirstChunk().catch((error) => console.warn(error));
    setTimeout(hydrate, 1500);
  } else {
    fetchChunk(0, false).then(() => {
      window.BondsmallCatalogReady = true;
      document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    }).catch((error) => {
      console.warn('Catalog background load failed:', error);
      window.BondsmallCatalogReady = true;
      document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    });
  }
})();
