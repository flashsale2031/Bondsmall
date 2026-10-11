/* Art & Collectibles category module. Loaded with its matching HTML and CSS. */
(() => {
  'use strict';
  window.BondsmallCategoryModules = window.BondsmallCategoryModules || {};
  window.BondsmallCategoryModules['artandcollectibles'] = {
    key: 'artandcollectibles', selector: '[data-category-feature="artandcollectibles"]',
    productsSelector: '[data-category-preview-products="artandcollectibles"]',
    moreHref: 'search-results.html?category=artandcollectibles',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    }
  };
})();
