(() => {
  const CART_KEY = "bonds_mall_cart";
  let checkoutRoot = document.querySelector("#checkout-steps");
  let shippingData = null;
  let discountRate = 0;
  let discountCode = "";
  let paymentMethod = "credit";

  const money = (value) => `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getItems = () => {
    const sharedItems = window.BondsCart?.getItems ? window.BondsCart.getItems() : [];
    if (sharedItems.length) return sharedItems;
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };
  const subtotal = () => getItems().reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const get = (id) => checkoutRoot && (checkoutRoot.id === id ? checkoutRoot : checkoutRoot.querySelector(`#${id}`));
  const show = (id) => { const element = get(id); if (element) element.classList.remove("hidden"); };
  const hide = (id) => { const element = get(id); if (element) element.classList.add("hidden"); };

  function updateTotals() {
    const taxed = subtotal() * 1.087;
    const final = taxed * (1 - discountRate);
    const taxElement = get("tax-total");
    const totalElement = get("final-total");
    const offerLabel = discountCode === window.BondsDiscounts.newCustomerOffer.code
      ? " (25% new-customer offer applied)"
      : "";
    if (taxElement) taxElement.textContent = `Total with 8.7% tax: ${money(taxed)}`;
    if (totalElement) totalElement.textContent = `Final total${offerLabel}: ${money(final)}`;
    return { taxed, final };
  }

  function message(text, success = false) {
    const reviewVisible = get("discount-section") && !get("discount-section").classList.contains("hidden");
    const element = get(reviewVisible ? "checkout-feedback" : "payment-feedback");
    if (element) {
      element.textContent = text;
      element.classList.toggle("success", success);
    }
  }

  function validCard() {
    const name = get("card-name");
    const number = get("card-number");
    const expiry = get("card-expiry");
    const cvv = get("card-cvv");
    const digits = (number?.value || "").replace(/\D/g, "");
    const checksum = digits.split("").reverse().reduce((sum, digit, index) => {
      let value = Number(digit);
      if (index % 2) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      return sum + value;
    }, 0);
    const valid = (name?.value || "").trim().length >= 2
      && digits.length >= 12
      && checksum % 10 === 0
      && /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry?.value || "")
      && /^\d{3,4}$/.test(cvv?.value || "");
    if (!valid) message("Please enter valid payment details.");
    else message(`${paymentMethod === "debit" ? "Debit" : "Credit"} card verified.`, true);
    return valid;
  }

  async function mount() {
    if (checkoutRoot) {
      start();
      return;
    }
    const response = await fetch("checkout-fragment.html", { cache: "no-store" });
    const host = document.querySelector("#checkout-root");
    if (!host) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = await response.text();
    const fragment = wrapper.firstElementChild;
    host.replaceWith(fragment);
    checkoutRoot = fragment;
  }

  function start() {
    if (!checkoutRoot || !getItems().length) return;
    show("checkout-steps");
    show("shipping-section");
    hide("payment-section");
    hide("discount-section");
    updateTotals();
    const summary = document.querySelector("#cart-summary");
    if (summary) summary.classList.add("hidden");
  }

  function checkNewCustomerOffer(info) {
    const result = window.BondsMembers.checkRepeatAccountInfo(info);
    const offer = window.BondsDiscounts.newCustomerOffer;
    if (result.eligible) {
      discountCode = offer.code;
      discountRate = offer.rate;
      message("25% new-customer offer applied after checking account and receipt details saved in this browser.", true);
    } else {
      discountCode = "";
      discountRate = 0;
      message("The 25% offer was not applied because matching account or receipt details were found in this browser.");
    }
    updateTotals();
    return result;
  }

  function applyDiscount() {
    const code = window.BondsDiscounts.normalizeCode(get("discount-code")?.value || "");
    const rate = window.BondsDiscounts.rateForCode(code);
    if (rate > 0) {
      discountCode = code;
      discountRate = rate;
      updateTotals();
      message(`${code} applied: ${Math.round(discountRate * 100)}% off.`, true);
      return;
    }
    if (discountCode !== window.BondsDiscounts.newCustomerOffer.code) {
      discountCode = "";
      discountRate = 0;
    }
    updateTotals();
    message(code
      ? (discountCode ? "That code is invalid; your 25% new-customer offer remains applied." : "That discount code is not valid.")
      : (discountCode ? "Your 25% new-customer offer remains applied." : "Enter a discount code first."), Boolean(discountCode));
  }

  async function submitOrder() {
    const items = getItems();
    if (!items.length) {
      message("Your cart is empty. Add an item before checking out.");
      return;
    }
    const totals = updateTotals();
    if (totals.final > 0 && !validCard()) return;
    const createdAt = new Date().toISOString();
    const order = {
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      products: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price || 0),
        image: item.image,
        condition: item.condition || "New"
      })),
      subtotal: subtotal(),
      taxedTotal: totals.taxed,
      discountRate,
      discountCode,
      total: totals.final,
      shippingInfo: shippingData || {},
      paymentSummary: (() => {
        const rawNumber = (get("card-number")?.value || "").replace(/\D/g, "");
        const brand = rawNumber.startsWith("4") ? "Visa" : rawNumber.startsWith("5") ? "Mastercard" : rawNumber.startsWith("3") ? "Amex" : "Card";
        return {
          method: paymentMethod === "debit" ? "Debit Card" : "Credit Card",
          status: totals.final === 0 ? "no payment required" : "approved",
          last4: rawNumber.slice(-4),
          brand
        };
      })(),
      createdAt
    };
    localStorage.setItem("recentOrder", JSON.stringify(order));
    if (window.BondsCart?.clear) window.BondsCart.clear();
    else localStorage.removeItem(CART_KEY);
    const emailResult = await window.BondsEmailJS.sendOrderEmail(order);
    if (!emailResult.success) console.error("Order created but confirmation email was not sent:", emailResult.reason);
    window.location.assign("order-success.html");
  }

  document.addEventListener("bonds-cart-ready", mount);
  document.addEventListener("bonds-checkout-start", start);
  document.addEventListener("bonds-checkout-back", () => { hide("checkout-steps"); show("cart-summary"); });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("#to-shipping,#apply-discount,#pay-now");
    if (!target) return;
    if (target.id === "to-shipping") {
      if (!getItems().length) {
        event.preventDefault();
        target.setAttribute("aria-disabled", "true");
      } else {
        target.removeAttribute("aria-disabled");
      }
      return;
    }
    if (target.id === "apply-discount") applyDiscount();
  });

  document.addEventListener("submit", (event) => {
    if (!checkoutRoot || !checkoutRoot.contains(event.target)) return;
    event.preventDefault();
    if (event.target.id === "shipping-form") {
      shippingData = {
        name: get("ship-name")?.value || "",
        email: get("ship-email")?.value || "",
        phone: get("ship-phone")?.value || "",
        address: get("ship-address")?.value || "",
        city: get("ship-city")?.value || "",
        state: get("ship-state")?.value || "",
        zip: get("ship-zip")?.value || "",
        country: get("ship-country")?.value || ""
      };
      checkNewCustomerOffer(shippingData);
      hide("shipping-section");
      show("payment-section");
      return;
    }
    if (event.target.id === "payment-form" && validCard()) {
      hide("payment-section");
      show("discount-section");
      updateTotals();
      if (discountCode === window.BondsDiscounts.newCustomerOffer.code) {
        message("Your 25% new-customer offer is applied to this order.", true);
      }
      return;
    }
    if (event.target.id === "checkout-review-form") submitOrder();
  });

  document.addEventListener("change", (event) => {
    if (event.target.name === "pay-method") paymentMethod = event.target.value;
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "card-number") event.target.value = event.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
    if (event.target.id === "card-expiry") {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
      event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    }
    if (event.target.id === "card-cvv") event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
  });
  window.addEventListener("DOMContentLoaded", () => { if (checkoutRoot) start(); });
})();
