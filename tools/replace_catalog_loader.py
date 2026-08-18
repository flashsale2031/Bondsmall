from pathlib import Path

path = Path('/home/ubuntu/Bondsmall/seller.html')
html = path.read_text(encoding='utf-8')
start = html.index('    async function loadProducts() {')
end = html.index('    function getConditionClass', start)
new = r'''    let catalogManifest = null;
    let catalogPage = 1;
    let catalogPageCache = new Map();
    let catalogUsesPages = false;

    async function loadCatalogManifest() {
      try {
        const res = await fetch('catalog-pages/manifest.json?t=' + Date.now(), { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const manifest = await res.json();
        if (Number(manifest.totalRecords) > 0 && Number(manifest.pageCount) > 0) return manifest;
      } catch (e) { console.warn('Catalog manifest unavailable:', e.message); }
      return null;
    }

    async function loadCatalogPage(page = 1) {
      if (!catalogManifest) return false;
      page = Math.max(1, Math.min(Number(page) || 1, Number(catalogManifest.pageCount)));
      if (catalogPageCache.has(page)) {
        allProducts = catalogPageCache.get(page);
        catalogPage = page;
        return true;
      }
      const filename = `products-page-${String(page).padStart(5, '0')}.js`;
      try {
        const res = await fetch(`catalog-pages/${filename}?t=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const source = await res.text();
        const start = source.indexOf('window.products.push(...[');
        const end = source.lastIndexOf(']);');
        if (start < 0 || end <= start) throw new Error('Invalid catalog chunk');
        const jsonStart = source.indexOf('[', start);
        const pageProducts = JSON.parse(source.slice(jsonStart, end + 1));
        catalogPageCache.set(page, pageProducts);
        allProducts = pageProducts;
        catalogPage = page;
        return true;
      } catch (e) {
        console.warn(`Failed to load catalog page ${page}:`, e.message);
        return false;
      }
    }

    function renderCatalogPager() {
      const html = catalogUsesPages && catalogManifest ? `<div class="catalog-pager-summary">Showing page ${catalogPage.toLocaleString()} of ${Number(catalogManifest.pageCount).toLocaleString()} · ${Number(catalogManifest.totalRecords).toLocaleString()} Bonds Mall products</div><div class="catalog-pager-actions"><button class="btn-secondary" onclick="goCatalogPage(${catalogPage - 1})" ${catalogPage <= 1 ? 'disabled' : ''}>‹ Previous</button><span>Page ${catalogPage.toLocaleString()} / ${Number(catalogManifest.pageCount).toLocaleString()}</span><button class="btn-secondary" onclick="goCatalogPage(${catalogPage + 1})" ${catalogPage >= Number(catalogManifest.pageCount) ? 'disabled' : ''}>Next ›</button></div>` : '';
      ['products-catalog-pager', 'post-products-catalog-pager'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
    }

    async function goCatalogPage(page) {
      if (!catalogUsesPages || !catalogManifest) return;
      const ok = await loadCatalogPage(page);
      if (!ok) { showToast('Could not load that catalog page.', 'error'); return; }
      renderProducts();
      buildPostProductList();
      renderCatalogPager();
    }

    async function loadProducts() {
      catalogManifest = await loadCatalogManifest();
      if (catalogManifest) {
        catalogUsesPages = true;
        await loadCatalogPage(1);
        renderCatalogPager();
        return;
      }

      let loaded = false;
      if (serverOnline) {
        try {
          const res = await fetch(SERVER + '/products', { signal: AbortSignal.timeout(6000) });
          if (res.ok) { const data = await res.json(); if (data.length > 0) { allProducts = data; loaded = true; } }
        } catch (e) { console.warn('Failed to fetch products from server:', e.message); }
      }
      if (!loaded) {
        try {
          const res = await fetch('products.json?t=' + Date.now(), { signal: AbortSignal.timeout(3000) });
          if (res.ok) { const data = await res.json(); if (data.length > 0) { allProducts = data; loaded = true; } }
        } catch (e) { console.warn('Failed to fetch products.json:', e.message); }
      }
      if (!loaded && typeof products !== 'undefined') {
        allProducts = products.map(p => ({ title: p.name || p.title, description: p.description || '', price: p.price || 0, category: normalizePjsCategory(p.category), condition: 'new', zip_code: '90210', delivery_available: true, photo_paths: p.images || (p.image ? [p.image] : []) }));
      }
      allProducts.sort((a, b) => (a.title || a.name || '').toLowerCase().localeCompare((b.title || b.name || '').toLowerCase()));
    }

'''
path.write_text(html[:start] + new + html[end:], encoding='utf-8')
print('replaced catalog loader')
