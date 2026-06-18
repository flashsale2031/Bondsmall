/**
 * Detailed product modal content. Depends on global `products` from products.js.
 * Exposes window.populateProductPopup(product, { categoryLabels }).
 */

function formatPopupMoney(value) {
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function inferBrandFromName(name) {
    if (!name) {
        return "";
    }
    const stripped = String(name).replace(/^(Men's|Women's)\s+/i, "").trim();
    const beforeAmpersand = stripped.split("&")[0].trim();
    const words = beforeAmpersand.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).join(" ");
}

/** Catalog row → popup shape (salePrice, retailPrice, specs, brand, …) */
function enrichForPopup(product) {
    const imgs = [...new Set([product.image, ...(product.images || [])].filter(Boolean))];

    let retailPrice = product["retail price"] || product.retailPrice || 0;
    if (!retailPrice) {
        retailPrice = (typeof product.price === "number" ? product.price : 0) * 1.1;
    }

    let salePrice = product["sale price"] || product.salePrice || retailPrice;
    if (!salePrice) {
        salePrice = typeof product.price === "number" ? product.price : retailPrice;
    }

    const preOwnedPrice = product["pre-owned price"] || null;

    const brand = (product.specifications && product.specifications.brand && product.specifications.brand.trim())
        || product.brand
        || inferBrandFromName(product.name)
        || "";

    const specifications = Object.assign(
        {
            brand: brand,
            model: "",
            year: "",
            condition: "New",
            color: "",
            material: "",
            weight: "",
            length: "",
            height: "",
            width: ""
        },
        product.specifications || {}
    );
    specifications.brand = brand;

    return {
        ...product,
        mainPhoto: imgs[0] || "",
        images: imgs,
        salePrice: salePrice,
        retailPrice: retailPrice,
        preOwnedPrice: preOwnedPrice,
        brand: brand,
        productType: product.productType || product.category,
        specifications
    };
}

function initDeliveryOptions() {
    const container = document.getElementById("delivery-options");
    if (!container) return;

    const deliveryOptions = [
        { id: "std", label: "Standard shipping", price: 0, days: "5–7 business days" },
        { id: "exp", label: "Express shipping", price: 9.99, days: "2–3 business days" }
    ];

    container.innerHTML = "";
    deliveryOptions.forEach((opt, i) => {
        const div = document.createElement("div");
        div.className = "delivery-option" + (i === 0 ? " selected" : "");
        div.tabIndex = 0;
        div.setAttribute("role", "radio");
        div.setAttribute("aria-checked", i === 0 ? "true" : "false");
        div.textContent = `${opt.label} — ${opt.price === 0 ? "Free" : `$${opt.price.toFixed(2)}`} · ${opt.days}`;
        div.dataset.id = opt.id;
        div.addEventListener("click", () => {
            [...container.children].forEach((child) => {
                child.classList.remove("selected");
                child.setAttribute("aria-checked", "false");
            });
            div.classList.add("selected");
            div.setAttribute("aria-checked", "true");
        });
        container.appendChild(div);
    });
}

function initSoldBySection() {
    const section = document.getElementById("sold-by");
    if (!section) return;
    section.innerHTML =
        '<p class="sold-by-text">Sold by <em style="font-style:italic">Bonds Mall</em></p>';
}

function initCoverageSection() {
    const section = document.getElementById("coverage");
    if (!section) return;
    section.innerHTML =
        '<h2 class="coverage-heading">Coverage</h2>' +
        '<p class="coverage-text">Covered by ' +
        '<a class="coverage-link" href="https://www.example.com/purchase-protection" target="_blank" rel="noopener noreferrer">' +
        'Purchase Protection Insurance' +
        '<svg class="coverage-link-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '</a>' +
        ' and our 90-Day Warranty</p>';
}

