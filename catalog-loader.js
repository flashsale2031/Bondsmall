(function () {
  'use strict';
  const TOTAL_RECORDS = 1231539;
  const CHUNK_SIZE = 1000;
  const PART_COUNT = Math.ceil(TOTAL_RECORDS / CHUNK_SIZE);
  const loaded = new Map();
  const pending = new Map();
  let orderedTail = Promise.resolve();
  const base = 'https://flashsale2031.github.io/Bondsmall/catalog-parts/';
  const target = window.products = window.products || [];

  function fetchChunk(index, force) {
    index = Math.max(0, Math.min(PART_COUNT - 1, Number(index) || 0));
    if (!force && loaded.has(index)) {
      const cached = loaded.get(index);
      if (cached.length < CHUNK_SIZE) return fetchChunk(index, true);
      target.length = 0;
      target.push(...cached);
      return Promise.resolve(cached);
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
        document.dispatchEvent(new CustomEvent('bondsmall-catalog-chunk-loaded', { detail: { index, records } }));
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

  function loadThrough(index) {
    index = Math.max(0, Math.min(PART_COUNT - 1, Number(index) || 0));
    const request = orderedTail.then(async () => {
      for (let cursor = 0; cursor <= index; cursor += 1) {
        const cached = loaded.get(cursor);
        if (cached && cached.length >= CHUNK_SIZE) continue;
        await fetchChunk(cursor, Boolean(cached && cached.length < CHUNK_SIZE));
      }
      return loaded.get(index) || [];
    });
    orderedTail = request.catch(() => undefined);
    return request;
  }

  window.BondsmallCatalog = {
    totalCount: TOTAL_RECORDS,
    chunkSize: CHUNK_SIZE,
    partCount: PART_COUNT,
    loadedChunks: loaded,
    loadThrough,
    get totalPages() {
      return Math.ceil(TOTAL_RECORDS / (window.innerWidth <= 600 ? 20 : 21));
    },
    loadChunk(index) {
      return fetchChunk(index, false);
    },
    ensurePage(page, perPage) {
      const offset = Math.max(0, (Number(page) - 1) * Number(perPage || 21));
      return loadThrough(Math.floor(offset / CHUNK_SIZE));
    },
    async getProductById(productId) {
      const id = Number(productId);
      if (!Number.isFinite(id) || id < 1 || id > TOTAL_RECORDS) return null;
      const chunk = await loadThrough(Math.floor((id - 1) / CHUNK_SIZE));
      return chunk.find((product) => Number(product.id) === id) || null;
    },
    hydrateFirstChunk() {
      return loadThrough(0);
    }
  };

  // catalog-first-page.js is synchronous and already populated the first 21 records.
  // Register them immediately so ensurePage(1) doesn't trigger a redundant fetch.
  if (target.length > 0) {
    loaded.set(0, target.slice());
    window.BondsmallCatalogReady = true;
    document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    // Hydrate the complete first chunk in the background.
    const hydrate = () => window.BondsmallCatalog.loadThrough(0).catch((error) => console.warn(error));
    if ('requestIdleCallback' in window) requestIdleCallback(hydrate, { timeout: 2000 });
    else setTimeout(hydrate, 1000);
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
