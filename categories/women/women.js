/* Women's category module configuration. */
(() => { 'use strict'; window.BondsmallCategoryModules = window.BondsmallCategoryModules || {}; window.BondsmallCategoryModules['women'] = { key: 'women', selector: '[data-category-feature="women"]', productsSelector: '[data-category-preview-products="women"]', moreHref: 'search-results.html?category=women',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    } }; })();