function initVariants(product) {
    const el = document.getElementById("variants");
    if (!el) return;
    el.innerHTML = ""; // Clear existing

    const name = (product.name || "").toLowerCase();
    const description = (product.description || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const brand = (product.brand || "").toLowerCase();

    const shoeWords = ["shoe", "sneaker", "boot", "sandal", "heel"];
    const isShoe = shoeWords.some(w => name.includes(w) || description.includes(w));

    let labelText = "";
    let options = [];
    let variantType = "default";

    if (isShoe) {
        variantType = "shoe";
        labelText = "Shoe Size";
        options = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13"];
    } else if (category === "men" || category === "women") {
        variantType = "clothing";
        labelText = "Size";
        options = ["S", "M", "L", "XL"];
    } else if (category === "electronics" && (brand.includes("apple") || name.includes("apple"))) {
        variantType = "apple";
        labelText = "Storage";
        options = ["256 GB", "512 GB", "1 TB", "2 TB", "4 TB"];
    } else {
        variantType = "default";
        labelText = "";
        options = ["Standard"];
    }

    // Set initial window._selectedVariant to the first option
    window._selectedVariant = options[0];

    // For default, we render a single chip
    if (variantType === "default") {
        const chipGroup = document.createElement("div");
        chipGroup.className = "condition-chips";
        chipGroup.setAttribute("role", "radiogroup");
        chipGroup.setAttribute("aria-label", "Variant Selection");

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "condition-chip active";
        chip.textContent = "Standard";
        chip.setAttribute("role", "radio");
        chip.setAttribute("aria-checked", "true");
        chipGroup.appendChild(chip);
        el.appendChild(chipGroup);
        return;
    }

    // Label heading
    const sectionLabel = document.createElement("h2");
    sectionLabel.className = "popup-h2";
    sectionLabel.style.marginBottom = "0.45rem";
    sectionLabel.textContent = labelText;
    el.appendChild(sectionLabel);

    const chipGroup = document.createElement("div");
    chipGroup.className = "condition-chips";
    chipGroup.setAttribute("role", "radiogroup");
    chipGroup.setAttribute("aria-label", labelText);

    options.forEach((opt, idx) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "condition-chip" + (idx === 0 ? " active" : "");
        chip.textContent = opt;
        chip.setAttribute("role", "radio");
        chip.setAttribute("aria-checked", idx === 0 ? "true" : "false");

        chip.addEventListener("click", () => {
            chipGroup.querySelectorAll(".condition-chip").forEach((c) => {
                c.classList.remove("active");
                c.setAttribute("aria-checked", "false");
            });
            chip.classList.add("active");
            chip.setAttribute("aria-checked", "true");
            window._selectedVariant = opt;
        });

        chipGroup.appendChild(chip);
    });

    el.appendChild(chipGroup);
}

function initCondition(product) {
    const conditionSelect = document.getElementById("condition-select");
    const conditionSection = document.getElementById("condition");
    const saleEl = document.getElementById("sale-price");
    if (!conditionSection) return;

    // Keep the native select in sync but hide it visually
    if (conditionSelect) conditionSelect.style.display = "none";

    // Remove any previously rendered chip group to avoid duplicates on re-open
    const existing = conditionSection.querySelector(".condition-chips");
    if (existing) existing.remove();

    const basePrice = product.salePrice || product.price || 0;
    const conditionValue =
        (product.specifications && product.specifications.condition) || "New";

    const options = ["New", "Pre-Owned"];

    // Helper: update the displayed sale price based on chosen condition
    function applyConditionPrice(opt) {
        if (!saleEl) return;
        if (opt === "Pre-Owned") {
            const discounted = Math.round(basePrice * 0.8 * 100) / 100;
            saleEl.textContent = formatPopupMoney(discounted);
            saleEl.title = "20% Pre-Owned discount applied";
        } else {
            saleEl.textContent = formatPopupMoney(basePrice);
            saleEl.title = "";
        }
    }

    const chipGroup = document.createElement("div");
    chipGroup.className = "condition-chips";
    chipGroup.setAttribute("role", "radiogroup");
    chipGroup.setAttribute("aria-label", "Condition");

    options.forEach((opt) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "condition-chip" + (opt === conditionValue ? " active" : "");
        chip.textContent = opt;
        chip.setAttribute("role", "radio");
        chip.setAttribute("aria-checked", opt === conditionValue ? "true" : "false");

        chip.addEventListener("click", () => {
            chipGroup.querySelectorAll(".condition-chip").forEach((c) => {
                c.classList.remove("active");
                c.setAttribute("aria-checked", "false");
            });
            chip.classList.add("active");
            chip.setAttribute("aria-checked", "true");
            if (conditionSelect) conditionSelect.value = opt;
            applyConditionPrice(opt);
        });

        chipGroup.appendChild(chip);
    });

    const label = conditionSection.querySelector("label");
    if (label) {
        label.insertAdjacentElement("afterend", chipGroup);
    } else {
        conditionSection.appendChild(chipGroup);
    }

    // Apply price for the initially selected condition
    applyConditionPrice(conditionValue);
}


