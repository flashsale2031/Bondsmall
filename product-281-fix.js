(() => {
  'use strict';
  const PRODUCT_ID = 281;
  const IMAGES = [
    'assets/prada-cleo-black/front-retailer.webp',
    'assets/prada-cleo-black/left-angle-retailer.webp',
    'assets/prada-cleo-black/right-side.webp',
    'assets/prada-cleo-black/back.webp',
    'assets/prada-cleo-black/overhead-interior.webp'
  ];
  const referenceSources = [
    'https://www.prada.com/ww/en/p/prada-cleo-brushed-leather-shoulder-bag/1BC499_ZO6_F0002_V_OOO',
    'https://www.farfetch.com/shopping/women/prada-cleo-brushed-leather-shoulder-bag-item-16175632.aspx',
    'https://www.prada.cn/cn/en/p/prada-cleo-brushed-leather-shoulder-bag/1BC499_ZO6_F0002_V_OOO',
    'https://www.saksfifthavenue.com/product/prada-cleobrushed-leather-shoulder-bag-0400098957024.html'
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
      photo_display: 'Front, left side, right side, back, and overhead interior',
      photo_source: 'Two retailer-sourced product views plus three Bonds Mall generated supplemental views based on the official Prada Cleo model references.',
      photo_year: null,
      photo_is_representative: false,
      image_quality_status: 'Five-view local WebP gallery: two sourced retailer views and three generated supplemental views',
      image_note: 'The front and left-angle views are sourced product photography. The right-side, back, and overhead/interior views are generated from the verified Prada Cleo silhouette, brushed calfskin, hardware, lining, dimensions, and construction references; they are clearly supplemental and not represented as official Prada photographs.',
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
  window.BondsmallProduct281Images = Object.freeze(IMAGES.slice());
})();
