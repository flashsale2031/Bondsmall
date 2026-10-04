/* Product 109 gallery and legacy-ID migration.
 * Keeps the requested 2020 Liberty reference on product 109 and moves the
 * former UGG Boots record from 345 to 376 during catalog hydration.
 */
(() => {
  'use strict';
  const source = Array.isArray(window.products) ? window.products : [];
  const coin = source.find(p => Number(p && p.id) === 109);
  const liberty2015 = source.find(p => Number(p && p.id) === 104);
  if (liberty2015) {
    liberty2015.image = 'https://fmrgold.com/wp-content/uploads/2025/07/id10077310chlm7pXVIGvhy27-Qbl1Z-nhpKPE9qc9bBGY_kYAnxufcPYBeyext-300x300.jpg';
    liberty2015.images = [
      'https://fmrgold.com/wp-content/uploads/2025/07/id10077310chlm7pXVIGvhy27-Qbl1Z-nhpKPE9qc9bBGY_kYAnxufcPYBeyext-300x300.jpg',
      'https://fmrgold.com/wp-content/uploads/2025/07/id10077173chp9Ql4cZMay3NlIqWQFHL8mkyHyL4AGYXx7vMsX3z5MYs1aejext-300x300.jpg',
      'https://fmrgold.com/wp-content/uploads/2025/07/id10077173chp9Ql4cZMay3NlIqWQFHL8mkyHyL4AGYXx7vMsX3z5MYs1aejext-1-300x300.jpg'
    ];
  }
  if (coin) {
    coin.image = 'assets/gold-coins/109/view-01.svg?v=20261003-7';
    coin.images = [1,2,3,4,5].map(v => 'assets/gold-coins/109/view-' + String(v).padStart(2,'0') + '.svg?v=20261003-7');
    coin.photo_source = 'eBay reference supplied for Product 109; Bonds Mall local white-background generated gallery';
    coin.photo_is_representative = true;
    coin.image_note = 'Bonds Mall local white-background generated gallery based on the supplied 2020 Liberty reference; runtime does not depend on external image hosts.';
    coin.image_quality_status = 'Local Bonds Mall generated 2020 Liberty asset';
  }
  const moveUgg = records => {
    if (!Array.isArray(records)) return;
    const old = records.find(p => Number(p && p.id) === 345 && /UGG Boots/i.test(String(p.name || '')));
    if (old) {
      old.id = 376;
      old.listing_status = 'Moved from legacy product ID 345 to product ID 376.';
    }
  };
  moveUgg(window.products);
  document.addEventListener('bondsmall-catalog-chunk-loaded', e => {
    moveUgg(e.detail && e.detail.records);
    if (Array.isArray(window.products)) moveUgg(window.products);
  });
  document.addEventListener('bondsmall-catalog-ready', () => moveUgg(window.products));
  window.BondsmallProduct109Migration = { moveUgg };
})();