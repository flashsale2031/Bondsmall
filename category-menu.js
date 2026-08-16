/**
 * category-menu.js
 * Shared module: hamburger ☰ → category slide drawer
 * Works on index.html (filters inline) and search-results.html (navigates to results).
 */
(() => {
    /* ── Category map ─────────────────────────────── */
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

    /* ── Detect which page we're on ──────────────── */
    const isSearchPage = document.body.classList.contains("search-results-page");

    /* ── DOM references ──────────────────────────── */
    const menuBtn      = document.getElementById("menu-btn");
    const overlay      = document.getElementById("cat-drawer-overlay");
    const backdrop     = document.getElementById("cat-drawer-backdrop");
    const closeBtn     = document.getElementById("cat-drawer-close");
    const drawerItems  = document.querySelectorAll(".cat-drawer-item");
    const headerSearch = document.getElementById("header-search");
    const searchPageInput = document.getElementById("sr-search");
    const popupSearch = document.getElementById("popup-header-search");

    if (!overlay) return; // guard: pages without the shared drawer should not throw

    const menuButtons = document.querySelectorAll("#menu-btn, #popup-menu-btn");

    /* ── Open / close ────────────────────────────── */
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

    /* ── Mark active category in drawer ─────────── */
    function markActive(catKey) {
        drawerItems.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.cat === catKey);
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

    /* ── Handle category click ───────────────────── */
    function handleCategoryClick(catKey) {
        closeDrawer();

        if (isSearchPage) {
            // On search results page: update the URL and re-render
            const url = new URL(window.location.href);
            if (catKey === "all") {
                url.searchParams.delete("category");
            } else {
                url.searchParams.set("category", catKey);
            }
            // Clear text query when browsing by category from drawer
            url.searchParams.delete("q");
            window.history.replaceState({}, "", cleanUrl(url.toString()));

            // Trigger the search results page to re-render if its API is available
            if (typeof window.SRPage !== "undefined" && typeof window.SRPage.refresh === "function") {
                window.SRPage.refresh();
            }
        } else {
            // In-page filtering on index.html
            const categoryBtns = document.querySelectorAll(".category-btn");
            categoryBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.category === catKey));
            // Dispatch a custom event to sync with bondsmall.js
            const event = new CustomEvent("drawer-category-select", { detail: { category: catKey } });
            document.dispatchEvent(event);
        }
    }

    /* ── Header search → navigate to results ──────── */
    if (!isSearchPage) {
        [headerSearch].filter(Boolean).forEach(input => {
            input.addEventListener("keydown", (e) => {
                if (e.key !== "Enter") return;
                const term = input.value.trim();
                if (term) window.location.href = `search-results.html?q=${encodeURIComponent(term)}`;
            });
        });
    }

    // The search-results page owns its live filtering; this keeps its header
    // input and the popup/header variants consistent without double-rendering.
    if (isSearchPage && searchPageInput) {
        searchPageInput.setAttribute("autocomplete", "off");
    }
    if (popupSearch) popupSearch.setAttribute("autocomplete", "off");

    /* ── Events ──────────────────────────────────── */
    // Delegation keeps the main header and any dynamically rendered popup
    // header on the same behavior path without double-toggling.
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#menu-btn, #popup-menu-btn");
        if (!btn) return;
        e.preventDefault();
        if (overlay.classList.contains("is-open")) closeDrawer();
        else openDrawer(btn);
    });

    if (backdrop) backdrop.addEventListener("click", () => closeDrawer({ restoreFocus: false }));
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            closeDrawer();
        }
    });

    drawerItems.forEach(btn => {
        btn.addEventListener("click", () => handleCategoryClick(btn.dataset.cat));
    });

    // Keep the drawer and inline category buttons synchronized on index.html.
    document.addEventListener("click", (e) => {
        const inlineBtn = e.target.closest("#category-buttons button[data-category]");
        if (inlineBtn) markActive(inlineBtn.dataset.category);
    });
    document.addEventListener("drawer-category-select", (e) => {
        if (e.detail && e.detail.category) markActive(e.detail.category);
    });

    /* ── On search results page: highlight active cat ─ */
    if (isSearchPage) {
        const params = new URLSearchParams(window.location.search);
        const activeCat = params.get("category") || "all";
        markActive(activeCat);
    } else {
        const inlineActive = document.querySelector("#category-buttons .category-btn.active");
        markActive(inlineActive?.dataset.category || "all");
    }

    /* ── Expose for SRPage to call after re-render ─── */
    window.CategoryMenu = { markActive };
})();
