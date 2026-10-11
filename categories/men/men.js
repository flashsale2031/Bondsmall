/* Men's category module configuration. */
(() => { 'use strict'; window.BondsmallCategoryModules = window.BondsmallCategoryModules || {}; window.BondsmallCategoryModules['men'] = { key: 'men', selector: '[data-category-feature="men"]', productsSelector: '[data-category-preview-products="men"]', moreHref: 'search-results.html?category=men',
    // Fail closed if the shared gallery validator has not initialized yet.
    isEligibleProduct(product) {
      return typeof window.BondsmallHasAppropriateGallery === 'function' &&
        window.BondsmallHasAppropriateGallery(product);
    } }; })();
