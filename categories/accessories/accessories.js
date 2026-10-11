/* Accessories category module. Loaded with its matching HTML and CSS. */
(() => {
  'use strict';
  window.BondsmallCategoryModules = window.BondsmallCategoryModules || {};
  window.BondsmallCategoryModules['accessories'] = {
    key: 'accessories', selector: '[data-category-feature="accessories"]',
    productsSelector: '[data-category-preview-products="accessories"]',
    moreHref: 'search-results.html?category=accessories',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    }
  };
})();