function initDescription(product) {
    const fullDescription = product.description || "";
    const shortDescription =
        fullDescription.length > 250 ? `${fullDescription.slice(0, 250)}…` : fullDescription;

    const shortDescEl = document.getElementById("short-description");
    const fullDescEl = document.getElementById("full-description");
    const toggleBtn = document.getElementById("toggle-description-btn");

    if (!shortDescEl || !fullDescEl || !toggleBtn) return;

    shortDescEl.textContent = shortDescription || "No description.";
    fullDescEl.textContent = fullDescription || "No description.";
    shortDescEl.style.display = "block";

    if (fullDescription.length <= 250) {
        toggleBtn.style.display = "none";
        fullDescEl.hidden = true;
    } else {
        toggleBtn.style.display = "inline";
        toggleBtn.setAttribute("aria-expanded", "false");
        fullDescEl.hidden = true;
        toggleBtn.textContent = "See More";
        toggleBtn.onclick = () => {
            const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
            toggleBtn.setAttribute("aria-expanded", String(!expanded));
            if (expanded) {
                fullDescEl.hidden = true;
                shortDescEl.style.display = "block";
                toggleBtn.textContent = "See More";
            } else {
                fullDescEl.hidden = false;
                shortDescEl.style.display = "none";
                toggleBtn.textContent = "See Less";
            }
        };
    }
}

