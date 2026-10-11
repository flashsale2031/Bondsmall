/* Jewelry category module. Loaded with its matching HTML and CSS. */
(() => {
  'use strict';
  window.BondsmallCategoryModules = window.BondsmallCategoryModules || {};
  window.BondsmallCategoryModules['jewelry'] = {
    key: 'jewelry', selector: '[data-category-feature="jewelry"]',
    productsSelector: '[data-category-preview-products="jewelry"]',
    moreHref: 'search-results.html?category=jewelry',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    }
  };
})();
