/* Bonds Mall shared product-card renderer and resilient image rotation/loading. */
(() => {
    'use strict';

    const FRONT_DELAY_MS = 10000;
    const BACK_DISPLAY_MS = 5000;
    const IMAGE_TIMEOUT_MS = 4500;
    const EXTERNAL_PLACEHOLDER_IMAGE = 'https://placehold.co/640x640/f7f4ee/75695f?text=Image+unavailable';
    const INLINE_SAFETY_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" fill="#f7f4ee"/><path d="M220 280h200v80H220z" fill="#d8cfc3"/><text x="320" y="410" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#75695f">Image unavailable</text></svg>'
    );

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    function uniqueImages(values) {
        return [...new Set((values || []).filter(Boolean).map(String))];
    }

    function imageList(product) {
        const values = [];
        if (product && Array.isArray(product.images)) values.push(...product.images);
        if (product && product.image) values.unshift(product.image);
        if (product && product.mainImage) values.unshift(product.mainImage);
        if (product && Array.isArray(product.photo_paths)) values.push(...product.photo_paths);
        if (product && Array.isArray(product.photos)) values.push(...product.photos);
        if (product && Array.isArray(product.image_urls)) values.push(...product.image_urls);
        return uniqueImages(values);
    }

    function getFrontCandidates(product, options = {}) {
        const images = imageList(product);
        return uniqueImages([
            options.frontImage,
            product?.image,
            product?.mainImage,
            images[0],
            ...images,
            product?.thumbnail,
            product?.thumbnailUrl,
            product?.image_url,
            product?.photo_url,
            ...(Array.isArray(options.frontFallbacks) ? options.frontFallbacks : [])
        ]);
    }

    function getBackCandidates(product, options = {}) {
        const images = imageList(product);
        return uniqueImages([
            options.backImage,
            images[3],
            images[1],
            ...(Array.isArray(options.backFallbacks) ? options.backFallbacks : []),
            getFrontCandidates(product, options)[0]
        ]);
    }

    function getFrontImage(product, options = {}) {
        return getFrontCandidates(product, options)[0] || 'bonds-mall-logo.png';
    }

    function getBackImage(product, options = {}) {
        return getBackCandidates(product, options)[0] || getFrontImage(product, options);
    }

    function serializedCandidates(candidates) {
        return escapeHtml(JSON.stringify(uniqueImages(candidates)));
    }

    function render(product, options = {}) {
        const id = Number(product?.id);
        const name = escapeHtml(product?.name || product?.title || 'Product');
        const frontCandidates = getFrontCandidates(product, options);
        const backCandidates = getBackCandidates(product, options);
        const front = frontCandidates[0] || 'bonds-mall-logo.png';
        const back = backCandidates[0] || front;
        const hasDistinctBack = back !== front;
        const isFavorite = Boolean(options.isFavorite);
        const loading = options.loading || 'lazy';
        const fetchPriority = options.fetchPriority || 'auto';
        const retailPrice = options.retailPrice ?? '';
        const salePrice = options.salePrice ?? '';
        const luxuryBadge = options.luxuryBadgeHTML || '';

        return `<article class="product-card" data-product-id="${escapeHtml(id)}">
    <div class="product-info">
        <div class="product-image-wrap"${hasDistinctBack ? ` data-front-image="${escapeHtml(front)}" data-back-image="${escapeHtml(back)}" data-front-candidates="${serializedCandidates(frontCandidates)}" data-back-candidates="${serializedCandidates(backCandidates)}"` : ` data-front-candidates="${serializedCandidates(frontCandidates)}"`}>
            <img class="product-image" src="${escapeHtml(front)}" alt="${name}" width="640" height="640" loading="${escapeHtml(loading)}" fetchpriority="${escapeHtml(fetchPriority)}" decoding="async" referrerpolicy="no-referrer" data-action="open-modal" data-id="${escapeHtml(id)}">
            <button class="share-btn" data-action="share-product" data-id="${escapeHtml(id)}" aria-label="Share ${name}">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="13.49"/></svg>
            </button>
            <button class="fav-btn ${isFavorite ? 'is-active' : ''}" data-action="fav-product" data-id="${escapeHtml(id)}" aria-label="${isFavorite ? 'Remove' : 'Add'} ${name} ${isFavorite ? 'from' : 'to'} favorites" aria-pressed="${isFavorite ? 'true' : 'false'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isFavorite ? '#8c2f39' : 'none'}" stroke="${isFavorite ? '#8c2f39' : 'currentColor'}" stroke-width="2.3" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            ${luxuryBadge}
        </div>
        <h3 class="product-name" data-action="open-modal" data-id="${escapeHtml(id)}">${name}</h3>
        <div class="product-price-row">
            <span class="retail-price">${retailPrice}</span>
            <span class="sale-price">${salePrice}</span>
        </div>
        <button class="add-btn" data-action="add-cart" data-id="${escapeHtml(id)}">Add to Cart</button>
    </div>
</article>`;
    }

    function parseCandidates(value, fallback) {
        try {
            const parsed = JSON.parse(value || '[]');
            return uniqueImages(parsed).length ? uniqueImages(parsed) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function loadImageCandidates(image, candidates) {
        if (!image) return;
        const sources = uniqueImages(candidates);
        const token = (image._productCardLoadToken || 0) + 1;
        image._productCardLoadToken = token;
        let index = 0;
        let timer = null;

        const clearTimer = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        };
        const tryNext = () => {
            if (image._productCardLoadToken !== token) return;
            clearTimer();
            if (index >= sources.length) {
                image.dataset.cardImageFallback = 'external-placeholder';
                image.onerror = () => {
                    image.onerror = null;
                    image.src = INLINE_SAFETY_IMAGE;
                    image.dataset.cardImageFallback = 'inline-safety';
                };
                image.src = EXTERNAL_PLACEHOLDER_IMAGE;
                return;
            }
            const source = sources[index++];
            image.dataset.cardImageSource = source;
            image.src = source;
            timer = setTimeout(() => {
                if (!image.complete || image.naturalWidth === 0) tryNext();
            }, IMAGE_TIMEOUT_MS);
        };
        image.onload = () => {
            if (image._productCardLoadToken !== token) return;
            clearTimer();
            image.dataset.cardImageFallback = 'loaded';
        };
        image.onerror = tryNext;
        tryNext();
    }

    function wireImage(imageWrap) {
        if (!imageWrap) return;
        const image = imageWrap.querySelector('.product-image');
        if (!image || image._productCardWired) return;
        image._productCardWired = true;
        const frontCandidates = parseCandidates(imageWrap.dataset.frontCandidates, [imageWrap.dataset.frontImage, image.src]);
        loadImageCandidates(image, frontCandidates);
    }

    function scheduleRotation(imageWrap) {
        if (!imageWrap || imageWrap._productCardRotation) return;
        const image = imageWrap.querySelector('.product-image');
        const front = imageWrap.dataset.frontImage;
        const back = imageWrap.dataset.backImage;
        if (!image || !front || !back || front === back) return;
        wireImage(imageWrap);

        const state = { stopped: false, timer: null };
        const stopIfDetached = () => {
            if (!image.isConnected || !imageWrap.isConnected) {
                state.stopped = true;
                if (state.timer) clearTimeout(state.timer);
                imageWrap._productCardRotation = null;
                return true;
            }
            return false;
        };
        const showFront = () => {
            if (state.stopped || stopIfDetached()) return;
            loadImageCandidates(image, parseCandidates(imageWrap.dataset.frontCandidates, [front]));
            image.dataset.cardImageSide = 'front';
            state.timer = setTimeout(showBack, FRONT_DELAY_MS);
        };
        const showBack = () => {
            if (state.stopped || stopIfDetached()) return;
            loadImageCandidates(image, parseCandidates(imageWrap.dataset.backCandidates, [back]));
            image.dataset.cardImageSide = 'back';
            state.timer = setTimeout(showFront, BACK_DISPLAY_MS);
        };
        imageWrap._productCardRotation = state;
        state.timer = setTimeout(showBack, FRONT_DELAY_MS);
    }

    function initRotators(root = document) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        root.querySelectorAll('.product-image-wrap[data-front-candidates]').forEach(wireImage);
        root.querySelectorAll('.product-image-wrap[data-front-image][data-back-image]').forEach(scheduleRotation);
    }

    window.BondsMallProductCard = Object.freeze({
        render,
        initRotators,
        getFrontImage,
        getBackImage,
        loadImageCandidates
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initRotators(), { once: true });
    } else {
        initRotators();
    }
})();
