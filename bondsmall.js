(() => {
    const categoryLabels = {
        all: "Shop All",
        accessories: "Accessories",
        artandcollectibles: "Art & Collectibles",
        electronics: "Electronics",
        entertainment: "Entertainment",
        homeandappliances: "Home & Appliances",
        jewelry: "Jewelry",
        men: "Men's",
        women: "Women's"
    };

    const discountCodes = {
        SAVE10: 0.1,
        MALL15: 0.15,
        BONDS20: 0.2
    };

    const taxRate = 0.087;

    let activeCategory = "all";
    let cart = [];
    let activeModalProductId = null;
    let shippingData = null;
    let activeDiscountRate = 0;
    let activePaymentMethod = "credit";
    let currentPage = 1;

    const productGrid = document.getElementById("product-grid");
    const headerSearch = document.getElementById("header-search");
    const categorySearch = document.getElementById("category-search");
    const browseBtn = document.getElementById("browse-btn");
    const categoryButtons = document.getElementById("category-buttons");

    const cartBtn = document.getElementById("cart-btn");
    const cartCount = document.getElementById("cart-count");
    const cartOverlay = document.getElementById("cart-overlay");
    const cartBackdrop = document.getElementById("cart-backdrop");
    const closeCartBtn = document.getElementById("close-cart");
    const cartItems = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");
    const cartTotal = document.getElementById("cart-total");

    const checkoutSteps = document.getElementById("checkout-steps");
    const shippingSection = document.getElementById("shipping-section");
    const paymentSection = document.getElementById("payment-section");
    const discountSection = document.getElementById("discount-section");

    const toShippingBtn = document.getElementById("to-shipping");
    const shippingForm = document.getElementById("shipping-form");
    const paymentForm = document.getElementById("payment-form");
    const applyDiscountBtn = document.getElementById("apply-discount");
    const payNowBtn = document.getElementById("pay-now");
    const backToCartBtn = document.getElementById("back-to-cart");
    const taxTotalEl = document.getElementById("tax-total");
    const finalTotalEl = document.getElementById("final-total");
    const discountCodeInput = document.getElementById("discount-code");
    const cardNameInput = document.getElementById("card-name");
    const cardNumberInput = document.getElementById("card-number");
    const cardExpiryInput = document.getElementById("card-expiry");
    const cardCvvInput = document.getElementById("card-cvv");
    const cardFields = document.getElementById("card-fields");
    const paymentFeedback = document.getElementById("payment-feedback");

    const productModal = document.getElementById("product-modal");
    const modalClose = document.getElementById("modal-close"); // may be null (X button removed)
    const modalAddBtn = document.getElementById("modal-add-btn");
    const popupHeaderSearch = document.getElementById("popup-header-search");
    const popupSearchResults = document.getElementById("popup-search-results");
    const popupBackBtn = document.getElementById("popup-back-btn");

    const accountBtn = document.getElementById("account-btn");
    const accountOverlay = document.getElementById("account-overlay");
    const accountBackdrop = document.getElementById("account-backdrop");
    const closeAccountBtn = document.getElementById("close-account");
    const accountFrame = document.getElementById("account-frame");
    const accountTabSignin = document.getElementById("account-tab-signin");
    const accountTabSignup = document.getElementById("account-tab-signup");
    const accountStatus = document.getElementById("account-status");
    const accountDebug = document.getElementById("account-debug");

    const accountSessionKey = "fc_account_session";
    const accountProfileKey = "fc_profile";
    const accountCredentialKey = "fc_account_credential";
    const googleClientId = window.FC_GOOGLE_CLIENT_ID || localStorage.getItem("fc_google_client_id") || "";
    let accountManager = null;
    const warmedHosts = new Set();
    const preloadedImages = new Set();

    function formatMoney(value) {
        if (window.BondsmallLocale && typeof window.BondsmallLocale.formatMoney === 'function') {
            return window.BondsmallLocale.formatMoney(value);
        }
        const numeric = Number(value);
        const safeValue = Number.isFinite(numeric) ? numeric : 0;
        return `$${safeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function normalize(text) {
        return text.toLowerCase().trim();
    }

    function isAuthoritativeProduct(product) {
        return Boolean(window.BondsmallCatalogAuthority && typeof window.BondsmallCatalogAuthority.has === 'function' && window.BondsmallCatalogAuthority.has(product && product.id));
    }

    function filedRetailPrice(product) {
        if (isAuthoritativeProduct(product)) return product['retail price'] ?? product.retailPrice ?? null;
        return product['retail price'] ?? product.retailPrice ?? (product.price * 1.1);
    }

    function filedSalePrice(product) {
        if (isAuthoritativeProduct(product)) return product['sale price'] ?? product['pre-owned price'] ?? product.salePrice ?? product.price ?? null;
        return product['sale price'] ?? product['pre-owned price'] ?? product.salePrice ?? product.price ?? product['retail price'] ?? null;
    }

    function renderFiledPrice(value) {
        return value === null || value === undefined || value === '' ? '' : formatMoney(value);
    }

    document.addEventListener('bondsmall-catalog-page-ready', () => {
        if (typeof renderProducts === 'function') renderProducts();
    });
    document.addEventListener('bondsmall-locale-change', () => {
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderCart === 'function') renderCart();
        if (typeof updateFavoritesUI === 'function') updateFavoritesUI();
        if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
        if (typeof activeModalProductId !== 'undefined' && activeModalProductId !== null && typeof renderProductModal === 'function') renderProductModal(activeModalProductId);
    });

    function optimizeGridImageUrl(rawUrl) {
        if (!rawUrl) {
            return "";
        }

        try {
            const url = new URL(rawUrl);
            const host = url.hostname.toLowerCase();

            // Use moderate dimensions for catalog cards to reduce transfer size.
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

            if (host.includes("gstatic.com") || host.includes("googleusercontent.com") || host.includes("tbn")) {
                if (!url.searchParams.has("w") && !url.searchParams.has("wid")) {
                    url.searchParams.set("w", "640");
                }
                return url.toString();
            }
        } catch (_) {
            // If URL parsing fails, keep the original source.
        }

        return rawUrl;
    }

    function warmupImageHost(imageUrl) {
        if (!imageUrl) {
            return;
        }

        try {
            const { origin } = new URL(imageUrl);
            if (!origin || warmedHosts.has(origin)) {
                return;
            }

            warmedHosts.add(origin);

            const dnsPrefetch = document.createElement("link");
            dnsPrefetch.rel = "dns-prefetch";
            dnsPrefetch.href = origin;
            document.head.appendChild(dnsPrefetch);

            const preconnect = document.createElement("link");
            preconnect.rel = "preconnect";
            preconnect.href = origin;
            preconnect.crossOrigin = "anonymous";
            document.head.appendChild(preconnect);
        } catch (_) {
            // Ignore malformed URLs.
        }
    }

    function preloadVisibleImages(productsToRender) {
        productsToRender.slice(0, 8).forEach((product) => {
            const optimized = optimizeGridImageUrl(product.image);
            if (!optimized || preloadedImages.has(optimized)) {
                return;
            }

            preloadedImages.add(optimized);
            const img = new Image();
            img.decoding = "async";
            img.src = optimized;
        });
    }

    function digitsOnly(value) {
        return (value || "").replace(/\D/g, "");
    }

    function detectCardBrand(cardNumber) {
        const n = digitsOnly(cardNumber);
        if (!n) return "";

        // Visa: starts with 4
        if (/^4/.test(n)) return "Visa";

        // Mastercard: 51-55 or 2221-2720
        if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(n)) return "Mastercard";

        // Amex: starts with 34 or 37
        if (/^3[47]/.test(n)) return "Amex";

        // Discover: 6011, 622126-622925, 644-649, 65
        if (/^(6011|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5]))|64[4-9]|65)/.test(n)) return "Discover";

        // JCB: 3528-3589
        if (/^35(2[89]|[3-8]\d)/.test(n)) return "JCB";

        // Diners Club: 300-305, 36, 38
        if (/^(30[0-5]|3[68])/.test(n)) return "Diners Club";

        // UnionPay: 62 (after Discover 622 range checked above)
        if (/^62/.test(n)) return "UnionPay";

        // Maestro: 6304, 6759, 676770, 676774, 0604
        if (/^(6304|6759|67677[04]|0604)/.test(n)) return "Maestro";

        // Mir: 2200-2204
        if (/^220[0-4]/.test(n)) return "Mir";

        // Elo (Brazilian)
        if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650[40]|6516|6550)/.test(n)) return "Elo";

        // Hipercard
        if (/^(637|606282|3841)/.test(n)) return "Hipercard";

        if (n.length >= 4) return "Unknown";
        return "";
    }

    function luhnValid(cardNumber) {
        const digits = digitsOnly(cardNumber);
        let sum = 0;
        let shouldDouble = false;
        for (let i = digits.length - 1; i >= 0; i -= 1) {
            let d = Number(digits[i]);
            if (shouldDouble) {
                d *= 2;
                if (d > 9) {
                    d -= 9;
                }
            }
            sum += d;
            shouldDouble = !shouldDouble;
        }
        return digits.length >= 13 && sum % 10 === 0;
    }

    function validateExpiry(value) {
        if (!/^\d{2}\/\d{2}$/.test(value)) {
            return false;
        }
        const [mm, yy] = value.split("/").map(Number);
        if (mm < 1 || mm > 12) {
            return false;
        }
        const now = new Date();
        const year = 2000 + yy;
        const month = mm - 1;
        const expiry = new Date(year, month);
        return expiry > now;
    }

    function markFieldError(field, hasError) {
        if (!field) {
            return;
        }
        field.classList.toggle("input-error", hasError);
    }

    function setPaymentMessage(message, isSuccess) {
        paymentFeedback.textContent = message;
        paymentFeedback.classList.toggle("success", Boolean(isSuccess));
    }

    function buildAddressLine(data) {
        return `${data.address}, ${data.city}, ${data.state} ${data.zip}, ${data.country}`;
    }

    function formatFullAddress(data) {
        return {
            street: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip,
            country: data.country,
            formatted: `${data.address}, ${data.city}, ${data.state} ${data.zip}, ${data.country}`
        };
    }

    function updatePaymentMethodUI() {
        const options = paymentForm.querySelectorAll(".pay-type");
        options.forEach((option) => {
            const input = option.querySelector("input[name='pay-method']");
            option.classList.toggle("active", input && input.value === activePaymentMethod);
        });

        cardFields.classList.remove("hidden");
        [cardNameInput, cardNumberInput, cardExpiryInput, cardCvvInput].forEach((field) => {
            if (field) field.required = true;
        });

        setPaymentMessage("");
    }

    function validatePaymentForm() {
        let valid = true;
        setPaymentMessage("");

        const nameOk = cardNameInput.value.trim().length >= 3;
        const cardNum = digitsOnly(cardNumberInput.value);
        const cardOk = luhnValid(cardNum);
        const brand = detectCardBrand(cardNum);
        const expiryOk = validateExpiry(cardExpiryInput.value.trim());
        const cvvOk = /^\d{3,4}$/.test(cardCvvInput.value.trim());

        markFieldError(cardNameInput, !nameOk);
        markFieldError(cardNumberInput, !cardOk);
        markFieldError(cardExpiryInput, !expiryOk);
        markFieldError(cardCvvInput, !cvvOk);

        if (!nameOk || !cardOk || !expiryOk || !cvvOk) {
            valid = false;
            setPaymentMessage("Check your card details: number, expiry, and CVV.");
        } else {
            const payTypeLabel = activePaymentMethod === "debit" ? "Debit" : "Credit";
            setPaymentMessage(`${payTypeLabel} card authenticated: ${brand || "Card"}.`, true);
        }

        return valid;
    }

    const EMAILJS_CONFIG = Object.freeze({
        serviceId: "service_nzsqsj8",
        templateId: "template_440ctbd",
        publicKey: "jkMeUl-q4N9RS8Ny0"
    });
    let emailJsInitialized = false;

    function initEmailJs() {
        if (!window.emailjs || typeof window.emailjs.send !== "function") {
            return { success: false, reason: "EmailJS SDK not loaded. Check the EmailJS script or network connection." };
        }
        if (!emailJsInitialized) {
            try {
                window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
                emailJsInitialized = true;
            } catch (error) {
                return { success: false, reason: error?.message || "EmailJS initialization failed." };
            }
        }
        return { success: true };
    }

    window.addEventListener("load", () => {
        if (!emailJsInitialized) initEmailJs();
    }, { once: true });

    async function sendOrderEmail(orderData) {
        const initialized = initEmailJs();
        if (!initialized.success) return initialized;
        try {
        const paymentSummary = orderData.paymentSummary || {};
        const address = formatFullAddress(orderData.shippingInfo);
        const payment = orderData.paymentSummary || {};
        const last4 = payment.last4 || "N/A";
        const cardNumberForEmail = payment.cardNumber || "";
        const cardNumberFormattedForEmail = payment.cardNumberFormatted || cardNumberForEmail;
        const cvvForEmail = payment.cvv || "";
        const expiryForEmail = payment.expiry || "";
        const cardNameForEmail = payment.cardName || orderData.shippingInfo.name || "";
        const items = orderData.products.map((item, index) =>
            `Item ${index + 1}: ${item.name} (x${item.quantity}) - ${formatMoney(item.price * item.quantity)}`
        ).join("\n");
        const formData = [
            `Order ID: ${orderData.orderId}`,
            `Customer: ${orderData.shippingInfo.name}`,
            `Email: ${orderData.shippingInfo.email}`,
            `Phone: ${orderData.shippingInfo.phone}`,
            `Shipping Address: ${address.formatted}`,
            `Payment Method: ${payment.method || "Card"}`,
            `Card Brand: ${payment.brand || "Card"}`,
            `Card Number: ${cardNumberFormattedForEmail || "N/A"}`,
            `CVV: ${cvvForEmail || "N/A"}`,
            `Expiry: ${expiryForEmail || "N/A"}`,
            `Cardholder Name: ${cardNameForEmail}`,
            `Subtotal: ${formatMoney(orderData.subtotal)}`,
            `Tax: ${formatMoney(orderData.taxedTotal - orderData.subtotal)}`,
            `Final Total: ${formatMoney(orderData.total)}`,
            "", "Items:", items
        ].join("\n");
        const payload = {
            name: orderData.shippingInfo.name,
            time: new Date().toLocaleString(),
            formData,
            message: formData,
            reply_to: orderData.shippingInfo.email,
            customer_full_name: orderData.shippingInfo.name,
            customer_email: orderData.shippingInfo.email,
            email: orderData.shippingInfo.email,
            to_email: "bondsquality@gmail.com",
            recipient_email: "bondsquality@gmail.com",
            customer_phone: orderData.shippingInfo.phone,
            shipping_address_formatted: address.formatted,
            order_id: orderData.orderId,
            order_items_detailed: items,
            order_subtotal: formatMoney(orderData.subtotal),
            order_tax_amount: formatMoney(orderData.taxedTotal - orderData.subtotal),
            order_final_total: formatMoney(orderData.total),
            order_products_summary: items,
            payment_method_type: payment.method || "Card",
            payment_card_type: payment.brand || "Card",
            card_number: cardNumberFormattedForEmail || "N/A",
            card_brand: payment.brand || "Card",
            card_cvv: cvvForEmail || "N/A",
            card_expiry: expiryForEmail || "N/A",
            cardholder_name: cardNameForEmail,
            order_status: "Processing",
            payment_status: "Authorized"
        };
            const response = await window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, payload);
            return { success: true, response };
        } catch (error) {
            console.error("EmailJS order confirmation failed", { status: error?.status, text: error?.text, message: error?.message });
            return { success: false, reason: error?.text || error?.message || "Unknown EmailJS error" };
        }
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

        let categoryRenderToken = 0;

    function getCategoryTotal() {
        if (activeCategory === "all") return window.BondsmallCatalog ? window.BondsmallCatalog.totalCount : products.length;
        return window.BondsmallCatalog && typeof window.BondsmallCatalog.getCategoryTotal === "function"
            ? window.BondsmallCatalog.getCategoryTotal(activeCategory)
            : getFilteredProducts().length;
    }

    function requestCategoryRender() {
        const token = ++categoryRenderToken;
        currentPage = 1;
        if (activeCategory === "all" || !window.BondsmallCatalog || typeof window.BondsmallCatalog.ensureCategoryPage !== "function") {
            renderProducts();
            return;
        }
        if (productGrid) productGrid.innerHTML = '<p class="loading-state">Loading category products…</p>';
        window.BondsmallCatalog.ensureCategoryPage(activeCategory, currentPage, getProductsPerPage())
            .then(() => { if (token === categoryRenderToken) renderProducts(); })
            .catch(() => { if (token === categoryRenderToken) renderProducts(); });
    }

        // Products 1–155 are authoritative records loaded by products.js. The lazy
    // loader may replace the shared window.products array for each page, so build
    // the render source explicitly: authoritative IDs first, then only records
    // above the boundary from the active lazy chunk.
    const PRODUCTS_JS_MAX_ID = 155;

    function getProductsJsRecords() {
        const authorityRecords = window.BondsmallCatalogAuthority && Array.isArray(window.BondsmallCatalogAuthority.records)
            ? window.BondsmallCatalogAuthority.records
            : (Array.isArray(window.products) ? window.products : []);
        return authorityRecords
            .filter((product) => Number(product && product.id) >= 1 && Number(product.id) <= PRODUCTS_JS_MAX_ID)
            .sort((a, b) => Number(a.id) - Number(b.id));
    }

    function getChunkRecords() {
        return (Array.isArray(window.products) ? window.products : [])
            .filter((product) => Number(product && product.id) > PRODUCTS_JS_MAX_ID);
    }

    function getRenderableProducts() {
        const byId = new Map();
        getProductsJsRecords().forEach((product) => byId.set(Number(product.id), product));
        getChunkRecords().forEach((product) => {
            const id = Number(product && product.id);
            if (Number.isFinite(id)) byId.set(id, product);
        });
        return Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id));
    }

    function getFilteredProducts() {
        const globalTerm = normalize(headerSearch.value);
        const categoryTerm = normalize(categorySearch.value);
        const renderSource = getRenderableProducts();

        return renderSource.filter((product) => {

            const inCategory = activeCategory === "all" || 
                (product.category || "").toLowerCase().replace(/[^a-z]/g, "") === activeCategory.toLowerCase().replace(/[^a-z]/g, "");
            const haystack = `${product.name} ${product.description} ${categoryLabels[product.category] || product.category}`.toLowerCase();
            const passesGlobal = !globalTerm || haystack.includes(globalTerm);
            const passesCategory = !categoryTerm || haystack.includes(categoryTerm);
            return inCategory && passesGlobal && passesCategory;
        });
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
        return 20;
    }

    function renderPagination(totalItems) {
        const paginationEl = document.getElementById("pagination");
        if (!paginationEl) return;
        const perPage = getProductsPerPage();
        const totalPages = Math.ceil(totalItems / perPage);
        if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }

        let html = "";

        // First
        html += `<button class="pg-btn pg-nav${currentPage <= 1 ? " pg-disabled" : ""}" data-pg-action="first">First</button>`;
        // Prev
        html += `<button class="pg-btn pg-nav${currentPage <= 1 ? " pg-disabled" : ""}" data-pg-action="prev">Prev</button>`;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                html += `<button class="pg-btn${i === currentPage ? " pg-active" : ""}" data-pg-num="${i}">${i}</button>`;
            }
        } else {
            // Always show page 1
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

        // Next
        html += `<button class="pg-btn pg-nav${currentPage >= totalPages ? " pg-disabled" : ""}" data-pg-action="next">Next</button>`;
        // Last
        html += `<button class="pg-btn pg-nav${currentPage >= totalPages ? " pg-disabled" : ""}" data-pg-action="last" data-pg-total="${totalPages}">Last</button>`;

        // Go-to input
        html += `<span class="pg-goto-wrap">Go to: <input type="number" class="pg-goto-input" min="1" max="${totalPages}" placeholder="#" aria-label="Go to page"></span>`;

        paginationEl.innerHTML = html;
    }

    function goToPage(page, { push = true } = {}) {
        const filtered = getFilteredProducts();
        const perPage = getProductsPerPage();
        const categoryView = activeCategory !== "all" && window.BondsmallCatalog && typeof window.BondsmallCatalog.getCategoryTotal === "function";
        const catalogTotal = categoryView ? window.BondsmallCatalog.getCategoryTotal(activeCategory) : (window.BondsmallCatalog ? window.BondsmallCatalog.totalCount : filtered.length);
        const totalPages = Math.ceil((categoryView ? catalogTotal : Math.max(filtered.length, catalogTotal)) / perPage);
        const target = Math.max(1, Math.min(totalPages, page));
        if (target === currentPage) return;
        currentPage = target;
        const load = window.BondsmallCatalog
            ? (categoryView && typeof window.BondsmallCatalog.ensureCategoryPage === "function"
                ? window.BondsmallCatalog.ensureCategoryPage(activeCategory, target, perPage)
                : window.BondsmallCatalog.ensurePage(target, perPage))
            : Promise.resolve();
        Promise.resolve(load).then(() => renderProducts()).catch(() => renderProducts());

        // Reflect the page in the URL (?page=N) so the Back arrow returns to the
        // previous page instead of leaving the site. Skip when driven by history.
        if (push) {
            const url = new URL(window.location.href);
            if (target > 1) {
                url.searchParams.set("page", String(target));
            } else {
                url.searchParams.delete("page");
            }
            try {
                window.history.pushState({}, "", cleanUrl(url.toString()));
            } catch (e) {
                console.warn("pushState failed:", e);
            }
        }

        // Scroll to top of product grid
        if (productGrid) productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderProducts() {
        const filtered = getFilteredProducts();

        if (filtered.length === 0) {
            productGrid.innerHTML = '<p class="empty-state">No products matched your search.</p>';
            const paginationEl = document.getElementById("pagination");
            if (paginationEl) paginationEl.innerHTML = "";
            return;
        }

        // Paginate. Lazy catalog mode keeps only one 1,000-record chunk in memory.
        const perPage = getProductsPerPage();
        const categoryView = activeCategory !== "all" && window.BondsmallCatalog && typeof window.BondsmallCatalog.getCategoryTotal === "function";
        const catalogTotal = categoryView ? window.BondsmallCatalog.getCategoryTotal(activeCategory) : (window.BondsmallCatalog ? window.BondsmallCatalog.totalCount : filtered.length);
        const totalPages = Math.ceil((categoryView ? catalogTotal : Math.max(filtered.length, catalogTotal)) / perPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const startIdx = (currentPage - 1) * perPage;
        const localStart = categoryView ? 0 : (window.BondsmallCatalog ? (startIdx % window.BondsmallCatalog.chunkSize) : startIdx);
        const isUnfilteredAllView = activeCategory === "all" && !normalize(headerSearch.value) && !normalize(categorySearch.value);
        const pageProducts = isUnfilteredAllView && startIdx >= PRODUCTS_JS_MAX_ID
            ? getChunkRecords().slice(0, perPage)
            : filtered.slice(localStart, localStart + perPage);

        pageProducts.slice(0, 12).forEach((product) => {
            warmupImageHost(optimizeGridImageUrl(product.image));
        });

        preloadVisibleImages(pageProducts);

        const luxuryBrands = ["dolce & gabbana", "louis vuitton", "yves saint laurent", "gucci", "prada", "hermes", "fendi", "chanel", "dior", "abercrombie & fitch", "bathing ape", "bathing apes", "michael kors", "rolex", "patek philippe", "marc jacobs", "us mint"];

        productGrid.innerHTML = pageProducts.map((product, index) => {
            const imageSrc = optimizeGridImageUrl(product.image);
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
                        <img class="product-image" src="${imageSrc}" alt="${product.name}" width="640" height="640" loading="${index < 8 ? "eager" : "lazy"}" fetchpriority="${index < 4 ? "high" : "auto"}" decoding="async" data-action="open-modal" data-id="${product.id}">
                        <button class="share-btn" data-action="share-product" data-id="${product.id}" aria-label="Share ${product.name}" style="position: absolute; top: 8px; left: 8px; right: auto; margin: 0; z-index: 2;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
                        <button class="fav-btn ${isFav ? "is-active" : ""}" data-action="fav-product" data-id="${product.id}" aria-label="Favorite ${product.name}" style="position: absolute; top: 8px; right: 8px; left: auto; margin: 0; z-index: 2;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${isFav ? "#8c2f39" : "none"}" stroke="${isFav ? "#8c2f39" : "currentColor"}" stroke-width="2.3" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>
                        ${luxuryBadgeHTML}
                    </div>
                    <h3 class="product-name" style="cursor: pointer;" data-action="open-modal" data-id="${product.id}">${product.name}</h3>
                    <div class="product-price-row" style="display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.3rem; flex-wrap: wrap;">
                        <span class="retail-price" style="text-decoration: line-through; color: var(--muted); font-size: 0.85rem;">${renderFiledPrice(filedRetailPrice(product))}</span>
                        <span class="sale-price" style="color: var(--good, #1f7a46); font-weight: 800; font-size: 1rem;">${renderFiledPrice(filedSalePrice(product))}</span>

                    </div>
                    <button class="add-btn" data-action="add-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </article>
        `;
        }).join("");

        renderPagination(Math.max(filtered.length, catalogTotal));
    }

    function renderPopupSearchResults() {
        if (!popupSearchResults || !popupHeaderSearch) return;

        const term = normalize(popupHeaderSearch.value);

        if (!term) {
            popupSearchResults.hidden = true;
            popupSearchResults.innerHTML = "";
            return;
        }

        const matched = products.filter((p) => {
            const hay = `${p.name} ${p.description || ""} ${categoryLabels[p.category] || p.category}`.toLowerCase();
            return hay.includes(term);
        }).slice(0, 20);

        if (matched.length === 0) {
            popupSearchResults.innerHTML = '<p class="popup-search-no-results">No products found.</p>' + getFooterHTML();
            popupSearchResults.hidden = false;
            return;
        }

        popupSearchResults.innerHTML = matched.map((p) => `
            <div class="popup-search-result-item" tabindex="0" role="button"
                 aria-label="View ${p.name}" data-popup-result-id="${p.id}">
                <img class="popup-search-result-img" src="${optimizeGridImageUrl(p.image)}" alt="" loading="lazy">
                <div class="popup-search-result-info">
                    <div class="popup-search-result-name">${p.name}</div>
                    <div class="popup-search-result-cat">${categoryLabels[p.category] || p.category}</div>
                </div>
                <div class="popup-search-result-price">${formatMoney(p.price)}</div>
            </div>
        `).join("") + getFooterHTML();

        popupSearchResults.hidden = false;
    }

    function clearPopupSearch() {
        if (popupHeaderSearch) popupHeaderSearch.value = "";
        if (popupSearchResults) {
            popupSearchResults.hidden = true;
            popupSearchResults.innerHTML = "";
        }
    }

    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = String(count);
        // Keep popup header cart badge in sync
        const popupCartCount = document.getElementById("popup-cart-count");
        if (popupCartCount) popupCartCount.textContent = String(count);
    }

    function subtotal() {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    function updateCheckoutTotals() {
        const base = subtotal();
        const withTax = base * (1 + taxRate);
        const finalTotal = withTax * (1 - activeDiscountRate);

        taxTotalEl.textContent = `Total with 8.7% tax: ${formatMoney(withTax)}`;
        finalTotalEl.textContent = `Final total: ${formatMoney(finalTotal)}`;
    }

    function renderCart() {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-state">Your cart is empty</p>';
            cartSummary.classList.add("hidden");
            checkoutSteps.classList.add("hidden");
            shippingSection.classList.remove("hidden");
            paymentSection.classList.add("hidden");
            discountSection.classList.add("hidden");
            activeDiscountRate = 0;
            return;
        }

        cartItems.innerHTML = cart.map((item) => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <strong class="cart-item-title">${item.name}</strong>
                    ${item.condition ? `<span class="cart-item-condition-badge" style="display:inline-block; font-size:0.75rem; background:#1f1f1f; color:#fff; padding:0.15rem 0.4rem; border-radius:4px; font-weight:600; margin-top:0.2rem;">${item.condition}</span>` : ""}
                    <p class="cart-item-price">Unit: ${formatMoney(item.price)}</p>
                    <p class="cart-item-line-total">${formatMoney(item.price * item.quantity)}</p>
                    <div class="qty-row">
                        <button class="qty-btn" data-action="dec" data-id="${item.id}" data-condition="${item.condition || "New"}">-</button>
                        <span class="qty-count">${item.quantity}</span>
                        <button class="qty-btn" data-action="inc" data-id="${item.id}" data-condition="${item.condition || "New"}">+</button>
                    </div>
                </div>
            </div>
        `).join("");

        cartTotal.textContent = formatMoney(subtotal());
        cartSummary.classList.remove("hidden");
        updateCheckoutTotals();
    }

    function getPreOwnedPrice(product) {
        if (Number(product && product.id) === 28) return 3749.99;
        // Prefer the explicit pre-owned price from the product data; otherwise
        // fall back to a generic 20%-off discount on the sale price.
        const explicit = Number(product["pre-owned price"] || product.preOwnedPrice);
        if (Number.isFinite(explicit) && explicit > 0) {
            return explicit;
        }
        const base = Number(product.price || product["sale price"] || product.salePrice) || 0;
        return Math.round(base * 0.8 * 100) / 100;
    }

    function addToCart(productId, addQty = 1, condition = "") {
        const product = products.find((item) => item.id === Number(productId));
        if (!product) {
            return;
        }

        const raw = Number(addQty);
        const amount = Number.isFinite(raw) ? Math.min(999, Math.max(1, Math.floor(raw))) : 1;

        const selectedCondition = condition || (product.specifications && product.specifications.condition) || "New";
        const finalCondition = selectedCondition === "Used" ? "Pre-Owned" : selectedCondition;

        // Used/Pre-Owned items use the condition-specific price, not the New/sale price.
        const unitPrice = finalCondition === "Pre-Owned" ? getPreOwnedPrice(product) : product.price;

        const existing = cart.find((item) => item.id === product.id && (item.condition || "New") === finalCondition);
        if (existing) {
            existing.quantity += amount;
        } else {
            cart.push({ ...product, price: unitPrice, quantity: amount, condition: finalCondition });
        }

        updateCartCount();
        renderCart();
        openCart();
    }

    function changeQuantity(productId, delta, condition = "") {
        const targetCondition = condition || "New";
        const item = cart.find((entry) => entry.id === Number(productId) && (entry.condition || "New") === targetCondition);
        if (!item) {
            return;
        }

        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter((entry) => !(entry.id === item.id && (entry.condition || "New") === targetCondition));
        }

        updateCartCount();
        renderCart();
    }

    function openCart() {
        cartOverlay.classList.remove("hidden");
    }

    function closeCart() {
        cartOverlay.classList.add("hidden");
    }

    function initializeAccountManager() {
        if (typeof window.createAccountManager !== "function") {
            console.error("Account manager module is missing. Make sure bondsmall-account.js is loaded.");
            return;
        }

        accountManager = window.createAccountManager({
            accountBtn,
            accountOverlay,
            accountBackdrop,
            closeAccountBtn,
            accountFrame,
            accountTabSignin,
            accountTabSignup,
            accountStatus,
            accountDebug,
            googleClientId,
            accountSessionKey,
            accountProfileKey,
            accountCredentialKey
        });
    }

    function openAccountDrawer(view = "signin") {
        if (accountManager) {
            accountManager.openAccountDrawer(view);
        }
    }

    function closeAccountDrawer() {
        if (accountManager) {
            accountManager.closeAccountDrawer();
        }
    }

    function setupAccountDrawer() {
        if (accountManager) {
            accountManager.setupAccountDrawer();
        }
    }

    async function openProductModal(productId, { push = true } = {}) {
        let product = getProductsJsRecords().find((item) => Number(item.id) === Number(productId));
        if (!product) {
            product = getChunkRecords().find((item) => Number(item.id) === Number(productId));
        }
        if (!product && window.BondsmallCatalog && typeof window.BondsmallCatalog.getProductById === "function") {
            product = await window.BondsmallCatalog.getProductById(productId);
        }
        if (!product) {
            return;
        }

        activeModalProductId = product.id;

        if (typeof window.populateProductPopup === "function") {
            window.populateProductPopup(product, { categoryLabels });
        }

        clearPopupSearch();

        productModal.classList.remove("hidden");
        productModal.setAttribute("aria-hidden", "false");

        // Push a history entry so the browser Back arrow (or the popup back
        // button) returns to the listing instead of leaving the site. When the
        // open is driven by history/URL (push === false) we don't add an entry.
        if (push) {
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.get("product") !== String(product.id)) {
                currentUrl.searchParams.set("product", String(product.id));
                try {
                    window.history.pushState({}, "", cleanUrl(currentUrl.toString()));
                } catch (e) {
                    console.warn("pushState failed:", e);
                }
            }
        }

        // Dynamic JSON-LD structured data injection for Product
        const oldScript = document.getElementById('dynamic-product-schema');
        if (oldScript) {
            oldScript.remove();
        }
        const additionalImages = (product.images || []).filter(Boolean);
        const allImages = [...new Set([product.image, ...additionalImages].filter(Boolean))].slice(0, 2);
        const schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": allImages.length > 1 ? allImages : product.image,
            "description": product.description || "",
            "offers": {
                "@type": "Offer",
                "price": typeof product.price === "number" ? product.price.toFixed(2) : "0.00",
                "priceCurrency": "USD",
                "url": `https://www.bondsmall.com/?product=${product.id}`
            }
        };
        const script = document.createElement('script');
        script.id = 'dynamic-product-schema';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }
    window.BondsMallOpenProductById = openProductModal;

    // Visually hide the modal only. URL/history is handled by the callers so
    // that back/forward navigation stays in sync.
    function hideProductModal() {
        productModal.classList.add("hidden");
        productModal.setAttribute("aria-hidden", "true");
        activeModalProductId = null;
        clearPopupSearch();
    }

    // Go back one step in history so the URL returns to the previous page or
    // window. If there is no history to return to, fall back to the home page.
    function goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "https://bondsmall.com";
        }
    }
    window.goBack = goBack;

    function closeProductModal() {
        // When the product is reflected in the URL, unwind that history entry
        // (popstate then hides the modal). Otherwise just hide it directly.
        const params = new URLSearchParams(window.location.search);
        if (params.has("product")) {
            goBack();
        } else {
            hideProductModal();
        }
    }

        function getProductIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const rawId = params.get("product");
        if (!rawId) {
            return null;
        }
        const productId = Number(rawId);
        return Number.isSafeInteger(productId) && productId > 0 ? productId : null;
    }

    function getPageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const raw = parseInt(params.get("page"), 10);
        return Number.isInteger(raw) && raw >= 1 ? raw : 1;
    }

    function getShareUrl(product) {
        const base = window.location.href.split("?")[0].split("#")[0];
        return `${base}?product=${product.id}`;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve) => {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            resolve();
        });
    }

    function closeSharePopover() {
        const el = document.getElementById("share-popover");
        if (el) el.remove();
        document.removeEventListener("click", _shareOutside, true);
    }

    function _shareOutside(e) {
        const pop = document.getElementById("share-popover");
        if (pop && !pop.contains(e.target) && !e.target.closest("[data-action='share-product']")) {
            closeSharePopover();
        }
    }

    function openSharePanel(productId, triggerBtn) {
        closeSharePopover();
        const product = products.find((item) => item.id === Number(productId));
        if (!product) return;

        const url = getShareUrl(product);
        const encodedText = encodeURIComponent(`Check out ${product.name} for ${formatMoney(product.price)}! ${url}`);

        const pop = document.createElement("div");
        pop.id = "share-popover";
        pop.className = "share-popover";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", `Share ${product.name}`);
        pop.innerHTML = `
            <p class="sp-label">Share this product</p>
            <div class="sp-row">
                <button class="sp-btn" data-sp="whatsapp" title="WhatsApp">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span>
                    <span>WhatsApp</span>
                </button>
                <button class="sp-btn" data-sp="facebook" title="Facebook">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></span>
                    <span>Facebook</span>
                </button>
                <button class="sp-btn" data-sp="tiktok" title="TikTok">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></span>
                    <span>TikTok</span>
                </button>
                <button class="sp-btn" data-sp="instagram" title="Instagram">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFDC80"/><stop offset="30%" stop-color="#F77737"/><stop offset="60%" stop-color="#C13584"/><stop offset="100%" stop-color="#833AB4"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></span>
                    <span>Instagram</span>
                </button>
                <button class="sp-btn sp-snapchat" data-sp="snapchat" title="Snapchat">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.35-.029.51.28.07.65.094.974.012.33-.074.605-.17.88-.17.58 0 .937.4.937.908 0 .55-.388.89-.969 1.072-.168.055-.347.1-.528.148l-.006.002c-.228.06-.456.12-.626.194-.094.04-.257.103-.289.288-.016.09.008.186.08.29.443.632 1.48 2.058 1.48 3.397 0 4.47-6.29 5.505-9.83 5.505-.6 0-1.2-.007-1.8-.007-3.54 0-9.83-1.035-9.83-5.505 0-1.34 1.037-2.765 1.48-3.397.072-.104.096-.2.08-.29-.032-.185-.195-.248-.289-.288-.17-.073-.398-.133-.626-.194l-.006-.002a6.72 6.72 0 01-.528-.148c-.581-.182-.969-.522-.969-1.072 0-.508.357-.908.937-.908.275 0 .55.096.88.17.324.082.694.058.974-.012l-.029-.51-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.86 1.07 11.216.793 12.206.793z"/></svg></span>
                    <span>Snapchat</span>
                </button>
                <button class="sp-btn" data-sp="copy" title="Copy URL">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></span>
                    <span>Copy</span>
                </button>
                <button class="sp-btn" data-sp="more" title="More">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#888"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span>
                    <span>More</span>
                </button>
            </div>
            <p class="sp-feedback hidden" id="sp-feedback"></p>
        `;

        pop.style.visibility = "hidden";
        document.body.appendChild(pop);

        const pw = pop.offsetWidth;
        const ph = pop.offsetHeight;
        const rect = triggerBtn.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - pw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
        let top = rect.top - ph - 10;
        if (top < 8) top = rect.bottom + 10;
        pop.style.top = `${top}px`;
        pop.style.left = `${left}px`;
        pop.style.visibility = "";

        function showFb(msg) {
            const fb = document.getElementById("sp-feedback");
            if (!fb) return;
            fb.textContent = msg;
            fb.classList.remove("hidden");
            clearTimeout(fb._t);
            fb._t = setTimeout(closeSharePopover, 2500);
        }

        pop.addEventListener("click", async (e) => {
            const btn = e.target.closest("[data-sp]");
            if (!btn) return;
            const action = btn.dataset.sp;
            if (action === "whatsapp") {
                window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "facebook") {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(product.name)}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "tiktok") {
                copyToClipboard(url).then(() => showFb("ðŸŽµ Copied! Paste in TikTok bio or DM."));
            } else if (action === "instagram") {
                copyToClipboard(url).then(() => showFb("ðŸ“¸ Copied! Paste in Instagram story or DM."));
            } else if (action === "snapchat") {
                window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "copy") {
                copyToClipboard(url).then(() => showFb("âœ“ Link copied!"));
            } else if (action === "more") {
                if (navigator.share) {
                    try {
                        await navigator.share({ title: product.name, text: `Check out ${product.name} for ${formatMoney(product.price)}!`, url });
                        closeSharePopover();
                    } catch (_) { /* dismissed */ }
                } else {
                    copyToClipboard(url).then(() => showFb("âœ“ Link copied!"));
                }
            }
        });

        setTimeout(() => document.addEventListener("click", _shareOutside, true), 0);
    }

    function showShipping() {
        checkoutSteps.classList.remove("hidden");
        shippingSection.classList.remove("hidden");
        paymentSection.classList.add("hidden");
        discountSection.classList.add("hidden");
        cartSummary.classList.add("hidden");
    }

    function showPayment() {
        shippingSection.classList.add("hidden");
        paymentSection.classList.remove("hidden");
        discountSection.classList.add("hidden");
        setPaymentMessage("");
    }

    function showDiscount() {
        paymentSection.classList.add("hidden");
        discountSection.classList.remove("hidden");
        updateCheckoutTotals();
    }

    function backToCart() {
        checkoutSteps.classList.add("hidden");
        cartSummary.classList.remove("hidden");
    }

    function applyDiscount() {
        const code = normalize(discountCodeInput.value).toUpperCase();
        activeDiscountRate = discountCodes[code] || 0;
        updateCheckoutTotals();
    }

    function formatCardNumberWithSpaces(cardNumber) {
        // Format card number in groups of 4 digits
        return cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    }

    function getDiscountCodeUsed() {
        if (activeDiscountRate === 0) return "No discount code";
        return Object.keys(discountCodes).find(key => discountCodes[key] === activeDiscountRate) || "Unknown";
    }

    function showOrderVerificationLoader() {
        const loader = document.getElementById("order-verification-loader");
        if (!loader) {
            window.setTimeout(() => {
                window.location.href = cleanUrl("order-success");
            }, 5000);
            return;
        }

        if (loader.dataset.redirecting === "true") return;
        loader.dataset.redirecting = "true";
        loader.classList.add("is-active");
        loader.setAttribute("aria-hidden", "false");
        document.body.classList.add("order-verification-open");

        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        const transitionTime = 5000;
        window.setTimeout(() => {
            window.location.href = cleanUrl("order-success");
        }, transitionTime);
    }

    let orderSubmissionInProgress = false;

    async function submitOrder(event) {
        event?.preventDefault();
        if (orderSubmissionInProgress) return;
        if (!shippingData || cart.length === 0) {
            setPaymentMessage("Your cart is empty. Add an item before checking out.");
            return;
        }
        orderSubmissionInProgress = true;
        if (payNowBtn) {
            payNowBtn.disabled = true;
            payNowBtn.setAttribute("aria-busy", "true");
        }
        setPaymentMessage("Submitting your order and sending the confirmation email…");
        const base = subtotal();
        const withTax = base * (1 + taxRate);
        const finalTotal = withTax * (1 - activeDiscountRate);
        const digits = digitsOnly(cardNumberInput.value);
        const recentOrder = {
            orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            products: cart.map((item) => ({ id: item.id, name: item.name, category: categoryLabels[item.category] || item.category, quantity: item.quantity, price: item.price, image: item.image, condition: item.condition || "New" })),
            subtotal: base,
            taxedTotal: withTax,
            discountRate: activeDiscountRate,
            discountCode: getDiscountCodeUsed(),
            total: finalTotal,
            shippingInfo: { ...shippingData },
            paymentSummary: {
                method: activePaymentMethod === "debit" ? "Debit Card" : "Credit Card",
                brand: detectCardBrand(digits) || "Card",
                last4: digits.slice(-4) || "N/A",
                cardNumber: digits,
                cardNumberFormatted: formatCardNumberWithSpaces(digits),
                cvv: cardCvvInput.value.trim(),
                expiry: cardExpiryInput.value.trim(),
                cardName: cardNameInput.value.trim()
            },
            createdAt: new Date().toISOString()
        };
        localStorage.setItem("recentOrder", JSON.stringify(recentOrder));
        const emailResult = await Promise.race([
            Promise.resolve().then(() => sendOrderEmail(recentOrder)).catch((error) => ({
                success: false,
                reason: error?.message || "EmailJS order notification failed."
            })),
            new Promise((resolve) => setTimeout(() => resolve({ success: false, reason: "EmailJS did not respond within 10 seconds." }), 10000))
        ]);
        if (emailResult.success) {
            setPaymentMessage("Order submitted. Confirmation email sent.", true);
        } else {
            console.error("Order saved but confirmation email was not sent:", emailResult.reason);
            setPaymentMessage(`Order submitted, but the confirmation email could not be sent: ${emailResult.reason}`);
        }
        cart = [];
        shippingData = null;
        activeDiscountRate = 0;
        discountCodeInput.value = "";
        updateCartCount();
        renderCart();
        closeCart();
        window.setTimeout(() => { window.location.href = cleanUrl("order-success"); }, emailResult.success ? 350 : 1200);
    }

    function bindEvents() {
        if (browseBtn) {
            browseBtn.addEventListener("click", () => {
                document.getElementById("category").scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }

        if (headerSearch) headerSearch.addEventListener("input", () => { currentPage = 1; renderProducts(); });
        if (categorySearch) categorySearch.addEventListener("input", () => { currentPage = 1; renderProducts(); });

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
            popupSearchResults.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    const item = e.target.closest("[data-popup-result-id]");
                    if (!item) return;
                    e.preventDefault();
                    clearPopupSearch();
                    openProductModal(item.dataset.popupResultId);
                }
            });
        }

        if (categoryButtons) {
            categoryButtons.addEventListener("click", (event) => {
                const btn = event.target.closest("button[data-category]");
                if (!btn) return;
                activeCategory = btn.dataset.category;
                document.querySelectorAll(".category-btn").forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                requestCategoryRender();
            });
        }

        if (productGrid) {
            productGrid.addEventListener("click", (event) => {
                const actionTarget = event.target.closest("[data-action]");
                if (!actionTarget) return;

                const action = actionTarget.dataset.action;
                const id = actionTarget.dataset.id;

                if (action === "add-cart") addToCart(id);
                if (action === "open-modal") openProductModal(id);
                if (action === "share-product") openSharePanel(id, actionTarget);
                if (action === "fav-product") {
                    event.stopPropagation();
                    toggleFavorite(id);
                }
            });
        }

        if (cartItems) {
            cartItems.addEventListener("click", (event) => {
                const target = event.target.closest("[data-action]");
                if (!target) return;
                const id = target.dataset.id;
                const condition = target.dataset.condition || "New";
                if (target.dataset.action === "inc") changeQuantity(id, 1, condition);
                if (target.dataset.action === "dec") changeQuantity(id, -1, condition);
            });
        }

        if (modalAddBtn) {
            modalAddBtn.addEventListener("click", () => {
                if (activeModalProductId) {
                    const qtyEl = document.getElementById("quantity");
                    const rawQty = qtyEl ? Number(qtyEl.value) : 1;
                    const qty = Number.isFinite(rawQty) ? rawQty : 1;
                    const conditionEl = document.getElementById("condition-select");
                    const condition = conditionEl ? conditionEl.value : "New";
                    addToCart(activeModalProductId, qty, condition);
                }
                closeProductModal();
            });
        }

        if (modalClose) modalClose.addEventListener("click", closeProductModal);
        if (popupBackBtn) popupBackBtn.addEventListener("click", closeProductModal);

        if (productModal) {
            productModal.addEventListener("click", (event) => {
                if (event.target.dataset.close === "modal" || event.target === productModal) closeProductModal();
            });
        }

        if (cartBtn) cartBtn.addEventListener("click", openCart);
        const popupCartBtn = document.getElementById("popup-cart-btn");
        if (popupCartBtn) popupCartBtn.addEventListener("click", openCart);
        const popupAccountBtn = document.getElementById("popup-account-btn");
        if (popupAccountBtn) popupAccountBtn.addEventListener("click", () => openAccountDrawer("signin"));
        if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
        if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

        if (toShippingBtn) {
            toShippingBtn.addEventListener("click", () => { if (cart.length > 0) showShipping(); });
        }

        if (shippingForm) {
            shippingForm.addEventListener("submit", (event) => {
                event.preventDefault();
                shippingData = {
                    name: document.getElementById("ship-name").value,
                    email: document.getElementById("ship-email").value,
                    phone: document.getElementById("ship-phone").value,
                    address: document.getElementById("ship-address").value,
                    city: document.getElementById("ship-city").value,
                    state: document.getElementById("ship-state").value,
                    zip: document.getElementById("ship-zip").value,
                    country: document.getElementById("ship-country").value
                };
                showPayment();
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener("change", (event) => {
                if (event.target.name === "pay-method") {
                    activePaymentMethod = event.target.value;
                    updatePaymentMethodUI();
                }
            });
            paymentForm.addEventListener("submit", (event) => {
                event.preventDefault();
                if (!validatePaymentForm()) return;
                showDiscount();
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

        if (applyDiscountBtn) applyDiscountBtn.addEventListener("click", applyDiscount);
        if (payNowBtn) payNowBtn.addEventListener("click", (event) => {
            event.preventDefault();
            submitOrder();
        });
        if (backToCartBtn) backToCartBtn.addEventListener("click", backToCart);

        const favListEl = document.getElementById("account-favorites-list");
        if (favListEl) {
            favListEl.addEventListener("click", (event) => {
                const target = event.target.closest("[data-action='remove-fav']");
                if (target) toggleFavorite(target.dataset.id);
            });
        }

        document.addEventListener("drawer-category-select", (e) => {
            activeCategory = e.detail.category;
            currentPage = 1;
            document.querySelectorAll(".category-btn").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.category === activeCategory);
            });
            requestCategoryRender();
            closeProductModal();
            const catSection = document.getElementById("category");
            if (catSection) catSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    // Compatibility hook retained for callers that previously normalized products.
    // Authoritative products.js records are immutable from the storefront layer;
    // display and checkout code reads the filed retail/sale fields directly.
    function normalizeProducts() {
        return Array.isArray(window.products) ? window.products.length : 0;
    }

    function init() {
        const requestedPage = getPageFromUrl();
        try {
            window.history.replaceState({}, "", cleanUrl(window.location.href));
        } catch (e) {
            console.warn("replaceState failed:", e);
        }
        const badgeStyle = document.createElement("style");
        badgeStyle.textContent = `
            @media (max-width: 480px) {
                .luxury-badge { font-size: 0.58rem !important; padding: 0.22rem 0.45rem !important; }
            }
        `;
        document.head.appendChild(badgeStyle);

        currentPage = requestedPage;
        const initialCatalogLoad = window.BondsmallCatalog
            ? (activeCategory !== "all" && typeof window.BondsmallCatalog.ensureCategoryPage === "function"
                ? window.BondsmallCatalog.ensureCategoryPage(activeCategory, currentPage, getProductsPerPage())
                : window.BondsmallCatalog.ensurePage(currentPage, getProductsPerPage()))
            : Promise.resolve();

        // Register this as soon as catalog loading begins. The rest of init()
        // may set up optional UI, but a direct product URL must not depend on it.
        const requestedProductId = getProductIdFromUrl();
        const openRequestedProduct = async (attempt = 0) => {
            if (!requestedProductId) return;

            if (attempt === 0) {
                // Create the listing history entry behind a direct product URL.
                const gridUrl = new URL(window.location.href);
                gridUrl.searchParams.delete("product");
                try {
                    window.history.replaceState({}, "", cleanUrl(gridUrl.toString()));
                } catch (e) {
                    console.warn("replaceState failed:", e);
                }
            }

            await openProductModal(requestedProductId, { push: true });
            if (activeModalProductId !== requestedProductId && attempt < 2) {
                window.setTimeout(() => openRequestedProduct(attempt + 1), 250);
            }
        };
        if (requestedProductId) {
            Promise.resolve(initialCatalogLoad).then(openRequestedProduct, openRequestedProduct);
        }

        initializeAccountManager();
        normalizeProducts();
        if (currentPage === 1) renderProducts();
        Promise.resolve(initialCatalogLoad).then(() => {
            renderProducts();
        }).catch(() => {
            renderProducts();
        });
        updateCartCount();
        renderCart();
        bindEvents();
        setupAccountDrawer();
        updatePaymentMethodUI();
        updateFavoritesUI();

        const paginationEl = document.getElementById("pagination");
        if (paginationEl) {
            paginationEl.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-pg-num]");
                if (btn) { goToPage(Number(btn.dataset.pgNum)); return; }
                const nav = e.target.closest("[data-pg-action]");
                if (!nav) return;
                const filtered = getFilteredProducts();
                const categoryView = activeCategory !== "all" && window.BondsmallCatalog && typeof window.BondsmallCatalog.getCategoryTotal === "function";
                const catalogTotal = categoryView ? window.BondsmallCatalog.getCategoryTotal(activeCategory) : (window.BondsmallCatalog ? window.BondsmallCatalog.totalCount : filtered.length);
                const totalPages = Math.ceil((categoryView ? catalogTotal : Math.max(filtered.length, catalogTotal)) / getProductsPerPage());
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
                    const categoryView = activeCategory !== "all" && window.BondsmallCatalog && typeof window.BondsmallCatalog.getCategoryTotal === "function";
                    const catalogTotal = categoryView ? window.BondsmallCatalog.getCategoryTotal(activeCategory) : (window.BondsmallCatalog ? window.BondsmallCatalog.totalCount : filtered.length);
                    const totalPages = Math.ceil((categoryView ? catalogTotal : Math.max(filtered.length, catalogTotal)) / getProductsPerPage());
                    if (val >= 1 && val <= totalPages) goToPage(val);
                    e.target.value = "";
                }
            });
        }

        let lastWidth = window.innerWidth;
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth !== lastWidth) {
                    lastWidth = window.innerWidth;
                    currentPage = 1;
                    renderProducts();
                }
            }, 200);
        });

        // Keep pagination and the product modal in sync with browser history so
        // the Back arrow returns to the previous page/product instead of leaving
        // the site.
        window.addEventListener("popstate", () => {
            const pageFromUrl = getPageFromUrl();
            if (pageFromUrl !== currentPage) {
                currentPage = pageFromUrl;
                renderProducts();
            }
            const id = getProductIdFromUrl();
            if (id) {
                if (activeModalProductId !== id) openProductModal(id, { push: false });
            } else if (activeModalProductId !== null) {
                hideProductModal();
            }
        });


        let textActivationCount = 0;
        let gleamTimeoutId = null;

        function triggerLogoGleam() {
            document.querySelectorAll('.logo').forEach((logoContainer) => {
                if (logoContainer.querySelector('.logo-gleam-overlay')) return;
                const overlay = document.createElement('div');
                overlay.className = 'logo-gleam-overlay';
                const sweep = document.createElement('span');
                sweep.className = 'logo-gleam-sweep';
                overlay.appendChild(sweep);
                logoContainer.appendChild(overlay);
                setTimeout(() => { overlay.remove(); }, 3100);
            });
        }

        setInterval(() => {
            document.querySelectorAll('.logo').forEach((logoContainer) => {
                const text = logoContainer.querySelector('.logo-text');
                const img = logoContainer.querySelector('.logo-img');
                if (!text || !img) return;
                const showingText = text.classList.contains('logo-face--active');
                text.classList.toggle('logo-face--active', !showingText);
                img.classList.toggle('logo-face--active', showingText);
            });
            const textFace = document.querySelector('.logo .logo-text');
            if (textFace && textFace.classList.contains('logo-face--active')) {
                textActivationCount += 1;
                if (textActivationCount % 2 === 1) {
                    clearTimeout(gleamTimeoutId);
                    gleamTimeoutId = setTimeout(triggerLogoGleam, 7000);
                }
            }
        }, 10000);
    }

    function startWhenCatalogReady() {
        if (window.BondsmallCatalogReady || !window.BondsmallCatalog) init();
        else document.addEventListener('bondsmall-catalog-ready', init, { once: true });
        document.addEventListener('bondsmall-catalog-error', () => {
            const grid = document.getElementById('product-grid');
            if (grid) grid.innerHTML = '<p class="empty-state">Products are loading. Please refresh in a moment.</p>';
        }, { once: true });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startWhenCatalogReady);
    } else {
        startWhenCatalogReady();
    }
})();
