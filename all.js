(() => {
    'use strict';

    const fallbackImages = {
        accessories: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=900&q=82',
        artandcollectibles: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=82',
        electronics: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=82',
        entertainment: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=82',
        homeandappliances: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=82',
        jewelry: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=82',
        men: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=900&q=82',
        women: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=82'
    };

    const icons = {
        accessories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l2 12H4L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
        artandcollectibles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="1.4"/><path d="m5 17 4-4 3 3 2-2 5 4"/></svg>',
        electronics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg>',
        entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8h10a4 4 0 0 1 3.8 5.2l-1.1 3.5a2 2 0 0 1-3.7.4L15 15H9l-1 2.1a2 2 0 0 1-3.7-.4l-1.1-3.5A4 4 0 0 1 7 8Z"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/></svg>',
        homeandappliances: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>',
        jewelry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 3 5-3 13L9 8l3-5Z"/><path d="M3 8h18M5 8l7 13 7-13"/></svg>',
        men: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 4-2 4 2 3 5-3 2v9H8v-9l-3-2 3-5Z"/><path d="M9 5h6M12 7v12"/></svg>',
        women: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 6 4 12H4L8 9l1-6Z"/><path d="M9 3h6M8 9h8"/></svg>'
    };

    function normalize(value) {
        return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    }

    function imageForCategory(category) {
        const key = normalize(category);
        const products = Array.isArray(window.products) ? window.products : [];
        const match = products.find((product) => normalize(product.category) === key && (product.image || (product.images && product.images[0])));
        if (match) return match.image || match.images[0];
        return fallbackImages[key] || 'bonds-mall-logo.png';
    }

    function hydrateCards() {
        document.querySelectorAll('[data-category-image]').forEach((image) => {
            const key = image.dataset.categoryImage;
            image.src = imageForCategory(key);
            image.onerror = () => {
                image.onerror = null;
                image.src = fallbackImages[key] || 'bonds-mall-logo.png';
            };
        });
        document.querySelectorAll('.category-hover-icon').forEach((icon) => {
            const key = icon.closest('[data-category]')?.dataset.category;
            icon.innerHTML = icons[key] || icons.accessories;
        });
    }

    function init() {
        hydrateCards();
        document.addEventListener('bondsmall-catalog-chunk-loaded', hydrateCards);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
