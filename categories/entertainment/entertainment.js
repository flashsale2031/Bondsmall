/* Entertainment category module. Loaded with its matching HTML and CSS. */
(() => {
  'use strict';
  window.BondsmallCategoryModules = window.BondsmallCategoryModules || {};
  window.BondsmallCategoryModules['entertainment'] = {
    key: 'entertainment', selector: '[data-category-feature="entertainment"]',
    productsSelector: '[data-category-preview-products="entertainment"]',
    moreHref: 'search-results.html?category=entertainment',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    }
  };
})();
