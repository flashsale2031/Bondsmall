(() => {
    function formatMoney(value) {
        return `$${value.toFixed(2)}`;
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    }

    function getEstimatedDelivery(createdAt) {
        const date = new Date(createdAt);
        date.setDate(date.getDate() + 5);
        return formatDate(date.toISOString());
    }

    function renderOrderSuccess() {
        const order = JSON.parse(localStorage.getItem("recentOrder") || "null");
        
        if (!order) {
            document.querySelector('.success-container').innerHTML = `
                <div class="card" style="padding: 2rem; text-align: center;">
                    <h2>No Order Found</h2>
                    <p style="color: #5c5348;">Please check your email or <a href="bondsmall.html">return home</a>.</p>
                </div>
            `;
            return;
        }

        // Populate order details
        document.getElementById('order-id').textContent = order.orderId;
        document.getElementById('order-date').textContent = formatDate(order.createdAt);
        document.getElementById('order-address').textContent = order.shippingInfo.address;
        document.getElementById('order-delivery').textContent = getEstimatedDelivery(order.createdAt);
        document.getElementById('order-subtotal').textContent = formatMoney(order.subtotal);
        document.getElementById('order-tax').textContent = formatMoney(order.taxedTotal - order.subtotal);
        document.getElementById('order-total').textContent = formatMoney(order.total);

        // Show discount if applied
        if (order.discountRate > 0) {
            document.getElementById('discount-row').style.display = 'flex';
            const discountAmount = order.subtotal * order.discountRate;
            document.getElementById('order-discount').textContent = `-${formatMoney(discountAmount)} (${Math.round(order.discountRate * 100)}% off)`;
        }

        // Render products
        const container = document.getElementById('products-container');
        container.innerHTML = order.products.map(product => `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-qty">Quantity: ${product.quantity}</div>
                </div>
                <div class="product-price">${formatMoney(product.price * product.quantity)}</div>
            </div>
        `).join('');
    }

    window.addEventListener('DOMContentLoaded', renderOrderSuccess);
})();
