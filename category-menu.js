/**
 * category-menu.js
 * Shared module: hamburger -> category slide drawer
 * Works on index.html (filters inline) and search-results.html (navigates to results).
 */
(() => {
    // Critical fallback styles are injected here so the drawer can never fall back
    // into normal document flow when a cached/missing stylesheet leaves the page unstyled.
    const styleId = "bonds-mall-menu-critical-style";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .header{position:sticky;top:0;z-index:200;display:grid;grid-template-columns:1fr minmax(180px,540px) 1fr;gap:1rem;align-items:center;min-height:90px;padding:1rem clamp(1rem,3vw,2rem);background:rgba(255,253,248,.97);border-bottom:1px solid #e8dfd3;overflow:visible}
            .header-left{display:flex;align-items:center;gap:1rem;min-width:0}
            .menu-btn{appearance:none;-webkit-appearance:none;border:0;width:44px;height:44px;flex:0 0 44px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:0;margin:0;border-radius:10px;background:#111;color:#fff;cursor:pointer;position:relative;z-index:210}
            .menu-btn .bar{display:block;width:21px;height:2px;border-radius:999px;background:currentColor}
            #header-search{min-width:0;width:100%;padding:.8rem 1rem;border:1px solid #bdb5ad;border-radius:8px;background:#fff;color:#222;font:inherit}
            .header-actions{display:flex;gap:.7rem;justify-content:flex-end;align-items:center;min-width:0}
            .icon-btn{appearance:none;border:1px solid #d9ccbe;border-radius:10px;background:#fff;color:#1f1f1f;padding:.65rem .85rem;display:inline-flex;gap:.5rem;align-items:center;cursor:pointer}
            .header-icon{width:18px;height:18px;color:#1f1f1f;flex:0 0 auto}
            .cart-count{background:#111;color:#fff;min-width:20px;min-height:20px;border-radius:999px;font-size:.75rem;display:inline-flex;align-items:center;justify-content:center}
            .cat-drawer-overlay{position:fixed!important;inset:0!important;z-index:1000!important;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .2s ease,visibility 0s linear .2s}
            .cat-drawer-overlay.is-open{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .2s ease}
            .cat-drawer-backdrop{position:absolute!important;inset:0!important;background:rgba(0,0,0,.48)}
            .cat-drawer{position:absolute!important;top:0!important;left:0!important;bottom:0!important;width:min(88vw,360px);max-width:100%;display:flex!important;flex-direction:column;background:#fffdf8;color:#1c1b1a;box-shadow:12px 0 36px rgba(0,0,0,.18);overflow:hidden;transform:translateX(-105%);transition:transform .24s ease}
            .cat-drawer-overlay.is-open .cat-drawer{transform:translateX(0)}
            .cat-drawer-header{flex:0 0 auto;min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem 1.1rem;background:#111;color:#fff;border-bottom:1px solid rgba(255,255,255,.12)}
            .cat-drawer-title{display:inline-flex;align-items:center;gap:.55rem;min-width:0;font-size:1.05rem;font-weight:800;letter-spacing:.04em}
            .cat-drawer-menu-wing{width:24px;height:24px;object-fit:contain;flex:0 0 24px}
            .cat-drawer-close{appearance:none;border:0;background:transparent;color:#fff;width:40px;height:40px;flex:0 0 40px;border-radius:8px;font-size:1.35rem;line-height:1;cursor:pointer}
            .cat-drawer-list{list-style:none;flex:1 1 auto;min-height:0;margin:0;padding:.65rem;overflow-y:auto;overscroll-behavior:contain}
            .cat-drawer-list li{list-style:none;margin:0;padding:0}
            .cat-drawer-item{appearance:none;width:100%;display:flex;align-items:center;justify-content:flex-start;min-height:48px;padding:.75rem .9rem;border:0;border-radius:10px;background:transparent;color:#1c1b1a;font:inherit;font-weight:700;text-align:left;cursor:pointer}
            .cat-drawer-item:hover,.cat-drawer-item:focus-visible{background:#f2ebe1}
            .cat-drawer-item.active{background:#111;color:#fff}
            .cat-drawer-footer{flex:0 0 auto;padding:.9rem 1rem 1.1rem;border-top:1px solid #e8dfd3;background:#fffdf8}
            .cat-drawer-footer-logo{font-size:.8rem;font-weight:800;letter-spacing:.16em;color:#8b8176;text-align:center}
            @media(max-width:800px){.header{grid-template-columns:auto minmax(0,1fr) auto;gap:.55rem;padding:.7rem .75rem}.header-left{gap:.55rem}.header-actions{gap:.35rem}.icon-btn{padding:.55rem}.icon-btn>span:not(.cart-count){display:none}.menu-btn{width:42px;height:42px;flex-basis:42px}.cat-drawer{width:min(88vw,340px)}}
            @media(max-width:520px){.header{grid-template-columns:auto minmax(0,1fr) auto;min-height:74px;padding:.65rem .75rem}.menu-btn{width:40px;height:40px;flex-basis:40px}.header-actions .icon-btn{min-width:40px;justify-content:center}}
        `;
        document.head.appendChild(style);
    }

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

    const isSearchPage = document.body.classList.contains("search-results-page");
    const isAllPage = document.body.classList.contains("all-page");

    const menuBtn = document.getElementById("menu-btn");
    const overlay = document.getElementById("cat-drawer-overlay");
    const backdrop = document.getElementById("cat-drawer-backdrop");
    const closeBtn = document.getElementById("cat-drawer-close");
    const drawerItems = document.querySelectorAll(".cat-drawer-item");
    const headerSearch = document.getElementById("header-search");
    const searchPageInput = document.getElementById("sr-search");
    const popupSearch = document.getElementById("popup-header-search");

    if (!overlay) return;

    const menuButtons = document.querySelectorAll("#menu-btn, #popup-menu-btn");
    let lastMenuTrigger = null;

    function openDrawer(trigger = null) {
        lastMenuTrigger = trigger || document.activeElement;
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        menuButtons.forEach(btn => {
            btn.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
        });
        document.body.style.overflow = "hidden";
        if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
    }

    function closeDrawer({ restoreFocus = true } = {}) {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        menuButtons.forEach(btn => {
            btn.classList.remove("is-open");
            btn.setAttribute("aria-expanded", "false");
        });
        document.body.style.overflow = "";
        if (restoreFocus && lastMenuTrigger && typeof lastMenuTrigger.focus === "function") {
            requestAnimationFrame(() => lastMenuTrigger.focus());
        }
    }

    function markActive(catKey) {
        drawerItems.forEach(btn => btn.classList.toggle("active", btn.dataset.cat === catKey));
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

    function handleCategoryClick(catKey) {
        closeDrawer();
        if (catKey === "all" && !isAllPage) {
            window.location.href = "all.html";
            return;
        }
        if (isSearchPage) {
            const url = new URL(window.location.href);
            if (catKey === "all") url.searchParams.delete("category");
            else url.searchParams.set("category", catKey);
            url.searchParams.delete("page");
            url.searchParams.delete("q");
            window.history.replaceState({}, "", cleanUrl(url.toString()));
            if (typeof window.SRPage !== "undefined" && typeof window.SRPage.refresh === "function") window.SRPage.refresh();
        } else if (isAllPage) {
            const categoryBtns = document.querySelectorAll(".category-btn");
            categoryBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.category === catKey));
            document.dispatchEvent(new CustomEvent("drawer-category-select", { detail: { category: catKey } }));
        } else {
            window.location.href = `search-results.html?category=${encodeURIComponent(catKey)}`;
        }
    }

    if (!isSearchPage) {
        [headerSearch].filter(Boolean).forEach(input => input.addEventListener("keydown", e => {
            if (e.key !== "Enter") return;
            const term = input.value.trim();
            if (term) window.location.href = `search-results.html?q=${encodeURIComponent(term)}`;
        }));
    }

    if (isSearchPage && searchPageInput) searchPageInput.setAttribute("autocomplete", "off");
    if (popupSearch) popupSearch.setAttribute("autocomplete", "off");

    document.addEventListener("click", e => {
        const btn = e.target.closest("#menu-btn, #popup-menu-btn");
        if (!btn) return;
        e.preventDefault();
        if (overlay.classList.contains("is-open")) closeDrawer();
        else openDrawer(btn);
    });

    if (backdrop) backdrop.addEventListener("click", () => closeDrawer({ restoreFocus: false }));
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) closeDrawer();
    });

    drawerItems.forEach(btn => btn.addEventListener("click", () => handleCategoryClick(btn.dataset.cat)));

    document.addEventListener("click", e => {
        const inlineBtn = e.target.closest("#category-buttons button[data-category]");
        if (inlineBtn) markActive(inlineBtn.dataset.category);
    });
    document.addEventListener("drawer-category-select", e => {
        if (e.detail && e.detail.category) markActive(e.detail.category);
    });

    if (isSearchPage) {
        const params = new URLSearchParams(window.location.search);
        markActive(params.get("category") || "all");
    } else {
        const inlineActive = document.querySelector("#category-buttons .category-btn.active");
        markActive(inlineActive?.dataset.category || "all");
    }

    window.CategoryMenu = { markActive };
})();
