(() => {
    "use strict";

    // Public display helpers only; browser-side rates are not a security boundary.
    const promotionRates = Object.freeze({
        SAVE10: 0.10,
        MALL15: 0.15,
        BONDS20: 0.20,
        PRESIDENTBONDS: 1
    });
    const newCustomerOffer = Object.freeze({ code: "NEW_CUSTOMER_25", rate: 0.25 });

    function normalizeCode(value) {
        return String(value || "").trim().toUpperCase();
    }

    function rateForCode(value) {
        const code = normalizeCode(value);
        return Object.prototype.hasOwnProperty.call(promotionRates, code)
            ? promotionRates[code]
            : 0;
    }

    function codeForRate(value) {
        const rate = Number(value);
        return Object.keys(promotionRates).find((code) => promotionRates[code] === rate) || "";
    }

    function preOwnedPrice(product, options = {}) {
        const id = Number(product && product.id);
        const suppliedOverride = Number(options.overridePrice);
        if (Number.isFinite(suppliedOverride) && suppliedOverride > 0) return suppliedOverride;
        if (id === 28) return 3749.99;

        const explicit = Number(product && (product["pre-owned price"] || product.preOwnedPrice));
        if (Number.isFinite(explicit) && explicit > 0) return explicit;

        const sourcePrice = options.basePrice ?? (product && (
            product.price || product["sale price"] || product.salePrice
        ));
        const base = Number(sourcePrice) || 0;
        return Math.round(base * 0.8 * 100) / 100;
    }

    window.BondsDiscounts = Object.freeze({
        promotionRates,
        newCustomerOffer,
        normalizeCode,
        rateForCode,
        codeForRate,
        preOwnedPrice
    });
})();
