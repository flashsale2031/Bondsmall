/**
 * search-results.js
 * Logic for the Search Results page (search-results.html)
 */
(() => {
    /* ── Constants ────────────────────────────── */
    const categoryLabels = {
        all:               "Shop All",
        accessories:       "Accessories",
        artandcollectibles:"Art & Collectibles",
        electronics:       "Electronics",
        entertainment:     "Entertainment",
        homeandappliances: "Home & Appliances",
        jewelry:           "Jewelry",
        men:               "Men's",
        women:             "Women's"
    };

    const discountCodes = { SAVE10: 0.1, MALL15: 0.15, BONDS20: 0.2 };
    const taxRate = 0.087;

    /* ── State ────────────────────────────────── */
    let currentQuery    = "";
    let currentCategory = "all";
    let currentSort     = "default";
    let priceMin        = null;
    let priceMax        = null;
    let cart            = [];
    let activeModalProductId = null;
    let activeDiscountRate   = 0;
    let activePaymentMethod  = "credit";
    let shippingData         = null;
    let currentBrand         = "";
    let currentCondition     = "";
    let selectedDeals         = [];
    let currentPage          = 1;

    /* ── DOM References ───────────────────────── */
    const searchInput   = document.getElementById("sr-search");
    const filterBar     = document.getElementById("sr-filter-bar");
    const queryBadge    = document.getElementById("sr-query-badge");
    const resultsCount  = document.getElementById("sr-results-count");
    const resultsTitle  = document.getElementById("sr-results-title");
    const resultsGrid   = document.getElementById("sr-product-grid");

    const filterBtn     = document.getElementById("sr-filter-btn");
    const filterDrop    = document.getElementById("sr-filter-drop");
    const sortBtn       = document.getElementById("sr-sort-btn");
    const sortDrop      = document.getElementById("sr-sort-drop");
    const minPriceInput = document.getElementById("sr-min-price");
    const maxPriceInput = document.getElementById("sr-max-price");
    const applyPriceBtn = document.getElementById("sr-apply-price");

    const cartBtn       = document.getElementById("sr-cart-btn");
    const cartCount     = document.getElementById("sr-cart-count");
    const cartOverlay   = document.getElementById("cart-overlay");
    const cartBackdrop  = document.getElementById("cart-backdrop");
    const closeCartBtn  = document.getElementById("close-cart");
    const cartItems     = document.getElementById("cart-items");
    const cartSummary   = document.getElementById("cart-summary");
    const cartTotal     = document.getElementById("cart-total");

    const checkoutSteps   = document.getElementById("checkout-steps");
    const shippingSection = document.getElementById("shipping-section");
    const paymentSection  = document.getElementById("payment-section");
    const discountSection = document.getElementById("discount-section");
    const toShippingBtn   = document.getElementById("to-shipping");
    const shippingForm    = document.getElementById("shipping-form");
    const paymentForm     = document.getElementById("payment-form");
    const applyDiscountBtn = document.getElementById("apply-discount");
    const payNowBtn        = document.getElementById("pay-now");
    const backToCartBtn    = document.getElementById("back-to-cart");
    const taxTotalEl       = document.getElementById("tax-total");
    const finalTotalEl     = document.getElementById("final-total");
    const discountCodeInput = document.getElementById("discount-code");
    const cardNameInput     = document.getElementById("card-name");
    const cardNumberInput   = document.getElementById("card-number");
    const cardExpiryInput   = document.getElementById("card-expiry");
    const cardCvvInput      = document.getElementById("card-cvv");
    const cardFields        = document.getElementById("card-fields");
    const paymentFeedback   = document.getElementById("payment-feedback");

    const productModal   = document.getElementById("product-modal");
    const popupBackBtn   = document.getElementById("popup-back-btn");
    const modalAddBtn    = document.getElementById("modal-add-btn");
    const popupCartBtn   = document.getElementById("popup-cart-btn");
    const popupAccountBtn = document.getElementById("popup-account-btn");
    const popupHeaderSearch = document.getElementById("popup-header-search");
    const popupSearchResults = document.getElementById("popup-search-results");

    const accountBtn     = document.getElementById("account-btn");
    const accountOverlay = document.getElementById("account-overlay");
    const accountBackdrop = document.getElementById("account-backdrop");
    const closeAccountBtn = document.getElementById("close-account");
    const accountFrame   = document.getElementById("account-frame");
    const accountTabSignin = document.getElementById("account-tab-signin");
    const accountTabSignup = document.getElementById("account-tab-signup");
    const accountStatus  = document.getElementById("account-status");
    const accountDebug   = document.getElementById("account-debug");

    const warmedHosts    = new Set();
    const preloadedImages = new Set();
    const accountSessionKey = "fc_account_session";
    const accountProfileKey = "fc_profile";
    const accountCredentialKey = "fc_account_credential";
    const googleClientId = window.FC_GOOGLE_CLIENT_ID || localStorage.getItem("fc_google_client_id") || "";
    let accountManager = null;

    /* ── Utility ──────────────────────────────── */
    function formatMoney(v) {
        return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function normalize(t) { return (t || "").toLowerCase().trim(); }

    function digitsOnly(v) { return (v || "").replace(/\D/g, ""); }

    function optimizeGridImageUrl(rawUrl) {
        if (!rawUrl) return "";
        try {
            const url = new URL(rawUrl);
            const host = url.hostname.toLowerCase();
            if (host.includes("unsplash.com")) {
                url.searchParams.set("auto", "format");
                url.searchParams.set("fit", "crop");
                url.searchParams.set("w", "640");
                url.searchParams.set("q", "72");
                return url.toString();
            }
            if (host.includes("scene7.com") || host.includes("macysassets.com") || host.includes("target.com")) {
                url.searchParams.set("wid", "640");
                return url.toString();
            }
        } catch (_) {}
        return rawUrl;
    }

    function warmupImageHost(imageUrl) {
        if (!imageUrl) return;
        try {
            const { origin } = new URL(imageUrl);
            if (!origin || warmedHosts.has(origin)) return;
            warmedHosts.add(origin);
            const link = document.createElement("link");
            link.rel = "dns-prefetch";
            link.href = origin;
            document.head.appendChild(link);
        } catch (_) {}
    }

    /* ── Read URL params ──────────────────────── */
    function readUrlParams() {
        const params = new URLSearchParams(window.location.search);
        currentQuery    = params.get("q") || "";
        currentCategory = params.get("category") || "all";
        if (searchInput) searchInput.value = currentQuery;
    }

    function writeUrlParams() {
        const url = new URL(window.location.href);
        if (currentQuery)        url.searchParams.set("q", currentQuery);
        else                     url.searchParams.delete("q");
        if (currentCategory !== "all") url.searchParams.set("category", currentCategory);
        else                     url.searchParams.delete("category");
        window.history.replaceState({}, "", cleanUrl(url.toString()));
    }

    /* ── Product Decoration for Brand, Condition, Deals ── */
    function decorateProducts() {
        if (typeof window.products === "undefined") return;
        if (window.products._decorated) return;
        const knownBrands = [
            "Hanes", "Abercrombie & Fitch", "Abercrombie", "Dolce & Gabbana", "Levi", 
            "Ralph Lauren", "Louis Vuitton", "Columbia", "Apple", "Ferrari", 
            "Yves Saint Laurent", "Gucci", "Nike", "Adidas", "The Northface", 
            "The North Face", "Prada", "Michael Kors", "GE", "Nintendo", "Sony", 
            "Hermes", "Fendi", "Hamilton Beach", "Samsung"
        ];

        products.forEach(p => {
            p.salePrice = p["sale price"] || p.price || 0;
            p.price     = p.salePrice; // ensure p.price always has a usable number

            // 1. Inferred Brand
            if (!p.brand) {
                const specBrand = p.specifications && p.specifications.brand && p.specifications.brand.trim();
                if (specBrand) {
                    p.brand = specBrand;
                } else {
                    const foundBrand = knownBrands.find(b => p.name.toLowerCase().includes(b.toLowerCase()));
                    if (foundBrand) {
                        p.brand = foundBrand;
                    } else {
                        const firstWord = p.name.split(" ")[0].replace(/[^a-zA-Z]/g, "");
                        p.brand = firstWord || "Bonds Mall";
                    }
                }
            }

            // 2. Inferred Condition
            if (!p.condition) {
                if (p.description && (p.description.toLowerCase().includes("excellent") || p.description.toLowerCase().includes("refurbished"))) {
                    p.condition = "Refurbished";
                } else if (p.id % 2 === 0) {
                    p.condition = "New";
                } else {
                    p.condition = "Pre-Owned";
                }
            }

            // 3. Inferred Deals
            if (typeof p.discount !== "number") {
                if (p.id % 7 === 0) {
                    p.discount = 25;
                } else if (p.id % 6 === 0) {
                    p.discount = 20;
                } else if (p.id % 5 === 0) {
                    p.discount = 15;
                } else if (p.id % 4 === 0) {
                    p.discount = 10;
                } else {
                    p.discount = 0;
                }
            }
        });
        window.products._decorated = true;
    }

    function populateBrandDropdown(filteredList = products) {
        const brandSelect = document.getElementById("sr-brand-select");
        if (!brandSelect) return;
        
        const countMap = {};
        filteredList.forEach(p => {
            if (p.brand) countMap[p.brand] = (countMap[p.brand] || 0) + 1;
        });
        
        const sortedBrands = Object.entries(countMap).sort((a, b) => a[0].localeCompare(b[0]));
        
        // Reset currentBrand if it is no longer valid in the filtered results
        if (currentBrand && !countMap[currentBrand]) {
            currentBrand = "";
        }
        
        brandSelect.innerHTML = '<option value="">All Brands</option>';
        sortedBrands.forEach(([value, count]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = `${value} (${count} Product${count > 1 ? "s" : ""})`;
            option.selected = (value === currentBrand);
            brandSelect.appendChild(option);
        });
    }

    function populateConditionDropdown(filteredList = products) {
        const conditionSelect = document.getElementById("sr-condition-select");
        if (!conditionSelect) return;
        
        const countMap = {};
        filteredList.forEach(p => {
            if (p.condition) countMap[p.condition] = (countMap[p.condition] || 0) + 1;
        });
        
        const sortedConditions = Object.entries(countMap).sort((a, b) => a[0].localeCompare(b[0]));
        
        // Reset currentCondition if it is no longer valid in the filtered results
        if (currentCondition && !countMap[currentCondition]) {
            currentCondition = "";
        }
        
        conditionSelect.innerHTML = '<option value="">All Conditions</option>';
        sortedConditions.forEach(([value, count]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = `${value} (${count} Product${count > 1 ? "s" : ""})`;
            option.selected = (value === currentCondition);
            conditionSelect.appendChild(option);
        });
    }

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem("fc_favorites") || "[]");
        } catch (_) {
            return [];
        }
    }

    function toggleFavorite(productId) {
        const id = Number(productId);
        let favs = getFavorites();
        if (favs.includes(id)) {
            favs = favs.filter(fId => fId !== id);
        } else {
            favs.push(id);
        }
        localStorage.setItem("fc_favorites", JSON.stringify(favs));
        updateFavoritesUI();
    }

    function updateFavoritesUI() {
        const favs = getFavorites();
        
        // 1. Update the heart icons on the product cards
        document.querySelectorAll(".fav-btn").forEach(btn => {
            const id = Number(btn.dataset.id);
            const isFav = favs.includes(id);
            btn.classList.toggle("is-active", isFav);
            const svg = btn.querySelector("svg");
            if (svg) {
                svg.setAttribute("fill", isFav ? "#8c2f39" : "none");
                svg.setAttribute("stroke", isFav ? "#8c2f39" : "currentColor");
            }
        });

        // 2. Render the Favorites list in the account drawer
        const favListEl = document.getElementById("account-favorites-list");
        if (favListEl) {
            if (favs.length === 0) {
                favListEl.innerHTML = '<p class="favorites-empty" style="font-size: 0.82rem; color: #665f57; margin: 0; font-style: italic;">Your favorite list is empty.</p>';
            } else {
                const favProducts = products.filter(p => favs.includes(p.id));
                if (favProducts.length === 0) {
                    favListEl.innerHTML = '<p class="favorites-empty" style="font-size: 0.82rem; color: #665f57; margin: 0; font-style: italic;">Your favorite list is empty.</p>';
                } else {
                    favListEl.innerHTML = favProducts.map(p => `
                        <div class="fav-item" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.45rem; border: 1px solid #eadfce; border-radius: 8px; background: #fff; margin-bottom: 0.5rem;">
                            <img src="${p.image}" alt="${p.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; cursor: pointer;" onclick="window.BondsMallOpenProductById(${p.id})">
                            <div style="flex: 1; min-width: 0; cursor: pointer;" onclick="window.BondsMallOpenProductById(${p.id})">
                                <div style="font-size: 0.82rem; font-weight: 700; color: #1c1b1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                                <div style="font-size: 0.78rem; font-weight: 800; color: #1f7a46; margin-top: 0.1rem;">$${Number(p.price).toFixed(2)}</div>
                            </div>
                            <button data-action="remove-fav" data-id="${p.id}" style="background: none; border: none; color: #665f57; cursor: pointer; padding: 0.2rem; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;" aria-label="Remove favorite">
                                &#x2715;
                            </button>
                        </div>
                    `).join("");
                }
            }
        }
    }

    function getBaseFilteredProducts(excludeBrand = false, excludeCondition = false) {
        if (typeof window.products === "undefined") return [];
        return products.filter(p => {
            const inCat = currentCategory === "all" || p.category === currentCategory;
            const hay   = `${p.name} ${p.description || ""} ${categoryLabels[p.category] || p.category} ${p.brand || ""} ${p.condition || ""}`.toLowerCase();
            const passQ = !currentQuery || hay.includes(normalize(currentQuery));
            const overMin = priceMin === null || p.price >= priceMin;
            const underMax = priceMax === null || p.price <= priceMax;
            
            // Brand filter
            const passBrand = excludeBrand || !currentBrand || p.brand === currentBrand;
            
            // Condition filter
            const passCondition = excludeCondition || !currentCondition || p.condition === currentCondition;
            
            // Deals filter
            const passDeals = selectedDeals.length === 0 || 
                (typeof p.discount === "number" && selectedDeals.includes(p.discount.toString()));
                
            return inCat && passQ && overMin && underMax && passBrand && passCondition && passDeals;
        });
    }

    function getFilteredProducts() {
        if (typeof window.products === "undefined") return [];
        let list = products.filter(p => {
            const inCat = currentCategory === "all" || p.category === currentCategory;
            const hay   = `${p.name} ${p.description || ""} ${categoryLabels[p.category] || p.category} ${p.brand || ""} ${p.condition || ""}`.toLowerCase();
            const passQ = !currentQuery || hay.includes(normalize(currentQuery));
            const overMin = priceMin === null || p.price >= priceMin;
            const underMax = priceMax === null || p.price <= priceMax;
            
            // Brand filter
            const passBrand = !currentBrand || p.brand === currentBrand;
            
            // Condition filter
            const passCondition = !currentCondition || p.condition === currentCondition;
            
            // Deals filter
            const passDeals = selectedDeals.length === 0 || 
                (typeof p.discount === "number" && selectedDeals.includes(p.discount.toString()));
                
            return inCat && passQ && overMin && underMax && passBrand && passCondition && passDeals;
        });

        switch (currentSort) {
            case "price-asc":  list.sort((a, b) => a.price - b.price); break;
            case "price-desc": list.sort((a, b) => b.price - a.price); break;
            case "top-sellers": list.sort((a, b) => b.id - a.id); break;
            case "highest-rated": list.sort((a, b) => b.price - a.price); break;
        }
        return list;
    }

    /* ── Render products ──────────────────────── */
    function renderResultsHeader() {
        // Query badge
        const hasBadge = currentQuery || currentCategory !== "all";
        if (queryBadge) {
            if (hasBadge) {
                const label = currentQuery
                    ? `"${currentQuery}"${currentCategory !== "all" ? ` in ${categoryLabels[currentCategory]}` : ""}`
                    : categoryLabels[currentCategory] || currentCategory;
                queryBadge.innerHTML = `
                    <span>${label}</span>
                    <button class="sr-query-badge-clear" id="sr-clear-badge" aria-label="Clear filter" title="Clear">&#x2715;</button>
                `;
                queryBadge.style.display = "";
            } else {
                queryBadge.style.display = "none";
            }
        }

        // Results title
        const filtered = getFilteredProducts();
        const count    = filtered.length;
        if (resultsTitle) {
            resultsTitle.textContent = hasBadge
                ? (currentQuery ? `Results for "${currentQuery}"` : `${categoryLabels[currentCategory] || currentCategory}`)
                : "All Products";
        }
        if (resultsCount) {
            let text = "";
            if (currentQuery) {
                text = `${count} ${count === 1 ? "product matches" : "products match"} the keywords "${currentQuery}"`;
            } else if (currentCategory !== "all") {
                text = `${count} ${count === 1 ? "product matches" : "products match"} the category "${categoryLabels[currentCategory] || currentCategory}"`;
            } else {
                text = `Showing all ${count} product${count !== 1 ? "s" : ""}`;
            }
            resultsCount.textContent = text;
        }

        // Bind clear button
        const clearBtn = document.getElementById("sr-clear-badge");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                currentQuery    = "";
                currentCategory = "all";
                currentBrand    = "";
                currentCondition = "";
                selectedDeals   = [];
                priceMin        = null;
                priceMax        = null;
                if (searchInput) searchInput.value = "";
                
                // Reset select dropdown values
                const brandSelect = document.getElementById("sr-brand-select");
                if (brandSelect) brandSelect.value = "";
                const conditionSelect = document.getElementById("sr-condition-select");
                if (conditionSelect) conditionSelect.value = "";
                
                // Uncheck all deals checkboxes
                document.querySelectorAll(".sr-deal-checkbox").forEach(chk => chk.checked = false);
                
                // Clear min-max inputs
                if (minPriceInput) minPriceInput.value = "";
                if (maxPriceInput) maxPriceInput.value = "";

                writeUrlParams();
                renderAll();
            });
        }
    }

    function cleanUrl(urlStr) {
        if (!urlStr) return "";
        try {
            if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
                const url = new URL(urlStr);
                if (url.hostname.includes("bondsmall.com") || url.hostname === window.location.hostname) {
                    url.pathname = url.pathname.replace(/\.html$/, "");
                    return url.toString();
                }
                return urlStr;
            }
            return urlStr.replace(/\.html(\?|#|$)/, "$1").replace(/\.html$/, "");
        } catch (_) {
            return urlStr.replace(/\.html(\?|#|$)/, "$1").replace(/\.html$/, "");
        }
    }

    function getFooterHTML() {
        return `
<footer class="site-footer">
    <div class="site-footer-top">
        <div class="site-footer-brand-wrap">
            <div class="site-footer-brand">BONDS MALL</div>
            <p class="site-footer-tagline">Premium shopping with secure checkout and live customer support.</p>
        </div>
        <div class="site-footer-stickers" aria-label="Trust stickers">
            <span class="sticker">Secure Payments</span>
            <span class="sticker">24/7 Support</span>
            <span class="sticker">Verified Store</span>
        </div>
    </div>
    <nav class="site-footer-menu" aria-label="Footer menu">
        <a href="customer-service.html"><span class="footer-icon" aria-hidden="true">CS</span>Customer Service</a>
        <a href="faq.html"><span class="footer-icon" aria-hidden="true">FQ</span>FAQ</a>
        <a href="dispute-center.html"><span class="footer-icon" aria-hidden="true">DC</span>Dispute Center</a>
        <a href="careers.html"><span class="footer-icon" aria-hidden="true">CR</span>Careers</a>
        <a href="partner.html"><span class="footer-icon" aria-hidden="true">PT</span>Partner</a>
        <a href="affiliate.html"><span class="footer-icon" aria-hidden="true">AF</span>Affiliate</a>
        <a href="link-bank-account.html"><span class="footer-icon" aria-hidden="true">BK</span>Link Bank Account</a>
        <a href="profile.html"><span class="footer-icon" aria-hidden="true">PR</span>Profile</a>
        <a href="order-history.html"><span class="footer-icon" aria-hidden="true">OH</span>Order History</a>
        <a href="track-order.html"><span class="footer-icon" aria-hidden="true">TM</span>Track Order</a>
        <a href="rewards.html"><span class="footer-icon" aria-hidden="true">RW</span>Rewards</a>
        <a href="recentorders.html"><span class="footer-icon" aria-hidden="true">RO</span>Recent Orders</a>
    </nav>
</footer>`;
    }

    /* ── Pagination helpers ────────────────────── */
    function getProductsPerPage() {
        return window.innerWidth <= 600 ? 20 : 21;
    }

    function renderSRPagination(totalItems) {
        const paginationEl = document.getElementById("sr-pagination");
        if (!paginationEl) return;
        const perPage = getProductsPerPage();
        const totalPages = Math.ceil(totalItems / perPage);
        if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }

        let html = "";

        html += `<button class="pg-btn pg-nav${currentPage <= 1 ? " pg-disabled" : ""}" data-pg-action="first">First</button>`;
        html += `<button class="pg-btn pg-nav${currentPage <= 1 ? " pg-disabled" : ""}" data-pg-action="prev">Prev</button>`;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                html += `<button class="pg-btn${i === currentPage ? " pg-active" : ""}" data-pg-num="${i}">${i}</button>`;
            }
        } else {
            html += `<button class="pg-btn${1 === currentPage ? " pg-active" : ""}" data-pg-num="1">1</button>`;
            if (currentPage > 4) html += `<span class="pg-btn pg-ellipsis">…</span>`;
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                html += `<button class="pg-btn${i === currentPage ? " pg-active" : ""}" data-pg-num="${i}">${i}</button>`;
            }
            if (currentPage < totalPages - 3) html += `<span class="pg-btn pg-ellipsis">…</span>`;
            html += `<button class="pg-btn${totalPages === currentPage ? " pg-active" : ""}" data-pg-num="${totalPages}">${totalPages}</button>`;
        }

        html += `<button class="pg-btn pg-nav${currentPage >= totalPages ? " pg-disabled" : ""}" data-pg-action="next">Next</button>`;
        html += `<button class="pg-btn pg-nav${currentPage >= totalPages ? " pg-disabled" : ""}" data-pg-action="last" data-pg-total="${totalPages}">Last</button>`;
        html += `<span class="pg-goto-wrap">Go to: <input type="number" class="pg-goto-input" min="1" max="${totalPages}" placeholder="#" aria-label="Go to page"></span>`;

        paginationEl.innerHTML = html;
    }

    function goToPage(page) {
        const filtered = getFilteredProducts();
        const perPage = getProductsPerPage();
        const totalPages = Math.ceil(filtered.length / perPage);
        const target = Math.max(1, Math.min(totalPages, page));
        if (target === currentPage) return;
        currentPage = target;
        renderProducts();
        renderResultsHeader();
        if (resultsGrid) resultsGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderProducts() {
        if (!resultsGrid) return;
        const filtered = getFilteredProducts();
        if (filtered.length === 0) {
            resultsGrid.innerHTML = `
                <div class="sr-empty-state">
                    <h2>No products found</h2>
                    <p>Try a different search term or browse all categories.</p>
                    <a href="index" class="sr-empty-browse-btn">Back to Store</a>
                </div>
            `;
            const paginationEl = document.getElementById("sr-pagination");
            if (paginationEl) paginationEl.innerHTML = "";
            return;
        }

        // Paginate
        const perPage = getProductsPerPage();
        const totalPages = Math.ceil(filtered.length / perPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const startIdx = (currentPage - 1) * perPage;
        const pageProducts = filtered.slice(startIdx, startIdx + perPage);

        pageProducts.slice(0, 12).forEach(p => warmupImageHost(optimizeGridImageUrl(p.image)));

        const luxuryBrands = ["dolce & gabbana", "louis vuitton", "yves saint laurent", "gucci", "prada", "hermes", "fendi", "chanel", "dior", "abercrombie & fitch", "bathing ape", "bathing apes", "michael kors", "rolex", "patek philippe", "marc jacobs", "us mint"];

        resultsGrid.innerHTML = pageProducts.map((product, index) => {
            const imgSrc = optimizeGridImageUrl(product.image);
            const favs = getFavorites();
            const isFav = favs.includes(product.id);
            const isLuxury = luxuryBrands.some(brand => (product.name || "").toLowerCase().includes(brand));
            const luxuryBadgeHTML = isLuxury ? `
                <span class="luxury-badge" style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 2; background: #ffffff; color: #1c1b1a; border: 1px solid #d0c9be; font-size: 0.62rem; font-weight: 800; padding: 0.28rem 0.55rem; border-radius: 6px; white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; pointer-events: none; letter-spacing: 0.03em; display: inline-flex; align-items: center; gap: 4px;">
                    <svg style="width: 10px; height: 10px; flex-shrink: 0;" fill="#1c1b1a" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    Authenticity Guaranteed
                </span>
            ` : '';

            return `
            <article class="product-card">
                <div class="product-info">
                    <div class="product-image-wrap" style="position: relative; margin: -0.9rem -0.9rem 0.8rem -0.9rem; overflow: hidden; border-top-left-radius: 13px; border-top-right-radius: 13px;">
                        <img class="product-image" src="${imgSrc}" alt="${product.name}"
                              width="640" height="640"
                              loading="${index < 8 ? "eager" : "lazy"}"
                              fetchpriority="${index < 4 ? "high" : "auto"}"
                              decoding="async"
                              data-action="open-modal" data-id="${product.id}">
                        <button class="share-btn" data-action="share-product" data-id="${product.id}" aria-label="Share ${product.name}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                        </button>
                        <button class="fav-btn ${isFav ? "is-active" : ""}" data-action="fav-product" data-id="${product.id}" aria-label="Favorite ${product.name}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isFav ? "#8c2f39" : "none"}" stroke="${isFav ? "#8c2f39" : "currentColor"}" stroke-width="2.3" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>
                        ${luxuryBadgeHTML}
                    </div>
                    <h3 class="product-name" style="cursor: pointer;" data-action="open-modal" data-id="${product.id}">${product.name}</h3>
                    <div class="product-price-row" style="display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.3rem; flex-wrap: wrap;">
                        <span class="retail-price" style="text-decoration: line-through; color: var(--muted); font-size: 0.85rem;">${formatMoney(product["retail price"] || product.retailPrice || product.price * 1.1)}</span>
                        <span class="sale-price" style="color: var(--good, #1f7a46); font-weight: 800; font-size: 1rem;">${formatMoney(product["sale price"] || product.salePrice || product.price)}</span>
                    </div>
                    <button class="add-btn" data-action="add-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </article>`;
        }).join("");

        renderSRPagination(filtered.length);
    }

    function renderAll() {
        currentPage = 1;
        populateBrandDropdown(getBaseFilteredProducts(true, false));
        populateConditionDropdown(getBaseFilteredProducts(false, true));
        renderResultsHeader();
        renderProducts();
    }

    /* ── Sort dropdown ────────────────────────── */
    function updateSortDropdown() {
        if (!sortDrop) return;
        sortDrop.querySelectorAll(".sr-dropdown-item").forEach(item => {
            const isActive = item.dataset.sort === currentSort;
            item.classList.toggle("active", isActive);
        });
        const sortLabels = {
            "default":      "Sort",
            "price-asc":    "Price ↑",
            "price-desc":   "Price ↓",
            "top-sellers":  "Top Sellers",
            "highest-rated":"Highest Rated"
        };
        if (sortBtn) sortBtn.querySelector(".sr-sort-label").textContent = sortLabels[currentSort] || "Sort";
    }

    /* ── Filter dropdown: category items ─────── */
    function updateFilterDropdown() {
        if (!filterDrop) return;
        filterDrop.querySelectorAll(".sr-dropdown-item[data-filter-cat]").forEach(item => {
            item.classList.toggle("active", item.dataset.filterCat === currentCategory);
        });
    }

    /* ── Open / close dropdowns ──────────────── */
    let filterOpen = false;
    let sortOpen   = false;

    function openFilterDrop() {
        if (!filterDrop) return;
        closeSortDrop();
        filterDrop.hidden = false;
        filterOpen = true;
        filterBtn.classList.add("active");
        updateFilterDropdown();
    }

    function closeFilterDrop() {
        if (!filterDrop) return;
        filterDrop.hidden = true;
        filterOpen = false;
        if (filterBtn) filterBtn.classList.remove("active");
    }

    function openSortDrop() {
        if (!sortDrop) return;
        closeFilterDrop();
        sortDrop.hidden = false;
        sortOpen = true;
        sortBtn.classList.add("active");
        updateSortDropdown();
    }

    function closeSortDrop() {
        if (!sortDrop) return;
        sortDrop.hidden = true;
        sortOpen = false;
        if (sortBtn) sortBtn.classList.remove("active");
    }

    /* ── Cart ─────────────────────────────────── */
    function updateCartCount() {
        const count = cart.reduce((t, i) => t + i.quantity, 0);
        if (cartCount) cartCount.textContent = String(count);
        const popupCount = document.getElementById("popup-cart-count");
        if (popupCount) popupCount.textContent = String(count);
    }

    function subtotal() {
        return cart.reduce((s, i) => s + i.price * i.quantity, 0);
    }

    function updateCheckoutTotals() {
        const base = subtotal();
        const withTax   = base * (1 + taxRate);
        const finalTotal = withTax * (1 - activeDiscountRate);
        if (taxTotalEl)   taxTotalEl.textContent   = `Total with 8.7% tax: ${formatMoney(withTax)}`;
        if (finalTotalEl) finalTotalEl.textContent = `Final total: ${formatMoney(finalTotal)}`;
    }

    function renderCart() {
        if (!cartItems) return;
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-state">Your cart is empty</p>';
            if (cartSummary)   cartSummary.classList.add("hidden");
            if (checkoutSteps) checkoutSteps.classList.add("hidden");
            return;
        }
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <strong class="cart-item-title">${item.name}</strong>
                    <p class="cart-item-price">Unit: ${formatMoney(item.price)}</p>
                    <p class="cart-item-line-total">${formatMoney(item.price * item.quantity)}</p>
                    <div class="qty-row">
                        <button class="qty-btn" data-action="dec" data-id="${item.id}">-</button>
                        <span class="qty-count">${item.quantity}</span>
                        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
                    </div>
                </div>
            </div>`).join("");
        if (cartTotal) cartTotal.textContent = formatMoney(subtotal());
        if (cartSummary) cartSummary.classList.remove("hidden");
        updateCheckoutTotals();
    }

    function openCart() { if (cartOverlay) cartOverlay.classList.remove('hidden'); }
    function closeCart() { if (cartOverlay) cartOverlay.classList.add('hidden'); }

    function addToCart(productId, qty = 1, condition = "") {
        const product = (typeof products !== "undefined") ? products.find(p => p.id === Number(productId)) : null;
        if (!product) return;
        const amount = Math.min(999, Math.max(1, Math.floor(Number(qty) || 1)));
        const cond   = condition || "New";
        const existing = cart.find(i => i.id === product.id && (i.condition || "New") === cond);
        if (existing) { existing.quantity += amount; }
        else { cart.push({ ...product, quantity: amount, condition: cond }); }
        updateCartCount();
        renderCart();
        openCart();
    }

    function changeQuantity(productId, delta) {
        const item = cart.find(i => i.id === Number(productId));
        if (!item) return;
        item.quantity += delta;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== Number(productId));
        updateCartCount();
        renderCart();
    }

    /* ── Product modal ────────────────────────── */
    function openProductModal(productId) {
        const product = (window.products || []).find(p => p.id === Number(productId));
        if (!product || !productModal) return;
        activeModalProductId = product.id;
        if (typeof window.populateProductPopup === "function") {
            window.populateProductPopup(product, { categoryLabels });
        }
        clearPopupSearch();
        productModal.classList.remove("hidden");
        productModal.setAttribute("aria-hidden", "false");
        const url = new URL(window.location.href);
        url.searchParams.set("product", String(product.id));
        window.history.replaceState({}, "", cleanUrl(url.toString()));
    }
    window.BondsMallOpenProductById = openProductModal;

    function closeProductModal() {
        if (!productModal) return;
        productModal.classList.add("hidden");
        productModal.setAttribute("aria-hidden", "true");
        activeModalProductId = null;
        clearPopupSearch();
        const url = new URL(window.location.href);
        url.searchParams.delete("product");
        window.history.replaceState({}, "", cleanUrl(url.toString()));
    }

    /* ── Popup search ─────────────────────────── */
    function clearPopupSearch() {
        if (popupHeaderSearch) popupHeaderSearch.value = "";
        if (popupSearchResults) { popupSearchResults.hidden = true; popupSearchResults.innerHTML = ""; }
    }

    function renderPopupSearchResults() {
        if (!popupSearchResults || !popupHeaderSearch) return;
        const term = normalize(popupHeaderSearch.value);
        if (!term) { clearPopupSearch(); return; }
        const matched = (typeof products !== "undefined" ? products : []).filter(p => {
            const hay = `${p.name} ${p.description || ""} ${categoryLabels[p.category] || p.category}`.toLowerCase();
            return hay.includes(term);
        }).slice(0, 20);

        if (matched.length === 0) {
            popupSearchResults.innerHTML = '<p class="popup-search-no-results">No products found.</p>' + getFooterHTML();
            popupSearchResults.hidden = false;
            return;
        }
        popupSearchResults.innerHTML = matched.map(p => `
            <div class="popup-search-result-item" tabindex="0" role="button"
                 aria-label="View ${p.name}" data-popup-result-id="${p.id}">
                <img class="popup-search-result-img" src="${optimizeGridImageUrl(p.image)}" alt="" loading="lazy">
                <div class="popup-search-result-info">
                    <div class="popup-search-result-name">${p.name}</div>
                    <div class="popup-search-result-cat">${categoryLabels[p.category] || p.category}</div>
                </div>
                <div class="popup-search-result-price">${formatMoney(p.price)}</div>
            </div>`).join("") + getFooterHTML();
        popupSearchResults.hidden = false;
    }

    /* ── Payment helpers ──────────────────────── */
    function detectCardBrand(n) {
        if (!n) return "";
        if (/^4/.test(n)) return "Visa";
        if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(n)) return "Mastercard";
        if (/^3[47]/.test(n)) return "Amex";
        if (n.length >= 4) return "Unknown";
        return "";
    }

    function luhnValid(n) {
        let sum = 0, shouldDouble = false;
        for (let i = n.length - 1; i >= 0; i--) {
            let d = Number(n[i]);
            if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
            shouldDouble = !shouldDouble;
        }
        return n.length >= 13 && sum % 10 === 0;
    }

    function validateExpiry(v) {
        if (!/^\d{2}\/\d{2}$/.test(v)) return false;
        const [mm, yy] = v.split("/").map(Number);
        if (mm < 1 || mm > 12) return false;
        return new Date(2000 + yy, mm - 1) > new Date();
    }

    function markFieldError(field, hasError) {
        if (!field) return;
        field.classList.toggle("input-error", hasError);
    }

    function setPaymentMessage(msg, isSuccess) {
        if (!paymentFeedback) return;
        paymentFeedback.textContent = msg;
        paymentFeedback.classList.toggle("success", Boolean(isSuccess));
    }

    function validatePaymentForm() {
        let valid = true;
        setPaymentMessage("");
        const nameOk   = cardNameInput.value.trim().length >= 3;
        const cardNum  = digitsOnly(cardNumberInput.value);
        const cardOk   = luhnValid(cardNum);
        const brand    = detectCardBrand(cardNum);
        const expiryOk = validateExpiry(cardExpiryInput.value.trim());
        const cvvOk    = /^\d{3,4}$/.test(cardCvvInput.value.trim());
        markFieldError(cardNameInput, !nameOk);
        markFieldError(cardNumberInput, !cardOk);
        markFieldError(cardExpiryInput, !expiryOk);
        markFieldError(cardCvvInput, !cvvOk);
        if (!nameOk || !cardOk || !expiryOk || !cvvOk) {
            valid = false;
            setPaymentMessage("Check your card details: number, expiry, and CVV.");
        } else {
            setPaymentMessage(`${activePaymentMethod === "debit" ? "Debit" : "Credit"} card authenticated: ${brand || "Card"}.`, true);
        }
        return valid;
    }

    /* ── Account drawer ───────────────────────── */
    function initAccountManager() {
        if (typeof window.createAccountManager !== "function") return;
        accountManager = window.createAccountManager({
            accountBtn, accountOverlay, accountBackdrop, closeAccountBtn,
            accountFrame, accountTabSignin, accountTabSignup,
            accountStatus, accountDebug, googleClientId,
            accountSessionKey, accountProfileKey, accountCredentialKey
        });
    }

    function openAccountDrawer(view = "signin") {
        if (accountManager && accountManager.openAccountDrawer) accountManager.openAccountDrawer(view);
    }

    /* ── Bind all events ──────────────────────── */
    function bindEvents() {
        /* Header search → navigate */
        if (searchInput) {
            searchInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    currentQuery = searchInput.value.trim();
                    currentCategory = "all";
                    renderAll();
                    writeUrlParams();
                    if (window.CategoryMenu) window.CategoryMenu.markActive("all");
                }
            });
            searchInput.addEventListener("input", () => {
                // live filtering
                currentQuery = searchInput.value.trim();
                renderAll();
                writeUrlParams();
            });
        }

        /* Filter button toggle */
        if (filterBtn) {
            filterBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                filterOpen ? closeFilterDrop() : openFilterDrop();
            });
        }

        /* Sort button toggle */
        if (sortBtn) {
            sortBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                sortOpen ? closeSortDrop() : openSortDrop();
            });
        }

        /* Sort dropdown items */
        if (sortDrop) {
            sortDrop.addEventListener("click", (e) => {
                const item = e.target.closest(".sr-dropdown-item[data-sort]");
                if (!item) return;
                currentSort = item.dataset.sort;
                closeSortDrop();
                renderAll();
            });
        }

        /* Filter dropdown: category chips */
        if (filterDrop) {
            filterDrop.addEventListener("click", (e) => {
                const item = e.target.closest(".sr-dropdown-item[data-filter-cat]");
                if (!item) return;
                currentCategory = item.dataset.filterCat;
                writeUrlParams();
                closeFilterDrop();
                renderAll();
                if (window.CategoryMenu) window.CategoryMenu.markActive(currentCategory);
            });
        }

        /* Brand filter change */
        const brandSelect = document.getElementById("sr-brand-select");
        if (brandSelect) {
            brandSelect.addEventListener("change", () => {
                currentBrand = brandSelect.value;
                renderAll();
            });
        }

        /* Condition filter change */
        const conditionSelect = document.getElementById("sr-condition-select");
        if (conditionSelect) {
            conditionSelect.addEventListener("change", () => {
                currentCondition = conditionSelect.value;
                renderAll();
            });
        }

        /* Deals checkboxes change */
        const dealsContainer = document.querySelector(".sr-deals-row");
        if (dealsContainer) {
            dealsContainer.addEventListener("change", () => {
                const checked = [...dealsContainer.querySelectorAll(".sr-deal-checkbox:checked")];
                selectedDeals = checked.map(chk => chk.value);
                renderAll();
            });
        }

        /* Price apply */
        if (applyPriceBtn) {
            applyPriceBtn.addEventListener("click", () => {
                const mn = parseFloat(minPriceInput.value);
                const mx = parseFloat(maxPriceInput.value);
                priceMin = isNaN(mn) ? null : mn;
                priceMax = isNaN(mx) ? null : mx;
                closeFilterDrop();
                renderAll();
            });
        }

        /* Close dropdowns on outside click */
        document.addEventListener("click", (e) => {
            if (filterOpen && filterBtn && !filterBtn.parentElement.contains(e.target)) closeFilterDrop();
            if (sortOpen   && sortBtn   && !sortBtn.parentElement.contains(e.target))   closeSortDrop();
        });

        /* Results grid: product card actions */
        if (resultsGrid) {
            resultsGrid.addEventListener("click", (e) => {
                const target = e.target.closest("[data-action]");
                if (!target) return;
                const { action, id } = target.dataset;
                if (action === "open-modal") openProductModal(id);
                if (action === "add-cart")   addToCart(id);
                if (action === "fav-product") {
                    e.stopPropagation();
                    toggleFavorite(id);
                }
            });
        }

        /* Cart */
        if (cartBtn) cartBtn.addEventListener("click", openCart);
        if (popupCartBtn) popupCartBtn.addEventListener("click", openCart);
        if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
        if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

        if (cartItems) {
            cartItems.addEventListener("click", (e) => {
                const target = e.target.closest("[data-action]");
                if (!target) return;
                if (target.dataset.action === "inc") changeQuantity(target.dataset.id, 1);
                if (target.dataset.action === "dec") changeQuantity(target.dataset.id, -1);
            });
        }

        /* Checkout flow */
        if (toShippingBtn) {
            toShippingBtn.addEventListener("click", () => {
                if (cart.length > 0) {
                    checkoutSteps.classList.remove("hidden");
                    shippingSection.classList.remove("hidden");
                    paymentSection.classList.add("hidden");
                    discountSection.classList.add("hidden");
                    if (cartSummary) cartSummary.classList.add("hidden");
                }
            });
        }

        if (shippingForm) {
            shippingForm.addEventListener("submit", (e) => {
                e.preventDefault();
                shippingData = {
                    name:    document.getElementById("ship-name").value,
                    email:   document.getElementById("ship-email").value,
                    phone:   document.getElementById("ship-phone").value,
                    address: document.getElementById("ship-address").value,
                    city:    document.getElementById("ship-city").value,
                    state:   document.getElementById("ship-state").value,
                    zip:     document.getElementById("ship-zip").value,
                    country: document.getElementById("ship-country").value
                };
                shippingSection.classList.add("hidden");
                paymentSection.classList.remove("hidden");
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener("change", (e) => {
                if (e.target.name === "pay-method") {
                    activePaymentMethod = e.target.value;
                }
            });
            paymentForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (!validatePaymentForm()) return;
                paymentSection.classList.add("hidden");
                discountSection.classList.remove("hidden");
                updateCheckoutTotals();
            });
        }

        if (cardNumberInput) {
            cardNumberInput.addEventListener("input", () => {
                const raw = digitsOnly(cardNumberInput.value).slice(0, 19);
                cardNumberInput.value = raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                const brand = detectCardBrand(raw);
                if (brand) setPaymentMessage(`${brand} detected.`);
            });
        }
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener("input", () => {
                const raw = digitsOnly(cardExpiryInput.value).slice(0, 4);
                cardExpiryInput.value = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
            });
        }
        if (cardCvvInput) {
            cardCvvInput.addEventListener("input", () => {
                cardCvvInput.value = digitsOnly(cardCvvInput.value).slice(0, 4);
            });
        }

        if (applyDiscountBtn) {
            applyDiscountBtn.addEventListener("click", () => {
                const code = normalize(discountCodeInput.value).toUpperCase();
                activeDiscountRate = discountCodes[code] || 0;
                updateCheckoutTotals();
            });
        }

        if (payNowBtn) {
            payNowBtn.addEventListener("click", () => {
                cart = [];
                activeDiscountRate = 0;
                updateCartCount();
                renderCart();
                closeCart();
                window.location.href = cleanUrl("order-success");
            });
        }

        if (backToCartBtn) {
            backToCartBtn.addEventListener("click", () => {
                checkoutSteps.classList.add("hidden");
                if (cartSummary) cartSummary.classList.remove("hidden");
            });
        }

        /* Product modal */
        if (modalAddBtn) {
            modalAddBtn.addEventListener("click", () => {
                if (activeModalProductId) {
                    const qtyEl = document.getElementById("quantity");
                    const qty   = qtyEl ? Number(qtyEl.value) : 1;
                    const condEl = document.getElementById("condition-select");
                    const cond  = condEl ? condEl.value : "New";
                    addToCart(activeModalProductId, qty, cond);
                }
                closeProductModal();
            });
        }
        if (popupBackBtn) popupBackBtn.addEventListener("click", closeProductModal);
        if (productModal) {
            productModal.addEventListener("click", (e) => {
                if (e.target.dataset.close === "modal" || e.target === productModal) closeProductModal();
            });
        }

        /* Popup header search */
        if (popupHeaderSearch) {
            popupHeaderSearch.addEventListener("input", renderPopupSearchResults);
            popupHeaderSearch.addEventListener("search", renderPopupSearchResults);
        }
        if (popupSearchResults) {
            popupSearchResults.addEventListener("click", (e) => {
                const item = e.target.closest("[data-popup-result-id]");
                if (!item) return;
                clearPopupSearch();
                openProductModal(item.dataset.popupResultId);
            });
        }

        /* Account */
        if (accountBtn) accountBtn.addEventListener("click", () => openAccountDrawer("signin"));
        if (popupAccountBtn) popupAccountBtn.addEventListener("click", () => openAccountDrawer("signin"));

        const favListEl = document.getElementById("account-favorites-list");
        if (favListEl) {
            favListEl.addEventListener("click", (event) => {
                const target = event.target.closest("[data-action='remove-fav']");
                if (target) {
                    toggleFavorite(target.dataset.id);
                }
            });
        }

        /* Logo crossfade */
        setInterval(() => {
            document.querySelectorAll(".logo").forEach(lc => {
                const text = lc.querySelector(".logo-text");
                const img  = lc.querySelector(".logo-img");
                if (!text || !img) return;
                const showingText = text.classList.contains("logo-face--active");
                text.classList.toggle("logo-face--active", !showingText);
                img.classList.toggle("logo-face--active", showingText);
            });
        }, 10000);
    }

    /* ── Init ─────────────────────────────────── */
    function init() {
        window.history.replaceState({}, "", cleanUrl(window.location.href));
        decorateProducts();
        readUrlParams();
        renderAll();
        updateCartCount();
        renderCart();
        initAccountManager();
        if (accountManager && accountManager.setupAccountDrawer) accountManager.setupAccountDrawer();
        bindEvents();
        updateFavoritesUI();

        // If a ?product= param is in URL, open that product
        const params = new URLSearchParams(window.location.search);
        const productId = Number(params.get("product"));
        if (productId && window.products && window.products.some(p => p.id === productId)) {
            openProductModal(productId);
        }

        /* ── Pagination click handler ── */
        const paginationEl = document.getElementById("sr-pagination");
        if (paginationEl) {
            paginationEl.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-pg-num]");
                if (btn) { goToPage(Number(btn.dataset.pgNum)); return; }
                const nav = e.target.closest("[data-pg-action]");
                if (!nav) return;
                const filtered = getFilteredProducts();
                const totalPages = Math.ceil(filtered.length / getProductsPerPage());
                switch (nav.dataset.pgAction) {
                    case "first": goToPage(1); break;
                    case "prev":  goToPage(currentPage - 1); break;
                    case "next":  goToPage(currentPage + 1); break;
                    case "last":  goToPage(totalPages); break;
                }
            });
            paginationEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && e.target.classList.contains("pg-goto-input")) {
                    const val = parseInt(e.target.value);
                    const filtered = getFilteredProducts();
                    const totalPages = Math.ceil(filtered.length / getProductsPerPage());
                    if (val >= 1 && val <= totalPages) {
                        goToPage(val);
                    }
                    e.target.value = "";
                }
            });
        }

        /* ── Re-render on window resize ── */
        let lastWidth = window.innerWidth;
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth !== lastWidth) {
                    lastWidth = window.innerWidth;
                    currentPage = 1;
                    renderProducts();
                    renderResultsHeader();
                }
            }, 200);
        });
    }

    /* ── Expose refresh API for category-menu.js ── */
    window.SRPage = {
        refresh() {
            decorateProducts();
            currentBrand     = "";
            currentCondition = "";
            selectedDeals    = [];
            priceMin         = null;
            priceMax         = null;

            // Reset select dropdown values
            const brandSelect = document.getElementById("sr-brand-select");
            if (brandSelect) brandSelect.value = "";
            const conditionSelect = document.getElementById("sr-condition-select");
            if (conditionSelect) conditionSelect.value = "";

            // Uncheck deals
            document.querySelectorAll(".sr-deal-checkbox").forEach(chk => chk.checked = false);

            // Clear price inputs
            if (minPriceInput) minPriceInput.value = "";
            if (maxPriceInput) maxPriceInput.value = "";

            readUrlParams();
            renderAll();
            if (window.CategoryMenu) {
                window.CategoryMenu.markActive(currentCategory);
            }
        }
    };

    document.addEventListener("DOMContentLoaded", init);
})();
