// recentorders.js

(() => {
  const orderProductsContainer = document.getElementById('order-products');
  const orderTotalElement = document.getElementById('order-total');
  const deliveryName = document.getElementById('delivery-name');
  const deliveryAddress = document.getElementById('delivery-address');
  const deliveryCity = document.getElementById('delivery-city');
  const deliveryState = document.getElementById('delivery-state');
  const deliveryZip = document.getElementById('delivery-zip');
  const deliveryCountry = document.getElementById('delivery-country');

  // Format price to USD string
  function formatPrice(price) {
    return `$${price.toFixed(2)}`;
  }

  // Render list of products
  function renderProducts(products) {
    orderProductsContainer.innerHTML = '';

    if (!products || products.length === 0) {
      orderProductsContainer.textContent = 'No products found in this order.';
      return;
    }

    products.forEach(item => {
      const productDiv = document.createElement('div');
      productDiv.classList.add('order-product');

      const img = document.createElement('img');
      img.src = item.images?.[0] || '';
      img.alt = item.name;
      img.classList.add('order-product-image');

      const infoDiv = document.createElement('div');
      infoDiv.classList.add('order-product-info');

      const name = document.createElement('h3');
      name.textContent = item.name;

      const category = document.createElement('p');
      category.textContent = `Category: ${item.category}`;

      const quantity = document.createElement('p');
      quantity.textContent = `Quantity: ${item.quantity}`;

      const price = document.createElement('p');
      price.textContent = `Price: ${formatPrice(item.price)}`;

      infoDiv.appendChild(name);
      infoDiv.appendChild(category);
      infoDiv.appendChild(quantity);
      infoDiv.appendChild(price);

      productDiv.appendChild(img);
      productDiv.appendChild(infoDiv);

      orderProductsContainer.appendChild(productDiv);
    });
  }

  // Render delivery info
  function renderDeliveryInfo(info) {
    if (!info) return;
    deliveryName.textContent = info.name || '';
    deliveryAddress.textContent = info.address || '';
    deliveryCity.textContent = info.city || '';
    deliveryState.textContent = info.state || '';
    deliveryZip.textContent = info.zip || '';
    deliveryCountry.textContent = info.country || '';
  }

  // Render total order price
  function renderTotal(total) {
    orderTotalElement.textContent = `Order Total: ${formatPrice(total)}`;
  }

  // Load order data from localStorage and render
  function loadAndRenderOrder() {
    const orderDataRaw = localStorage.getItem('recentOrder');
    if (!orderDataRaw) {
      orderProductsContainer.textContent = 'No recent order data found.';
      orderTotalElement.textContent = '';
      return;
    }

    let orderData;
    try {
      orderData = JSON.parse(orderDataRaw);
    } catch {
      orderProductsContainer.textContent = 'Error reading order data.';
      orderTotalElement.textContent = '';
      return;
    }

    // orderData.products contains array of items with id, name, price, quantity, category
    // orderData.total contains total price
    // orderData.shippingInfo contains delivery info

    renderProducts(orderData.products);
    renderTotal(orderData.total);
    renderDeliveryInfo(orderData.shippingInfo);
  }

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    loadAndRenderOrder();
  });
})();


