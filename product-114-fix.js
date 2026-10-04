(() => {
  'use strict';
  const PRODUCT_ID = 114;
  const LOCAL_BASE = 'assets/gold-coins/114/';
  const IMAGES = [1, 2, 3, 4, 5].map(n => LOCAL_BASE + 'view-' + String(n).padStart(2, '0') + '.svg?v=20261003-3');
  const referenceSources = [
    'https://www.usmint.gov/learn/coins-and-medals/collectible-coins/american-liberty/2025-high-relief-gold-coin',
    'https://www.apmex.com/product/318944/2025-w-high-relief-american-liberty-gold-proof-box-coa',
    'https://www.bgasc.com/product/2025-w-1-oz-proof-american-liberty-high-relief-gold-coin',
    'https://www.jmbullion.com/2025-w-1-oz-proof-american-liberty-high-relief-gold-coin/'
  ];

  const patch = product => {
    if (!product || Number(product.id) !== PRODUCT_ID) return product;
    return {
      ...product,
      image: IMAGES[0],
      images: IMAGES.slice(),
      image_views: {
        front_main: IMAGES[0],
        left_side: IMAGES[2],
        right_side: IMAGES[3],
        back: IMAGES[1],
        case_photo: IMAGES[4]
      },
      photo_source: 'Bonds Mall generated white-background gallery, based on the verified U.S. Mint 2025 design and dealer packaging/view references.',
      photo_year: 2025,
      photo_is_representative: false,
      image_quality_status: 'Local Bonds Mall generated asset',
      image_note: 'Main obverse is a generated white-background product image. Additional angles and case presentation are generated from the verified design and packaging references; the storefront does not depend on photo URL links or placeholders.',
      image_reference_sources: referenceSources
    };
  };

  function patchCollections() {
    if (Array.isArray(window.products)) window.products = window.products.map(patch);
    const authority = window.BondsmallCatalogAuthority;
    if (authority && Array.isArray(authority.records)) {
      const records = authority.records.map(patch);
      const byId = new Map(records.map(p => [Number(p.id), p]));
      window.BondsmallCatalogAuthority = Object.freeze({
        ...authority,
        records: Object.freeze(records),
        get(id) { return byId.get(Number(id)) || null; }
      });
    }
  }

  patchCollections();
  document.addEventListener('bondsmall-catalog-chunk-loaded', event => {
    if (Array.isArray(event.detail?.records)) event.detail.records.forEach(p => {
      if (Number(p?.id) === PRODUCT_ID) Object.assign(p, patch(p));
    });
    patchCollections();
  });
  document.addEventListener('bondsmall-catalog-page-ready', patchCollections);
  document.addEventListener('bondsmall-category-page-loaded', patchCollections);
  window.BondsmallProduct114Images = Object.freeze(IMAGES.slice());
})();