(() => {
    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const trackOrderId = document.getElementById('track-order-id');
    const trackBtn = document.getElementById('track-btn');
    const trackResult = document.getElementById('track-result');
    const trackEmpty = document.getElementById('track-empty');

    function getTrackingStatus(createdAt) {
        const now = new Date();
        const orderDate = new Date(createdAt);
        const daysElapsed = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

        if (daysElapsed === 0) {
            return {
                status: 'processing',
                label: 'Processing',
                timeline: [
                    { step: 'Order Confirmed', date: createdAt, completed: true },
                    { step: 'Payment Verified', date: null, completed: false },
                    { step: 'Shipped', date: null, completed: false },
                    { step: 'Delivered', date: null, completed: false }
                ]
            };
        } else if (daysElapsed <= 2) {
            return {
                status: 'shipped',
                label: 'Shipped',
                timeline: [
                    { step: 'Order Confirmed', date: createdAt, completed: true },
                    { step: 'Payment Verified', date: createdAt, completed: true },
                    { step: 'Shipped', date: new Date(orderDate.getTime() + 24*60*60*1000).toISOString(), completed: true },
                    { step: 'Delivered', date: null, completed: false }
                ]
            };
        } else {
            const deliveryDate = new Date(orderDate.getTime() + 5*24*60*60*1000).toISOString();
            return {
                status: 'delivered',
                label: 'Delivered',
                timeline: [
                    { step: 'Order Confirmed', date: createdAt, completed: true },
                    { step: 'Payment Verified', date: createdAt, completed: true },
                    { step: 'Shipped', date: new Date(orderDate.getTime() + 24*60*60*1000).toISOString(), completed: true },
                    { step: 'Delivered', date: deliveryDate, completed: true }
                ]
            };
        }
    }

    function trackOrder() {
        const orderId = trackOrderId.value.trim();
        
        if (!orderId) {
            return;
        }

        // Get current order
        const currentOrder = JSON.parse(localStorage.getItem("recentOrder") || "null");
        
        // Get past orders
        const pastOrders = JSON.parse(localStorage.getItem("fc_order_history") || "[]");
        
        const allOrders = [];
        if (currentOrder) {
            allOrders.push(currentOrder);
        }
        allOrders.push(...pastOrders);

        const foundOrder = allOrders.find(order => order.orderId === orderId);

        if (!foundOrder) {
            trackResult.style.display = 'none';
            trackEmpty.innerHTML = `<p style="color: #8c2f39;">Order not found. Please check the Order ID and try again.</p>`;
            trackEmpty.style.display = 'block';
            return;
        }

        trackEmpty.style.display = 'none';
        const tracking = getTrackingStatus(foundOrder.createdAt);
        
        document.getElementById('track-order-title').textContent = `Order #${foundOrder.orderId}`;
        document.getElementById('track-address').textContent = foundOrder.shippingInfo.address;

        const timeline = document.getElementById('tracking-timeline');
        timeline.innerHTML = tracking.timeline.map((item, index) => `
            <div class="timeline-item ${item.completed ? 'active' : ''}">
                <div class="timeline-content">
                    <h4>${item.step}</h4>
                    <p>${item.date ? formatDate(item.date) : 'Pending'}</p>
                    <span class="status-badge ${tracking.status}">${tracking.label}</span>
                </div>
            </div>
        `).join('');

        trackResult.style.display = 'block';
    }

    trackBtn.addEventListener('click', trackOrder);
    trackOrderId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') trackOrder();
    });
})();
