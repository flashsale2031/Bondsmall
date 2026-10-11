/* Home & Appliances category module. Loaded with its matching HTML and CSS. */
(() => {
  'use strict';
  window.BondsmallCategoryModules = window.BondsmallCategoryModules || {};
  window.BondsmallCategoryModules['homeandappliances'] = {
    key: 'homeandappliances', selector: '[data-category-feature="homeandappliances"]',
    productsSelector: '[data-category-preview-products="homeandappliances"]',
    moreHref: 'search-results.html?category=homeandappliances',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    }
  };
})();
