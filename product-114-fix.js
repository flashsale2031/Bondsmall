(() => {
  'use strict';
  const PRODUCT_ID = 114;
  const IMAGES = [
    'assets/gold-coins/114/front-obverse.webp',
    'assets/gold-coins/114/left-oblique.webp',
    'assets/gold-coins/114/right-oblique.webp',
    'assets/gold-coins/114/back-reverse.webp',
    'assets/gold-coins/114/overhead-presentation.webp'
  ];
  const referenceSources = [
    'https://www.usmint.gov/learn/coins-and-medals/collectible-coins/american-liberty/2025-high-relief-gold-coin',
    'https://www.apmex.com/product/318944/2025-w-high-relief-american-liberty-gold-proof-box-coa',
    'https://www.rinkorrarecoins.com/item/2025-w-1oz-american-liberty-gold-high-relief-proof-box-and-coa/1GHR2025',
    'https://www.jmbullion.com/2025-w-1-oz-proof-american-liberty-high-relief-gold-coin-pcgs-pr70-dcam/'
  ];

  const patch = product => {
    if (!product || Number(product.id) !== PRODUCT_ID) return product;
    return {
      ...product,
      image: IMAGES[0],
      images: IMAGES.slice(),
      image_views: {
        front_main: 'images[0]',
        left_side: 'images[1]',
        right_side: 'images[2]',
        back: 'images[3]',
        overhead: 'images[4]'
      },
      photo_display: 'Front, left side, right side, back, and overhead presentation',
      photo_source: 'Official U.S. Mint 2025 obverse/reverse product photos plus three Bonds Mall generated supplemental views based on the verified coin and packaging references.',
      photo_year: 2025,
      photo_is_representative: false,
      image_quality_status: 'Five-view local WebP gallery: two verified U.S. Mint photos and three generated supplemental views',
      image_note: 'Front/obverse and back/reverse are verified U.S. Mint product photos. Left/right oblique and overhead presentation views are generated from the verified designs and dealer packaging references; they are clearly supplemental and not represented as official Mint photographs.',
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
