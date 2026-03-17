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

    const ordersList = document.getElementById('orders-list');
    const emptyState = document.getElementById('empty-state');
    const orderSearch = document.getElementById('order-search');
    const filtersSection = document.getElementById('filters-section');
    let allOrders = [];

    function loadOrderHistory() {
        // Get current order
        const currentOrder = JSON.parse(localStorage.getItem("recentOrder") || "null");
        
        // Get past orders
        const pastOrders = JSON.parse(localStorage.getItem("fc_order_history") || "[]");
        
        allOrders = [];
        if (currentOrder) {
            allOrders.push(currentOrder);
        }
        allOrders = allOrders.concat(pastOrders);

        if (allOrders.length > 0) {
            filtersSection.style.display = 'block';
            emptyState.style.display = 'none';
            renderOrders(allOrders);
        } else {
            filtersSection.style.display = 'none';
            emptyState.style.display = 'block';
            ordersList.innerHTML = '';
        }
    }

    function renderOrders(orders) {
        ordersList.innerHTML = orders.map(order => {
            const itemCount = order.products.reduce((sum, p) => sum + p.quantity, 0);
            return `
                <li class="case-list li" style="cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='#f8f0e2'" onmouseleave="this.style.background='#fff'" onclick="window.location.href='order-success.html'">
                    <span class="case-title">Order #${order.orderId}</span>
                    <span class="case-meta">
                        ${itemCount} item${itemCount !== 1 ? 's' : ''} • ${formatDate(order.createdAt)} • ${formatMoney(order.total)}
                    </span>
                </li>
            `;
        }).join('');
    }

    function filterOrders(query) {
        const filtered = allOrders.filter(order => 
            order.orderId.toLowerCase().includes(query.toLowerCase())
        );
        renderOrders(filtered);
    }

    if (orderSearch) {
        orderSearch.addEventListener('input', (e) => {
            filterOrders(e.target.value);
        });
    }

    window.addEventListener('DOMContentLoaded', loadOrderHistory);
})();
