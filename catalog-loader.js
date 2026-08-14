(function () {
  'use strict';
  const TOTAL_RECORDS = 1231539;
  const CHUNK_SIZE = 1000;
  const PART_COUNT = Math.ceil(TOTAL_RECORDS / CHUNK_SIZE);
  const loaded = new Map();
  const pending = new Map();
  const base = 'catalog-parts/';
  window.BondsmallCatalog = {
    totalCount: TOTAL_RECORDS,
    chunkSize: CHUNK_SIZE,
    partCount: PART_COUNT,
    loadedChunks: loaded,
    get totalPages() { return Math.ceil(TOTAL_RECORDS / (window.innerWidth <= 600 ? 20 : 21)); },
    async loadChunk(chunkIndex) {
      const index = Math.max(0, Math.min(PART_COUNT - 1, Number(chunkIndex) || 0));
      if (loaded.has(index)) { window.products = loaded.get(index); return loaded.get(index); }
      if (pending.has(index)) return pending.get(index);
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `${base}products-part-${String(index + 1).padStart(4, '0')}.js`;
        script.onload = () => {
          const records = window.products.slice();
          loaded.set(index, records);
          window.products.length = 0;
          window.products.push(...records);
          pending.delete(index);
          resolve(records);
        };
        script.onerror = () => { pending.delete(index); reject(new Error(`Unable to load catalog chunk ${index + 1}`)); };
        document.head.appendChild(script);
      });
      pending.set(index, promise);
      return promise;
    },
    async ensurePage(page, perPage) {
      const offset = Math.max(0, (Number(page) - 1) * Number(perPage || 21));
      return this.loadChunk(Math.floor(offset / CHUNK_SIZE));
    }
  };
  window.products = window.products || [];
  window.BondsmallCatalog.loadChunk(0).then(() => {
    window.BondsmallCatalogReady = true;
    document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
  }).catch((error) => {
    console.error(error);
    document.dispatchEvent(new CustomEvent('bondsmall-catalog-error', { detail: error }));
  });
})();
