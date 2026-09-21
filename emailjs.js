(() => {
  const EMAILJS_CONFIG = Object.freeze({
    serviceId: "service_nzsqsj8",
    templateId: "template_440ctbd",
    publicKey: "jkMeUl-q4N9RS8Ny0"
  });
  let emailJsInitialized = false;

  function initEmailJs() {
    if (!emailJsInitialized) {
      if (!window.emailjs || typeof window.emailjs.init !== "function") {
        throw new Error("EmailJS SDK not loaded.");
      }
      window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
      emailJsInitialized = true;
    }
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatFullAddress(data = {}) {
    return {
      street: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zipCode: data.zip || "",
      country: data.country || "",
      formatted: `${data.address || ""}, ${data.city || ""}, ${data.state || ""} ${data.zip || ""}, ${data.country || ""}`
    };
  }

  async function sendOrderEmail(orderData = {}) {
    try {
      initEmailJs();
      const shipping = orderData.shippingInfo || {};
      const payment = orderData.paymentSummary || {};
      const address = formatFullAddress(shipping);
      const items = (orderData.products || []).map((item, index) =>
        `Item ${index + 1}: ${item.name} (x${item.quantity}) - ${formatMoney(item.price * item.quantity)}`
      ).join("\n");
      const paymentStatus = payment.status || "Processing";
      const taxAmount = Number(orderData.taxedTotal || 0) - Number(orderData.subtotal || 0);
      const safeSummary = [
        `Order ID: ${orderData.orderId || "N/A"}`,
        `Customer: ${shipping.name || "N/A"}`,
        `Email: ${shipping.email || "N/A"}`,
        `Phone: ${shipping.phone || "N/A"}`,
        `Shipping Address: ${address.formatted}`,
        `Payment Method: ${payment.method || "Card"}`,
        `Card Brand: ${payment.brand || "Card"}`,
        `Card Last 4: ${payment.last4 || "N/A"}`,
        `Payment Status: ${paymentStatus}`,
        `Payment Reference: ${payment.reference || "N/A"}`,
        `Subtotal: ${formatMoney(orderData.subtotal)}`,
        `Tax: ${formatMoney(taxAmount)}`,
        `Final Total: ${formatMoney(orderData.total)}`,
        "", "Items:", items
      ].join("\n");

      const payload = {
        name: shipping.name || "",
        time: new Date().toLocaleString(),
        formData: safeSummary,
        message: safeSummary,
        reply_to: shipping.email || "",
        customer_full_name: shipping.name || "",
        customer_email: shipping.email || "",
        email: shipping.email || "",
        to_email: "bondsquality@gmail.com",
        recipient_email: "bondsquality@gmail.com",
        customer_phone: shipping.phone || "",
        shipping_address_formatted: address.formatted,
        order_id: orderData.orderId || "",
        order_date: new Date().toISOString(),
        order_items_detailed: items,
        order_subtotal: formatMoney(orderData.subtotal),
        order_tax_amount: formatMoney(taxAmount),
        order_taxed_total: formatMoney(orderData.taxedTotal),
        order_discount_rate: orderData.discountRate > 0 ? `${orderData.discountRate * 100}%` : "No discount applied",
        order_final_total: formatMoney(orderData.total),
        order_products_summary: items,
        payment_method_type: payment.method || "Card",
        payment_card_type: payment.brand || "Card",
        card_last4: payment.last4 || "N/A",
        payment_reference: payment.reference || "N/A",
        payment_status: paymentStatus,
        order_status: "Processing"
      };

      const response = await window.emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        payload
      );
      return { success: true, response };
    } catch (error) {
      console.error("EmailJS order confirmation failed", {
        status: error?.status,
        text: error?.text,
        message: error?.message
      });
      return { success: false, reason: error?.text || error?.message || "Unknown EmailJS error" };
    }
  }

  window.addEventListener("load", () => {
    try {
      initEmailJs();
    } catch (error) {
      console.error("EmailJS initialization failed:", error);
    }
  }, { once: true });

  window.BondsEmailJS = Object.freeze({
    initEmailJs,
    formatMoney,
    formatFullAddress,
    sendOrderEmail
  });
})();
