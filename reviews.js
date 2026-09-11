(function () {
    "use strict";

    const STORAGE_KEY = "bonds_mall_reviews";
    let reviewRecords = [];

    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        reviewRecords = Array.isArray(stored) ? stored : [];
    } catch (_) {
        reviewRecords = [];
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewRecords));
        } catch (_) {
            // Keep the in-memory array usable when storage is unavailable.
        }
    }

    window.BondsMallReviews = {
        getAll() {
            return reviewRecords.slice();
        },
        getForProduct(productId) {
            return reviewRecords.filter((review) => String(review.productId) === String(productId));
        },
        replaceForProduct(productId, reviews) {
            const id = String(productId);
            reviewRecords = reviewRecords.filter((review) => String(review.productId) !== id)
                .concat((Array.isArray(reviews) ? reviews : []).map((review) => ({
                    ...review,
                    productId: id
                })));
            persist();
        },
        add(productId, review) {
            reviewRecords.push({ ...review, productId: String(productId) });
            persist();
        }
    };
})();
