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

    function isPlaceholderImage(value) {
        const src = String(value || '').trim();
        if (!src) return true;
        const normalized = src.toLowerCase();
        if (/placeholder|place-holder|no[-_ ]?image|missing[-_ ]?image|default[-_ ]?product|coming[-_ ]?soon|fallback|dummyimage|placehold\\.co|placeholder\\.com|via\\.placeholder|bonds-mall-logo/i.test(normalized)) return true;
        // Legacy coin gallery files are registered generated placeholder views,
        // even though their URLs resemble normal image assets (for example #62).
        if (/\\/assets\\/gold-coins\\/\\d+\\/view-\\d+\\.(?:webp|svg)(?:[?#].*)?$/i.test(normalized)) return true;
        return Object.values(fallbackImages).some((fallback) => src === fallback);
    }

    function collectImageValues(value) {
        if (Array.isArray(value)) return value.flatMap(collectImageValues);
        if (value && typeof value === 'object') return Object.values(value).flatMap(collectImageValues);
        return typeof value === 'string' ? [value] : [];
    }

    function imageCandidates(product) {
        const values = [product?.image, product?.mainImage, product?.main_image, product?.images, product?.photo_paths, product?.image_views]
            .flatMap(collectImageValues);
        return [...new Set(values.map((value) => value.trim()).filter((value) => value && !isPlaceholderImage(value)))];
    }

    function productHasPlaceholderPhoto(product) {
        const values = [product?.image, product?.mainImage, product?.main_image, product?.images, product?.photo_paths, product?.image_views]
            .flatMap(collectImageValues);
        return values.some((value) => isPlaceholderImage(value));
    }

    function productImage(product) {
        const primary = Array.isArray(product?.image) ? product.image[0] : (product?.image || product?.mainImage || product?.main_image);
        return !isPlaceholderImage(primary) ? String(primary).trim() : '';
    }

    function hasRealMainImage(product) {
        // Fail closed: a real-looking main image is insufficient if any gallery
        // photo is registered as a placeholder.
        return Boolean(productImage(product)) && !productHasPlaceholderPhoto(product);
    }

    function imageForCategory(category) {
        const key = normalize(category);
        const products = Array.isArray(window.products) ? window.products : [];
        const match = products.find((product) => normalize(product.category) === key && hasRealMainImage(product));
        return match ? productImage(match) : '';
    }

    function money(value) {
        const number = Number(value);
        return Number.isFinite(number) ? `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    }

    const failedPreviewImages = new Map();

    function productListForCategory(key) {
        const products = Array.isArray(window.products) ? window.products : [];
        return products.filter((product) => normalize(product.category) === key && hasRealMainImage(product));
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function renderPreviewProducts(key, records) {
        const container = document.querySelector(`[data-category-preview-products="${key}"]`);
        if (!container) return;
        const failed = failedPreviewImages.get(key) || new Set();
        const eligible = (records || productListForCategory(key)).filter((product) =>
            hasRealMainImage(product) && !failed.has(String(product.id))
        );
        const products = eligible.slice(0, 3);
        if (!products.length) {
            container.innerHTML = '<p class="category-preview-empty">More products are being checked for real product images.</p>';
            return;
        }
        container.innerHTML = products.map((product) => {
            const name = String(product.name || product.title || 'Product');
            const image = productImage(product);
            const price = product['sale price'] ?? product.salePrice ?? product.price;
            return `<a class="category-preview-card" href="./?product=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(name)}">
                <img class="category-preview-image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" data-preview-product-id="${escapeHtml(product.id)}">
                <span class="category-preview-copy"><span class="category-preview-name">${escapeHtml(name)}</span><span class="category-preview-price">${money(price)}</span></span>
            </a>`;
        }).join('');
        container.querySelectorAll('img[data-preview-product-id]').forEach((img) => {
            img.addEventListener('error', () => {
                const failedIds = failedPreviewImages.get(key) || new Set();
                failedIds.add(img.dataset.previewProductId);
                failedPreviewImages.set(key, failedIds);
                // Re-select from the full loaded candidate set; never substitute a placeholder.
                renderPreviewProducts(key, eligible);
            }, { once: true });
        });
    }

    async function hydrateCategoryPreviews() {
        const keys = [...document.querySelectorAll('[data-category-preview-products]')].map((el) => el.dataset.categoryPreviewProducts);
        if (!keys.length) return;
        const initialProducts = Array.isArray(window.products) ? window.products.slice() : [];
        const catalog = window.BondsmallCatalog;
        if (catalog && typeof catalog.ensureCategoryPage === 'function') {
            // The catalog loader temporarily swaps window.products while fetching a chunk.
            // Load previews sequentially so concurrent category requests cannot overwrite one another.
            for (const key of keys) {
                try {
                    const records = await catalog.ensureCategoryPage(key, 1, 30);
                    renderPreviewProducts(key, records);
                } catch (_) {
                    renderPreviewProducts(key);
                }
            }
            // Preview requests can leave the shared catalog array empty while the main
            // all-products grid is initializing. Re-establish page one explicitly, then
            // ask bondsmall.js to render against the restored catalog state.
            if (typeof catalog.ensurePage === 'function') {
                await catalog.ensurePage(1, 20);
            } else if (Array.isArray(window.products) && initialProducts.length) {
                window.products.length = 0;
                window.products.push(...initialProducts);
            }
            document.dispatchEvent(new CustomEvent('bondsmall-catalog-page-ready'));
        } else {
            keys.forEach((key) => renderPreviewProducts(key));
        }
    }

    function hydrateCards() {
        const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');
        document.querySelectorAll('[data-category-image]').forEach((image) => {
            const key = image.dataset.categoryImage;
            const featuredArtProduct = (Array.isArray(window.products) ? window.products : []).find((product) => Number(product.id) === 49);
            const imageOverride = isIndexPage && key === 'artandcollectibles' && featuredArtProduct
                ? productImage(featuredArtProduct)
                : (isIndexPage && key === 'accessories'
                    ? 'assets/category-gucci-savoy-large-duffle.webp'
                    : (isIndexPage && key === 'men'
                        ? 'assets/category-ferrari-mens-jacket.webp'
                        : (isIndexPage && key === 'women' ? 'assets/category-womens-bailey-bow-ii-ugg-boots.webp' : null)));
            image.src = imageOverride || imageForCategory(key);
            if (!image.src || image.src === window.location.href) image.removeAttribute('src');
            image.onerror = () => {
                image.onerror = null;
                image.removeAttribute('src');
            };
        });
        document.querySelectorAll('.category-hover-icon').forEach((icon) => {
            const key = icon.closest('[data-category]')?.dataset.category;
            icon.innerHTML = icons[key] || icons.accessories;
        });
    }

    let initialized = false;
    function init() {
        if (initialized) return;
        const root = document.getElementById('category-showcase');
        if (root && !root.querySelector('[data-category-feature]')) return;
        initialized = true;
        hydrateCards();
        hydrateCategoryPreviews();
        document.addEventListener('bondsmall-catalog-chunk-loaded', () => {
            hydrateCards();
        });
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('bondsmall-category-components-ready', () => {
        document.getElementById('category-showcase')?.querySelector('.category-components-loading')?.remove();
        if (!initialized) init();
        else {
            hydrateCards();
            hydrateCategoryPreviews();
        }
    });
})();
