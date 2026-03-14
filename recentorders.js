(() => {
  const orderProducts = document.getElementById("order-products");
  const orderDate = document.getElementById("order-date");
  const orderSubtotal = document.getElementById("order-subtotal");
  const orderTaxed = document.getElementById("order-taxed");
  const orderDiscount = document.getElementById("order-discount");
  const orderFinal = document.getElementById("order-final");


  function money(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function renderProducts(items) {
    if (!Array.isArray(items) || items.length === 0) {
      orderProducts.innerHTML = '<p>No products found for the most recent order.</p>';
      return;
    }

    orderProducts.innerHTML = items.map((item) => `
      <article class="order-product">
        <img class="order-product-image" src="${item.image || ""}" alt="${item.name}">
        <div class="order-product-info">
          <h3>${item.name}</h3>
          <p>Category: ${item.category}</p>
          <p>Quantity: ${item.quantity}</p>
          <p>Price: ${money(item.price)}</p>
        </div>
      </article>
    `).join("");
  }

  const deliveryName    = document.getElementById("delivery-name");
  const deliveryEmail   = document.getElementById("delivery-email");
  const deliveryPhone   = document.getElementById("delivery-phone");
  const deliveryAddress = document.getElementById("delivery-address");
  const deliveryCity    = document.getElementById("delivery-city");
  const deliveryState   = document.getElementById("delivery-state");
  const deliveryZip     = document.getElementById("delivery-zip");
  const deliveryCountry = document.getElementById("delivery-country");

  function renderDelivery(data) {
    const info = data || {};
    deliveryName.textContent    = info.name    || "-";
    deliveryEmail.textContent   = info.email   || "-";
    deliveryPhone.textContent   = info.phone   || "-";
    deliveryAddress.textContent = info.address || "-";
    deliveryCity.textContent    = info.city    || "-";
    deliveryState.textContent   = info.state   || "-";
    deliveryZip.textContent     = info.zip     || "-";
    deliveryCountry.textContent = info.country || "-";
  }

  function renderPayment(pay, discountCode) {
    const p = pay || {};
    const masked = p.last4 ? `${p.brand || "Card"} •••• ${p.last4}` : (p.cardNumberFormatted || "-");
    document.getElementById("pay-method").textContent      = p.method || "-";
    document.getElementById("pay-card").textContent        = masked;
    document.getElementById("pay-cardholder").textContent  = p.cardName || "-";
    document.getElementById("pay-expiry").textContent      = p.expiry  || "-";
    document.getElementById("pay-discount-code").textContent = discountCode || "None";
  }

  function init() {
    const raw = localStorage.getItem("recentOrder");

    if (!raw) {
      orderProducts.innerHTML = '<p class="empty-msg">No recent order found. <a href="bondsmall.html">Shop now →</a></p>';
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      orderProducts.innerHTML = '<p class="empty-msg">Unable to read order data.</p>';
      return;
    }

    renderProducts(parsed.products);
    renderDelivery(parsed.shippingInfo);
    renderPayment(parsed.paymentSummary, parsed.discountCode);

    // Order ID badge
    const badge = document.getElementById("order-id-badge");
    if (badge && parsed.orderId) badge.textContent = parsed.orderId;

    orderDate.textContent     = parsed.createdAt ? `Placed: ${new Date(parsed.createdAt).toLocaleString()}` : "";
    orderSubtotal.textContent = `Subtotal: ${money(parsed.subtotal)}`;
    orderTaxed.textContent    = `With 8.7% tax: ${money(parsed.taxedTotal)}`;
    const discRate = Number(parsed.discountRate || 0);
    orderDiscount.textContent = discRate > 0 ? `Discount (${(discRate * 100).toFixed(0)}%): -${money(parsed.taxedTotal * discRate)}` : "";
    orderFinal.textContent    = `Total Paid: ${money(parsed.total)}`;
  }

  document.addEventListener("DOMContentLoaded", init);
})();