function formatSpecKey(key) {
    if (key.toLowerCase() === "ram") return "RAM";
    if (key.toLowerCase() === "os") return "OS";
    if (key.toLowerCase() === "gpu") return "GPU";
    if (key.toLowerCase() === "ssd") return "SSD";
    if (key.toLowerCase() === "hdmi") return "HDMI";
    if (key.toLowerCase() === "cpu") return "CPU";
    
    return key
        .split(/[_-]/)
        .map(word => {
            if (word.toLowerCase() === "of") return "of";
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

function initSpecifications(product) {
    const container = document.getElementById("specifications-form");
    if (!container) return;
    container.innerHTML = "";

    const specsObj = product.specifications || {};
    Object.keys(specsObj).forEach((key) => {
        const rawValue = specsObj[key];
        // Only display if the value is not empty, not "N/A", and not a placeholder dash
        if (rawValue !== undefined && rawValue !== null && rawValue !== "" && rawValue !== "—" && rawValue !== "N/A") {
            const formattedLabel = formatSpecKey(key);

            const div = document.createElement("div");

            const label = document.createElement("label");
            label.textContent = `${formattedLabel}:`;

            const span = document.createElement("span");
            span.className = "spec-value";
            span.style.fontWeight = "normal"; // Ensure value is in regular (non-bold) text
            span.textContent = rawValue;

            div.appendChild(label);
            div.appendChild(span);
            container.appendChild(div);
        }
    });
}

const similarState = {
    catalog: [],
    list: [],
    start: 0
};

function renderSimilarCarouselSlice() {
    const slideContainer = document.getElementById("similar-products-slide");
    const prevBtn = document.getElementById("similar-prev");
    const nextBtn = document.getElementById("similar-next");
    if (!slideContainer) return;

    slideContainer.innerHTML = "";

    similarState.list.forEach((p) => {
        const card = document.createElement("div");
        card.className = "similar-product-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.dataset.productId = String(p.id);
        card.setAttribute("aria-label", `View ${p.name}`);

        const img = document.createElement("img");
        img.alt = "";
        img.src = p.mainPhoto || p.image || "";

        const titleEl = document.createElement("div");
        titleEl.className = "similar-product-title";
        titleEl.textContent = p.name || "";

        const priceEl = document.createElement("div");
        priceEl.className = "similar-product-price";
        priceEl.textContent = formatPopupMoney(p.salePrice || p.price || 0);

        card.appendChild(img);
        card.appendChild(titleEl);
        card.appendChild(priceEl);
        slideContainer.appendChild(card);
    });

    const children = [...slideContainer.children];
    children.forEach((ch, idx) => {
        ch.hidden = !(idx >= similarState.start && idx < similarState.start + 3);
        ch.style.display = ch.hidden ? "none" : "";
    });

    const hasNav = similarState.list.length > 3;
    if (prevBtn) prevBtn.hidden = !hasNav;
    if (nextBtn) nextBtn.hidden = !hasNav;
}

function initSimilarProducts(enrichedProduct) {
    if (typeof products === "undefined") return;

    similarState.catalog = products;
    const anchor = enrichedProduct.salePrice || enrichedProduct.price || 0;

    similarState.list = products
        .filter((p) => p.id !== enrichedProduct.id && p.category === enrichedProduct.category)
        .sort((a, b) => Math.abs(a.price - anchor) - Math.abs(b.price - anchor))
        .slice(0, 10)
        .map((p) => enrichForPopup(p));

    similarState.start = 0;
    renderSimilarCarouselSlice();
}

function ensureDelegatedListeners() {
    if (window.__productPopupDelegatesAttached) return;
    window.__productPopupDelegatesAttached = true;

    document.getElementById("similar-prev")?.addEventListener("click", () => {
        similarState.start = Math.max(0, similarState.start - 1);
        renderSimilarCarouselSlice();
    });

    document.getElementById("similar-next")?.addEventListener("click", () => {
        const maxStart = Math.max(similarState.list.length - 3, 0);
        similarState.start = Math.min(maxStart, similarState.start + 1);
        renderSimilarCarouselSlice();
    });

    document.getElementById("similar-products-slide")?.addEventListener("click", (event) => {
        const card = event.target.closest(".similar-product-card");
        const id = card?.dataset.productId;
        if (id && typeof window.BondsMallOpenProductById === "function") {
            window.BondsMallOpenProductById(id);
        }
    });

    document.getElementById("review-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const msg = document.getElementById("review-messages");
        const ratingChecked = document.querySelector('#review-form input[name="rating"]:checked');
        const commentEl = document.getElementById("review-comment");

        const starCount = ratingChecked ? ratingChecked.value : null;

        if (msg) {
            msg.textContent = starCount
                ? `Thanks for your ${starCount}-star review!`
                : "Thanks for your review!";
            msg.style.display = "block";
        }

        // Clear the comment box
        if (commentEl) commentEl.value = "";

        // Reset star selection
        document.querySelectorAll('#review-form input[name="rating"]').forEach((r) => {
            r.checked = false;
        });
    });
}

/* ── Photo strip carousel (max 8 photos, one-at-a-time navigation) ── */
function populatePhotos(enrichedProduct) {
    const mainImg = document.getElementById("main-photo");
    if (!mainImg) {
        console.warn("Element #main-photo not found in DOM.");
        return;
    }

    const track   = document.getElementById("photo-strip-track");
    let prevBtn    = document.getElementById("photo-strip-prev");
    let nextBtn    = document.getElementById("photo-strip-next");

    const MAX_PHOTOS = 8;
    let urls = (enrichedProduct.images || []).filter(Boolean).slice(0, MAX_PHOTOS);
    if (urls.length === 0 && enrichedProduct.image) {
        urls = [enrichedProduct.image];
    }

    /* ── Set the main display image ── */
    mainImg.src = urls[0] || "";
    mainImg.alt = enrichedProduct.name || "";
    mainImg.style.display = "block";
    mainImg.style.maxWidth = "100%";


    if (!track) return;
    track.innerHTML = "";

    if (urls.length === 0) {
        if (prevBtn) prevBtn.hidden = true;
        if (nextBtn) nextBtn.hidden = true;
        return;
    }

    /* ── State ── */
    let currentIdx = 0;

    /* ── Build one thumb button per photo ── */
    const thumbEls = urls.map((src, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "photo-thumb" + (idx === 0 ? " is-active" : "");
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", idx === 0 ? "true" : "false");
        btn.setAttribute("aria-label", `Photo ${idx + 1} of ${urls.length}`);

        const im = document.createElement("img");
        im.src = src;
        im.alt = "";
        im.loading = "lazy";
        btn.appendChild(im);

        btn.addEventListener("click", () => activateThumb(idx));
        track.appendChild(btn);
        return btn;
    });

    /* ── Activate a thumb: update main photo + active highlight + arrows ── */
    function activateThumb(idx) {
        currentIdx = idx;

        thumbEls.forEach((b, i) => {
            b.classList.toggle("is-active", i === idx);
            b.setAttribute("aria-selected", i === idx ? "true" : "false");
        });

        if (mainImg) mainImg.src = urls[idx];

        updateArrows();
        scrollThumbIntoView(idx);
    }

    /* ── Arrow visibility rules ──
       • Start (idx 0)     → hide [ (prev), show ] (next)
       • Middle            → show both
       • Last (idx n-1)    → show both; ] click wraps to start AND hides [
    ── */
    function updateArrows() {
        const pBtn = document.getElementById("photo-strip-prev");
        const nBtn = document.getElementById("photo-strip-next");
        if (!pBtn || !nBtn) return;

        if (currentIdx === 0) {
            pBtn.hidden = true;   // [ hidden at start
            nBtn.hidden = false;  // ] always visible at start
        } else {
            pBtn.hidden = false;  // [ visible once we move past photo 1
            nBtn.hidden = false;  // ] always visible (wraps at end)
        }
    }

    /* ── Scroll active thumb into view within the track ── */
    function scrollThumbIntoView(idx) {
        if (thumbEls[idx]) {
            thumbEls[idx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
    }

    /* ── Wire arrow buttons (replace nodes to clear any stale listeners) ── */
    function rewireArrow(id, handler) {
        const old = document.getElementById(id);
        if (!old) return;
        const fresh = old.cloneNode(true);
        old.parentNode.replaceChild(fresh, old);
        fresh.addEventListener("click", handler);
    }

    rewireArrow("photo-strip-next", () => {
        if (currentIdx < urls.length - 1) {
            // Advance to next photo
            activateThumb(currentIdx + 1);
        } else {
            // At last photo → wrap back to the beginning
            activateThumb(0);
        }
    });

    rewireArrow("photo-strip-prev", () => {
        if (currentIdx > 0) {
            activateThumb(currentIdx - 1);
        }
    });

    /* ── Initial arrow state ── */
    const initPrev = document.getElementById("photo-strip-prev");
    const initNext = document.getElementById("photo-strip-next");
    if (initPrev) initPrev.hidden = true;                    // [ hidden at start
    if (initNext) initNext.hidden = urls.length <= 1;        // ] hidden if only 1 photo
}

function resetReviewUi() {
    const msg = document.getElementById("review-messages");
    if (msg) {
        msg.textContent = "";
        msg.style.display = "none";
    }
    const comment = document.getElementById("review-comment");
    if (comment) comment.value = "";
    document.querySelectorAll('#review-form input[name="rating"]').forEach((r) => {
        r.checked = false;
    });
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

window.populateProductPopup = function populateProductPopup(product, opts) {
    const categoryLabels = (opts && opts.categoryLabels) || {};
    ensureDelegatedListeners();

    const enriched = enrichForPopup(product);

    const qty = document.getElementById("quantity");
    if (qty) qty.value = 1;

    const titleEl = document.getElementById("productName");
    if (titleEl) titleEl.textContent = enriched.name || "";

    const catEl = document.getElementById("product-category-label");
    const luxuryBrands = ["dolce & gabbana", "louis vuitton", "yves saint laurent", "gucci", "prada", "hermes", "fendi", "chanel", "dior", "abercrombie & fitch", "bathing ape", "bathing apes", "michael kors", "rolex", "patek philippe", "marc jacobs", "us mint"];
    const isLuxury = luxuryBrands.some(brand => (product.name || "").toLowerCase().includes(brand));

    if (catEl) {
        catEl.textContent = categoryLabels[product.category] || product.category || "";
    }

    const retailEl = document.getElementById("retail-price");
    const saleEl = document.getElementById("sale-price");
    if (retailEl) retailEl.textContent = formatPopupMoney(enriched.retailPrice);
    if (saleEl) saleEl.textContent = formatPopupMoney(enriched.salePrice);

    let preownedEl = document.getElementById("preowned-price");
    if (enriched.preOwnedPrice && enriched.preOwnedPrice > 0) {
        if (!preownedEl) {
            preownedEl = document.createElement("span");
            preownedEl.id = "preowned-price";
            preownedEl.style.color = "#8c2f39";
            preownedEl.style.fontWeight = "800";
            preownedEl.style.fontSize = "1rem";
            preownedEl.style.marginLeft = "0.5rem";
            if (saleEl) {
                saleEl.parentNode.insertBefore(preownedEl, saleEl.nextSibling);
            }
        }
        preownedEl.textContent = `Pre-Owned: ${formatPopupMoney(enriched.preOwnedPrice)}`;
        preownedEl.style.display = "";
    } else {
        if (preownedEl) {
            preownedEl.style.display = "none";
        }
    }

    populatePhotos(enriched);
    initDeliveryOptions();
    initSoldBySection();

    // Fix 2: Separated, independent Authenticity and Sold By sections
    const originalSoldBy = document.getElementById("sold-by");
    if (originalSoldBy) {
        originalSoldBy.style.display = "none"; // Hide original container

        // Inject responsive CSS if not already present in <head>
        if (!document.getElementById("popup-sections-responsive-style")) {
            const style = document.createElement("style");
            style.id = "popup-sections-responsive-style";
            style.textContent = `
                .popup-split-section {
                    border-top: 1px solid #eadfce;
                    padding: 0.85rem 0;
                    margin-top: 1.25rem;
                    width: 100%;
                    box-sizing: border-box;
                }
                #popup-authenticity-section + #popup-sold-by-section {
                    margin-top: 0;
                }
                #popup-sold-by-section + #sold-by + .popup-section,
                #popup-sold-by-section + .popup-section {
                    margin-top: 0;
                }
                @media (max-width: 480px) {
                    .popup-split-section {
                        padding: 0.65rem 0;
                        margin-top: 1rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Clean up previously created elements to prevent duplication on re-open
        const oldAuth = document.getElementById("popup-authenticity-section");
        if (oldAuth) oldAuth.remove();
        const oldSoldBy = document.getElementById("popup-sold-by-section");
        if (oldSoldBy) oldSoldBy.remove();

        // Create independent Authenticity section
        const authSection = document.createElement("div");
        authSection.id = "popup-authenticity-section";
        authSection.className = "popup-split-section";
        authSection.style.display = "flex";
        authSection.style.justifyContent = "flex-end";
        authSection.style.alignItems = "center";
        authSection.style.textAlign = "right";

        if (isLuxury) {
            authSection.innerHTML = `
                <span class="luxury-badge-popup" style="background: #ffffff; color: #1c1b1a; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 6px; border: 1px solid #d0c9be; letter-spacing: 0.04em; font-family: var(--badge-font); display: inline-flex; align-items: center; gap: 3px; vertical-align: middle; pointer-events: none;">
                    <svg style="width: 9px; height: 9px; flex-shrink: 0;" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    Authenticity Guaranteed
                </span>
            `;
            originalSoldBy.parentNode.insertBefore(authSection, originalSoldBy);
        }

        // Create independent Sold By section
        const soldBySection = document.createElement("div");
        soldBySection.id = "popup-sold-by-section";
        soldBySection.className = "popup-split-section";
        soldBySection.style.display = "flex";
        soldBySection.style.justifyContent = "flex-start";
        soldBySection.style.alignItems = "center";
        soldBySection.style.textAlign = "left";
        soldBySection.innerHTML = `<p class="sold-by-text" style="margin: 0; color: #5c5348; font-size: 0.95rem;">Sold by <em style="font-style:italic">Bonds Mall</em></p>`;
        originalSoldBy.parentNode.insertBefore(soldBySection, originalSoldBy);
    }


    
    initCoverageSection();
    initVariants(enriched);
    initCondition(enriched);
    initDescription(enriched);
    initSpecifications(enriched);
    initSimilarProducts(enriched);

    // Dynamic JSON-LD structured data injection for Product
    const oldScript = document.getElementById('dynamic-product-schema');
    if (oldScript) {
        oldScript.remove();
    }
    const additionalImages = (product.images || []).filter(Boolean);
    const allImages = [product.image, ...additionalImages].slice(0, 3);
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

    // Dynamic footer menu injection inside product popup
    const modalBody = document.querySelector(".product-detail-modal-body");
    if (modalBody) {
        let existingFooter = modalBody.querySelector(".site-footer");
        if (!existingFooter) {
            const footerContainer = document.createElement("div");
            footerContainer.innerHTML = getFooterHTML();
            modalBody.appendChild(footerContainer.firstElementChild);
        }
    }

    resetReviewUi();
};

document.addEventListener("DOMContentLoaded", ensureDelegatedListeners);

/* ── Image Lightbox with carousel navigation ── */
(function initLightbox() {
    const lightbox   = document.getElementById("img-lightbox");
    const lbImg      = document.getElementById("img-lightbox-img");
    const lbClose    = document.getElementById("img-lightbox-close");
    const lbBackdrop = document.getElementById("img-lightbox-backdrop");
    const lbPrev     = document.getElementById("img-lightbox-prev");
    const lbNext     = document.getElementById("img-lightbox-next");
    const lbCounter  = document.getElementById("img-lightbox-counter");
    const lbThumbsTrack = document.getElementById("img-lightbox-thumbs-track");

    if (!lightbox || !lbImg) return;

    /* ── State ── */
    let lbUrls   = [];   // current product's photo array (up to 8)
    let lbIndex  = 0;    // currently displayed photo index

    /* ── Helpers ── */
    function getThumbEls() {
        return Array.from(document.querySelectorAll("#photo-strip-track .photo-thumb"));
    }

    function syncThumbs(idx) {
        // Sync main product display thumbnails
        getThumbEls().forEach((btn, i) => {
            btn.classList.toggle("is-active", i === idx);
            btn.setAttribute("aria-selected", i === idx ? "true" : "false");
        });

        // Sync lightbox thumbnails
        if (lbThumbsTrack) {
            const lbThumbs = Array.from(lbThumbsTrack.querySelectorAll(".img-lightbox-thumb"));
            lbThumbs.forEach((btn, i) => {
                btn.classList.toggle("is-active", i === idx);
                btn.setAttribute("aria-selected", i === idx ? "true" : "false");
            });
            // Scroll active lightbox thumb into view if overflow exists
            const activeThumb = lbThumbs[idx];
            if (activeThumb) {
                activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
        }
    }

    function updateCounter() {
        if (!lbCounter) return;
        lbCounter.textContent = lbUrls.length > 1
            ? `${lbIndex + 1} / ${lbUrls.length}`
            : "";
    }

    function updateNavVisibility() {
        if (!lbPrev || !lbNext) return;
        // Hide arrows entirely if only 1 photo
        const single = lbUrls.length <= 1;
        lbPrev.hidden = single;
        lbNext.hidden = single;
    }

    /* ── Slide image with direction animation ── */
    function showImage(idx, direction) {
        // direction: "right" = going forward (❯), "left" = going back (❮)
        lbIndex = ((idx % lbUrls.length) + lbUrls.length) % lbUrls.length; // wrap-safe

        // Remove old animation classes first
        lbImg.classList.remove("lb-slide-right", "lb-slide-left");

        // Force reflow so re-adding the class triggers the animation
        void lbImg.offsetWidth;

        lbImg.src = lbUrls[lbIndex];
        lbImg.alt = `Photo ${lbIndex + 1} of ${lbUrls.length}`;

        if (direction === "right") lbImg.classList.add("lb-slide-right");
        else if (direction === "left") lbImg.classList.add("lb-slide-left");

        syncThumbs(lbIndex);
        updateCounter();
    }

    /* ── Render horizontal thumbnails inside the fullscreen lightbox ── */
    function renderLightboxThumbs() {
        if (!lbThumbsTrack) return;
        lbThumbsTrack.innerHTML = "";

        if (lbUrls.length <= 1) {
            lbThumbsTrack.style.display = "none";
            return;
        } else {
            lbThumbsTrack.style.display = "flex";
        }

        lbUrls.forEach((src, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "img-lightbox-thumb" + (idx === lbIndex ? " is-active" : "");
            btn.setAttribute("role", "option");
            btn.setAttribute("aria-selected", idx === lbIndex ? "true" : "false");
            btn.setAttribute("aria-label", `Photo ${idx + 1} of ${lbUrls.length}`);

            const im = document.createElement("img");
            im.src = src;
            im.alt = "";
            im.loading = "lazy";
            btn.appendChild(im);

            btn.addEventListener("click", () => {
                if (idx === lbIndex) return;
                const direction = idx > lbIndex ? "right" : "left";
                showImage(idx, direction);
            });

            lbThumbsTrack.appendChild(btn);
        });
    }

    /* ── Open lightbox at a specific index ── */
    let savedScrollY = 0;
    function openLightbox(urlsArray, startIndex) {
        lbUrls  = urlsArray;
        lbIndex = startIndex;

        lbImg.classList.remove("lb-slide-right", "lb-slide-left");
        lbImg.src = lbUrls[lbIndex] || "";
        lbImg.alt = `Photo ${lbIndex + 1} of ${lbUrls.length}`;

        renderLightboxThumbs();
        updateCounter();
        updateNavVisibility();

        /* ── Attach 2× hover zoom to lightbox image (desktop pointer only) ── */
        if (window.matchMedia("(pointer: fine)").matches) {
            lbImg.style.cursor = "crosshair";
            lbImg.style.transformOrigin = "50% 50%";
            lbImg.style.transform = "scale(1)";
            lbImg._lbZoomMove = (e) => {
                const rect = lbImg.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                lbImg.style.transition = "none";
                lbImg.style.transformOrigin = `${x}% ${y}%`;
                lbImg.style.transform = "scale(2)";
            };
            lbImg._lbZoomLeave = () => {
                lbImg.style.transition = "transform 0.15s ease";
                lbImg.style.transform = "scale(1)";
                lbImg.style.transformOrigin = "50% 50%";
            };
            lbImg.removeEventListener("mousemove", lbImg._lbZoomMove);
            lbImg.removeEventListener("mouseleave", lbImg._lbZoomLeave);
            lbImg.addEventListener("mousemove", lbImg._lbZoomMove);
            lbImg.addEventListener("mouseleave", lbImg._lbZoomLeave);
        }

        /* Save scroll position before locking */
        savedScrollY = window.scrollY;
        lightbox.hidden = false;
        document.body.classList.add("lightbox-open");
        document.body.style.top = `-${savedScrollY}px`;
        lbClose && lbClose.focus();
    }

    function closeLightbox() {
        lightbox.hidden = true;
        lbImg.src = "";
        lbImg.classList.remove("lb-slide-right", "lb-slide-left");
        /* Reset zoom state */
        lbImg.style.transform = "scale(1)";
        lbImg.style.transformOrigin = "50% 50%";
        lbImg.style.cursor = "";
        if (lbImg._lbZoomMove)  lbImg.removeEventListener("mousemove",  lbImg._lbZoomMove);
        if (lbImg._lbZoomLeave) lbImg.removeEventListener("mouseleave", lbImg._lbZoomLeave);
        /* Restore scroll position after unlocking */
        document.body.classList.remove("lightbox-open");
        document.body.style.top = "";
        window.scrollTo(0, savedScrollY);
    }

    /* ── Click on main photo → open at that photo's index ── */
    document.addEventListener("click", (e) => {
        const img = e.target.closest("#main-photo");
        if (!img || !img.src) return;

        // Collect current product photos from the strip track
        const thumbs = getThumbEls();
        const urls   = thumbs.map(btn => btn.querySelector("img")?.src).filter(Boolean);

        // Find which index matches the currently displayed main photo
        let startIdx = urls.indexOf(img.src);
        if (startIdx === -1) startIdx = 0;

        openLightbox(urls.length ? urls : [img.src], startIdx);
    });

    /* ── Arrow navigation ── */
    if (lbNext) {
        lbNext.addEventListener("click", () => {
            showImage(lbIndex + 1, "right");
        });
    }

    if (lbPrev) {
        lbPrev.addEventListener("click", () => {
            showImage(lbIndex - 1, "left");
        });
    }

    /* ── Close controls ── */
    if (lbClose)    lbClose.addEventListener("click", closeLightbox);
    if (lbBackdrop) lbBackdrop.addEventListener("click", closeLightbox);

    /* ── Keyboard navigation ── */
    document.addEventListener("keydown", (e) => {
        if (lightbox.hidden) return;
        if (e.key === "Escape")      closeLightbox();
        if (e.key === "ArrowRight")  showImage(lbIndex + 1, "right");
        if (e.key === "ArrowLeft")   showImage(lbIndex - 1, "left");
    });

    /* ── Touch / swipe support ── */
    let touchStartX = 0;
    lightbox.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
        if (lightbox.hidden) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < 40) return; // ignore small swipes
        if (dx < 0) showImage(lbIndex + 1, "right"); // swipe left → next
        else        showImage(lbIndex - 1, "left");  // swipe right → prev
    }, { passive: true });
})();

