(() => {
    const toggleBtn = document.getElementById("toggle-products-btn");
    const productsPanel = document.getElementById("affiliate-products-panel");
    const productsGrid = document.getElementById("affiliate-products-grid");
    const salesPill = document.getElementById("recent-sales-pill");
    const balanceEl = document.getElementById("affiliate-balance");

    const salesKey = "fc_affiliate_sales";
    const balanceKey = "fc_affiliate_balance";
    const commissionRate = 0.08;

    function formatMoney(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function getSales() {
        try {
            const parsed = JSON.parse(localStorage.getItem(salesKey) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function getProductSource() {
        if (typeof products !== "undefined" && Array.isArray(products)) {
            return products.slice(0, 12);
        }
        return [];
    }

    function updateSummary() {
        const sales = getSales();
        const storedBalance = Number(localStorage.getItem(balanceKey) || 0);
        balanceEl.textContent = formatMoney(storedBalance);
        salesPill.textContent = sales.length === 0 ? "No sales yet" : `${sales.length} sales`;
    }

    function saveSale(product) {
        const currentSales = getSales();
        currentSales.unshift({
            productId: product.id,
            productName: product.name,
            saleValue: Number(product.price || 0),
            earned: Number(product.price || 0) * commissionRate,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(salesKey, JSON.stringify(currentSales.slice(0, 100)));

        const currentBalance = Number(localStorage.getItem(balanceKey) || 0);
        const nextBalance = currentBalance + Number(product.price || 0) * commissionRate;
        localStorage.setItem(balanceKey, String(nextBalance));
        updateSummary();
    }

    function renderProducts() {
        const source = getProductSource();
        if (source.length === 0) {
            productsGrid.innerHTML = "<p>No products available right now.</p>";
            return;
        }

        productsGrid.innerHTML = source.map((item) => {
            const commission = Number(item.price || 0) * commissionRate;
            return `
                <article class="affiliate-product-card">
                    <img src="${item.image || ""}" alt="${item.name}" class="affiliate-product-image">
                    <div class="affiliate-product-info">
                        <h3>${item.name}</h3>
                        <p class="affiliate-price">Price: ${formatMoney(item.price)}</p>
                        <p class="affiliate-commission">Commission: ${formatMoney(commission)}</p>
                        <button class="affiliate-link-btn" data-id="${item.id}" type="button">Generate Link</button>
                    </div>
                </article>
            `;
        }).join("");

        productsGrid.querySelectorAll(".affiliate-link-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const id = Number(button.getAttribute("data-id"));
                const product = source.find((item) => Number(item.id) === id);
                if (!product) {
                    return;
                }

                saveSale(product);
                button.textContent = "Link Generated";
                button.disabled = true;
                setTimeout(() => {
                    button.textContent = "Generate Link";
                    button.disabled = false;
                }, 1400);
            });
        });
    }

    toggleBtn.addEventListener("click", () => {
        productsPanel.classList.toggle("hidden");
        const isHidden = productsPanel.classList.contains("hidden");
        toggleBtn.textContent = isHidden ? "Show Products" : "Hide Products";
        if (!isHidden && !productsGrid.dataset.rendered) {
            renderProducts();
            productsGrid.dataset.rendered = "true";
        }
    });

    updateSummary();
})();
