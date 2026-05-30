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

    if (!menuBtn || !overlay) return; // guard: overlay and main menu button must exist

    /* ── Open / close ────────────────────────────── */
    function openDrawer() {
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        if (menuBtn) {
            menuBtn.classList.add("is-open");
            menuBtn.setAttribute("aria-expanded", "true");
        }
        const currentPopupBtn = document.getElementById("popup-menu-btn");
        if (currentPopupBtn) {
            currentPopupBtn.classList.add("is-open");
            currentPopupBtn.setAttribute("aria-expanded", "true");
        }
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        if (menuBtn) {
            menuBtn.classList.remove("is-open");
            menuBtn.setAttribute("aria-expanded", "false");
        }
        const currentPopupBtn = document.getElementById("popup-menu-btn");
        if (currentPopupBtn) {
            currentPopupBtn.classList.remove("is-open");
            currentPopupBtn.setAttribute("aria-expanded", "false");
        }
        document.body.style.overflow = "";
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
    if (headerSearch && !isSearchPage) {
        headerSearch.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const term = headerSearch.value.trim();
                if (term) {
                    window.location.href = `search-results.html?q=${encodeURIComponent(term)}`;
                }
            }
        });
    }

    /* ── Events ──────────────────────────────────── */
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            if (overlay.classList.contains("is-open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }

    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#popup-menu-btn");
        if (!btn) return;
        if (overlay.classList.contains("is-open")) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });

    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
            closeDrawer();
        }
    });

    drawerItems.forEach(btn => {
        btn.addEventListener("click", () => handleCategoryClick(btn.dataset.cat));
    });

    /* ── On search results page: highlight active cat ─ */
    if (isSearchPage) {
        const params = new URLSearchParams(window.location.search);
        const activeCat = params.get("category") || "all";
        markActive(activeCat);
    }

    /* ── Expose for SRPage to call after re-render ─── */
    window.CategoryMenu = { markActive };
})();
