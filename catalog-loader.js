/* Bondsmall page-sized catalog loader: one 20-product chunk per storefront page. */
(() => {
  'use strict';
  const TOTAL_RECORDS = 1231541;
  const PAGE_SIZE = 20;
  const PAGE_COUNT = 61577;
  const loaded = new Map();
  const pending = new Map();
  const base = 'catalog-pages/';
  const target = window.products = window.products || [];
  const authority = window.BondsmallCatalogAuthority || { records: [], has: () => false, get: () => null };
  const version = '2.4.1-gzip';
  const categoryIndex = (window.BondsmallCategoryIndex && window.BondsmallCategoryIndex.categories) || {};
  const categoryStates = new Map();

  function clampPage(index) {
    return Math.max(0, Math.min(PAGE_COUNT - 1, Number(index) || 0));
  }

  function preferAuthoritative(records) {
    const incoming = Array.isArray(records) ? records : [];
    if (!authority.records.length) return incoming.slice();
    const byId = new Map(authority.records.map(product => [Number(product.id), product]));
    // Keep the chunk's shape and order. Replace only matching IDs with the
    // immutable products.js snapshot; never prepend the full authority list to
    // every lazy chunk, which would make every page render page one again.
    return incoming.map(product => byId.get(Number(product && product.id)) || product);
  }

  function setTarget(records) {
    const preferred = preferAuthoritative(records);
    target.length = 0;
    target.push(...preferred);
    window.products = target;
  }

  async function decodeCatalogChunk(response) {
    if (!response.ok) throw new Error(`Catalog request failed with HTTP ${response.status}`);
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support gzip catalog decompression');
    }
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    const records = JSON.parse(text);
    return Array.isArray(records) ? records : [];
  }

  function fetchPage(index, force = false) {
    index = clampPage(index);
    if (!force && loaded.has(index)) {
      const records = loaded.get(index);
      setTarget(records);
      return Promise.resolve(records);
    }
    if (pending.has(index)) return pending.get(index);
    const promise = fetch(`${base}products-page-${String(index + 1).padStart(5, '0')}.json.gz?v=${version}`, { cache: 'force-cache' })
      .then(decodeCatalogChunk)
      .then((incoming) => {
        const records = preferAuthoritative(incoming);
        if (!records.length) throw new Error(`Catalog page ${index + 1} returned no products`);
        loaded.set(index, records);
        setTarget(records);
        pending.delete(index);
        document.dispatchEvent(new CustomEvent('bondsmall-catalog-chunk-loaded', { detail: { index, records } }));
        return records;
      })
      .catch((error) => {
        pending.delete(index);
        throw error;
      });
    pending.set(index, promise);
    return promise;
  }

  async function ensurePage(page, perPage = PAGE_SIZE) {
    const pageNumber = Math.max(1, Math.min(Math.ceil(TOTAL_RECORDS / perPage), Number(page) || 1));
    const start = (pageNumber - 1) * perPage;
    const first = Math.floor(start / PAGE_SIZE);
    const last = Math.floor((start + Math.min(perPage, TOTAL_RECORDS - start) - 1) / PAGE_SIZE);
    const records = [];
    for (let index = first; index <= last; index += 1) {
      records.push(...await fetchPage(index));
    }
    setTarget(records);
    return records;
  }

  function normalizeCategory(category) {
    return String(category || 'all').toLowerCase().replace(/[^a-z]/g, '');
  }

  function getCategoryTotal(category) {
    if (normalizeCategory(category) === 'all') return TOTAL_RECORDS;
    return Number((categoryIndex[normalizeCategory(category)] || {}).count || 0);
  }

  async function ensureCategoryPage(category, page, perPage = PAGE_SIZE) {
    const key = normalizeCategory(category);
    if (key === 'all' || !categoryIndex[key]) return ensurePage(page, perPage);
    const total = getCategoryTotal(key);
    const pageNumber = Math.max(1, Math.min(Math.ceil(total / perPage), Number(page) || 1));
    const end = Math.min(total, pageNumber * perPage);
    let state = categoryStates.get(key);
    if (!state) {
      state = { records: [], scanned: 0 };
      categoryStates.set(key, state);
    }
    const chunkList = categoryIndex[key].chunks || [];
    while (state.records.length < end && state.scanned < chunkList.length) {
      const chunkIndex = chunkList[state.scanned++];
      const chunkRecords = await fetchPage(chunkIndex);
      state.records.push(...chunkRecords.filter(product => normalizeCategory(product.category) === key));
    }
    // Include newly added authoritative records that are not yet present in the
    // generated lazy chunks, while avoiding duplicate IDs already in the chunk data.
    if (state.scanned >= chunkList.length && authority.records.length) {
      const knownIds = new Set(state.records.map(product => Number(product && product.id)));
      for (const product of authority.records) {
        if (normalizeCategory(product.category) === key && !knownIds.has(Number(product.id))) {
          state.records.push(product);
          knownIds.add(Number(product.id));
        }
      }
    }
    const start = (pageNumber - 1) * perPage;
    const records = state.records.slice(start, start + perPage);
    setTarget(records);
    document.dispatchEvent(new CustomEvent('bondsmall-category-page-loaded', { detail: { category: key, page: pageNumber, records, total } }));
    return records;
  }

  window.BondsmallCatalog = {
    totalCount: TOTAL_RECORDS,
    chunkSize: PAGE_SIZE,
    pageSize: PAGE_SIZE,
    partCount: PAGE_COUNT,
    totalPages: PAGE_COUNT,
    loadedChunks: loaded,
    loadChunk: (index) => fetchPage(index),
    loadThrough: (index) => fetchPage(index),
    ensurePage,
    ensureCategoryPage,
    getCategoryTotal,
    getProductById(productId) {
      const id = Number(productId);
      if (!Number.isFinite(id) || id < 1 || id > TOTAL_RECORDS) return Promise.resolve(null);
      return fetchPage(Math.floor((id - 1) / PAGE_SIZE)).then((records) => records.find((product) => Number(product.id) === id) || null);
    },
    hydrateFirstChunk: () => fetchPage(0),
    getAuthoritativeRecords: () => authority.records.slice(),
  };

  // Preserve the synchronous first-page experience. On direct later-page URLs,
  // do not hydrate page 1 asynchronously because that would overwrite the
  // requested page after its own chunk has loaded.
  // Snapshot the authoritative records before any lazy chunk can replace them.
  if (authority.records.length) setTarget(authority.records);

  const initialParams = new URLSearchParams(window.location.search);
  const initialPage = Math.max(1, Number(initialParams.get('page')) || 1);
  const initialCategory = String(initialParams.get('category') || '').trim();
  if (target.length > 0) {
      loaded.set(0, preferAuthoritative(target.slice(0, PAGE_SIZE)));
    window.BondsmallCatalogReady = true;
    document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    // Category requests own the shared target array. Do not asynchronously restore
    // bootstrap page 1 afterward, or the category grid will collapse back to the
    // few matching records present in the bootstrap chunk.
    if (initialPage === 1 && !initialCategory) {
      const hydrate = () => fetchPage(0).catch((error) => console.warn('Catalog page hydration failed:', error));
      if ('requestIdleCallback' in window) requestIdleCallback(hydrate, { timeout: 2000 });
      else setTimeout(hydrate, 1000);
    }
  } else {
    fetchPage(0).then(() => {
      window.BondsmallCatalogReady = true;
      document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    }).catch((error) => {
      console.warn('Catalog first page load failed:', error);
      window.BondsmallCatalogReady = true;
      document.dispatchEvent(new CustomEvent('bondsmall-catalog-ready'));
    });
  }
})();
