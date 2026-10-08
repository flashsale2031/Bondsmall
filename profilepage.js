(() => {
    'use strict';

    const GUEST_PROFILE_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#f2f2f2'/><circle cx='50' cy='34' r='19' fill='#111'/><path d='M17 91c3-22 16-34 33-34s30 12 33 34' fill='#111'/></svg>"
    );

    const profileKey = (value) => String(value || 'guest').trim().toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-') || 'guest';
    const queryUser = new URLSearchParams(window.location.search).get('user') || 'guest';
    const wantedKey = profileKey(queryUser);

    function allReviews() {
        return window.BondsMallReviews && typeof window.BondsMallReviews.getAll === 'function'
            ? window.BondsMallReviews.getAll()
            : [];
    }

    function authorForReview(review) {
        return review && review.author ? review.author : { profileId: 'guest', username: 'Guest', picture: '' };
    }

    function isAuthor(review) {
        const author = authorForReview(review);
        return profileKey(author.profileId || author.username) === wantedKey;
    }

    function loadProfile() {
        let current = null;
        try { current = JSON.parse(localStorage.getItem('fc_profile') || 'null'); } catch (_) { current = null; }
        const matchingReviews = allReviews().filter(isAuthor);
        const reviewAuthor = matchingReviews.map(authorForReview).find((author) => author.username || author.picture) || null;
        const isGuest = wantedKey === 'guest';
        return {
            profileId: wantedKey,
            username: reviewAuthor?.username || (isGuest ? 'Guest' : queryUser),
            picture: reviewAuthor?.picture || (isGuest ? '' : current && profileKey(current.username || current.name) === wantedKey ? current.picture : ''),
            reviews: matchingReviews
        };
    }

    function productBelongsToProfile(product, profile) {
        const candidates = [
            product?.sellerProfileId,
            product?.seller_profile_id,
            product?.sellerUsername,
            product?.seller_username,
            product?.ownerProfileId,
            product?.ownerUsername,
            product?.profileId,
            product?.username,
            product?.seller?.profileId,
            product?.seller?.username,
            product?.owner?.profileId,
            product?.owner?.username
        ];
        if (candidates.some((value) => profileKey(value) === profile.profileId)) return true;
        const declaredIds = profile.reviews.flatMap((review) => {
            const author = authorForReview(review);
            return Array.isArray(author.productIds) ? author.productIds : [];
        }).map(String);
        return declaredIds.includes(String(product?.id));
    }

    function formatMoney(value) {
        const number = Number(value);
        return Number.isFinite(number)
            ? `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '';
    }

    function renderProfile(profile) {
        const reviews = profile.reviews;
        const average = reviews.length
            ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
            : 0;
        const picture = document.getElementById('profile-page-picture');
        picture.src = profile.picture || GUEST_PROFILE_IMAGE;
        picture.alt = `${profile.username} profile picture`;
        picture.onerror = () => {
            picture.onerror = null;
            picture.src = GUEST_PROFILE_IMAGE;
        };
        document.getElementById('profile-page-username').textContent = profile.username;
        document.getElementById('profile-page-rating').textContent = average ? `${average.toFixed(1)} / 5` : 'No rating yet';
        document.getElementById('profile-page-rating-stars').textContent = average
            ? '★'.repeat(Math.round(average)) + '☆'.repeat(5 - Math.round(average))
            : '☆☆☆☆☆';
        document.getElementById('profile-page-rating-count').textContent = `${reviews.length} customer review${reviews.length === 1 ? '' : 's'}`;
        document.title = `${profile.username} - BONDS MALL`;

        const products = Array.isArray(window.products)
            ? window.products.filter((product) => productBelongsToProfile(product, profile))
            : [];
        const list = document.getElementById('profile-products');
        list.innerHTML = '';
        if (!products.length) {
            const empty = document.createElement('p');
            empty.className = 'profile-empty';
            empty.textContent = 'No products listed for sale yet.';
            list.appendChild(empty);
            return;
        }
        products.forEach((product) => {
            const link = document.createElement('a');
            link.className = 'profile-product-card';
            link.href = `index.html?product=${encodeURIComponent(product.id)}`;
            const image = document.createElement('img');
            image.src = product.image || (Array.isArray(product.images) ? product.images[0] : '') || 'bonds-mall-logo.png';
            image.alt = product.name || 'Product';
            image.loading = 'lazy';
            image.onerror = () => { image.onerror = null; image.src = 'bonds-mall-logo.png'; };
            const copy = document.createElement('div');
            copy.className = 'profile-product-copy';
            const name = document.createElement('h3');
            name.textContent = product.name || 'Product';
            const price = document.createElement('p');
            price.textContent = formatMoney(product['sale price'] ?? product.salePrice ?? product.price ?? product['retail price']);
            copy.append(name, price);
            link.append(image, copy);
            list.appendChild(link);
        });
    }

    function init() {
        renderProfile(loadProfile());
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
