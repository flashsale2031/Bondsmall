(() => {
  "use strict";

  const CART_KEY = "bonds_mall_cart";
  let checkoutRoot = document.querySelector("#checkout-steps");
  let shippingData = null;
  let discountRate = 0;
  let discountCode = "";
  let paymentMethod = "credit";
  let rewardOffer = window.BondsRewards?.getPendingOffer() || null;
  let orderSubmitting = false;

  const roundMoney = (value) => Math.round((Math.max(0, Number(value) || 0) + Number.EPSILON) * 100) / 100;
  const money = (value) => `$${roundMoney(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  function currentTotals() {
    const taxed = roundMoney(subtotal() * 1.087);
    const rewardQuote = rewardOffer && window.BondsRewards
      ? window.BondsRewards.quote(rewardOffer.id, taxed)
      : null;
    const rewardApplied = Boolean(rewardQuote && rewardQuote.sufficientPoints);
    const discountAmount = Math.min(taxed, rewardApplied
      ? rewardQuote.discountAmount
      : roundMoney(taxed * discountRate));
    const final = roundMoney(Math.max(0, taxed - discountAmount));
    return {
      taxed,
      final,
      discountAmount,
      rewardQuote,
      rewardApplied,
      pointsRedeemed: rewardApplied ? rewardQuote.pointsRequired : 0
    };
  }

  function updateTotals() {
    const totals = currentTotals();
    const taxElement = get("tax-total");
    const totalElement = get("final-total");
    const summaryElement = get("reward-offer-summary");
    const clearButton = get("clear-reward-offer");
    const payButton = get("pay-now");
    const standardLabel = discountCode === window.BondsDiscounts.newCustomerOffer.code
      ? " (25% new-customer offer applied)"
      : "";

    if (taxElement) taxElement.textContent = `Total with 8.7% tax: ${money(totals.taxed)}`;
    if (totalElement) {
      const rewardLabel = totals.rewardApplied ? ` (${rewardOffer.label} reward applied)` : standardLabel;
      totalElement.textContent = `Final total${rewardLabel}: ${money(totals.final)}`;
    }

    if (summaryElement) {
      if (!rewardOffer || !totals.rewardQuote) {
        summaryElement.hidden = true;
        summaryElement.textContent = "";
      } else {
        summaryElement.hidden = false;
        if (!totals.rewardQuote.sufficientPoints) {
          summaryElement.textContent = `${rewardOffer.label} is not applied: this order needs ${formatPoints(totals.rewardQuote.pointsRequired)} points, but your available balance is ${formatPoints(totals.rewardQuote.availablePoints)}. Choose a lower Points offer or remove this reward.`;
        } else if (rewardOffer.kind === "freebie") {
          const capped = totals.discountAmount < rewardOffer.amount;
          summaryElement.textContent = `${rewardOffer.label} selected: ${money(totals.discountAmount)} off, using 0 points${capped ? " (capped at this order's total)" : ""}.`;
        } else {
          summaryElement.textContent = `${rewardOffer.label} selected: ${money(totals.discountAmount)} off; ${formatPoints(totals.pointsRedeemed)} points will be used at checkout.`;
        }
      }
    }
    if (clearButton) clearButton.hidden = !rewardOffer;
    if (payButton) payButton.textContent = totals.final === 0 ? "Complete Order" : "Pay Now";
    return totals;
  }

  function formatPoints(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");
  }

  function setCardFieldsRequired(required) {
    const fields = get("card-fields");
    if (!fields) return;
    fields.querySelectorAll("input").forEach((input) => { input.required = Boolean(required); });
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

  function start() {
    if (!checkoutRoot || !getItems().length) return;
    rewardOffer = window.BondsRewards?.getPendingOffer() || null;
    show("checkout-steps");
    show("shipping-section");
    hide("payment-section");
    hide("discount-section");
    setCardFieldsRequired(true);
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
      const input = get("discount-code");
      if (input) input.value = "";
    } else {
      discountCode = "";
      discountRate = 0;
    }
    const totals = updateTotals();
    if (rewardOffer && totals.rewardApplied) {
      message("Your selected Rewards offer is the active discount; reward and new-customer offers do not stack.", true);
    } else if (rewardOffer && totals.rewardQuote) {
      message(`${rewardOffer.label} is not applied: this order needs ${formatPoints(totals.rewardQuote.pointsRequired)} points, but your balance is ${formatPoints(totals.rewardQuote.availablePoints)}. Remove it or choose a lower Points offer before placing the order.`);
    } else if (result.eligible) {
      message("25% new-customer offer applied after checking account and receipt details saved in this browser.", true);
    } else {
      message("The 25% offer was not applied because matching account or receipt details were found in this browser.");
    }
    return result;
  }

  function removeRewardOffer() {
    rewardOffer = null;
    window.BondsRewards?.clearPendingOffer();
    updateTotals();
    message("Selected Rewards offer removed.", true);
  }

  function applyDiscount() {
    const code = window.BondsDiscounts.normalizeCode(get("discount-code")?.value || "");
    const rate = window.BondsDiscounts.rateForCode(code);
    if (rate > 0) {
      const replacedReward = Boolean(rewardOffer);
      rewardOffer = null;
      window.BondsRewards?.clearPendingOffer();
      discountCode = code;
      discountRate = rate;
      updateTotals();
      message(`${code} applied: ${Math.round(discountRate * 100)}% off.${replacedReward ? " The selected Rewards offer was removed because discounts do not stack." : ""}`, true);
      return;
    }
    if (discountCode !== window.BondsDiscounts.newCustomerOffer.code) {
      discountCode = "";
      discountRate = 0;
    }
    updateTotals();
    message(code
      ? (discountCode ? "That code is invalid; your existing offer remains applied." : "That discount code is not valid.")
      : (discountCode ? "Your 25% new-customer offer remains applied." : "Enter a discount code first."), Boolean(discountCode));
  }

  async function submitOrder() {
    if (orderSubmitting) return;
    const items = getItems();
    if (!items.length) {
      message("Your cart is empty. Add an item before checking out.");
      return;
    }

    const totals = updateTotals();
    if (rewardOffer && totals.rewardQuote && !totals.rewardQuote.sufficientPoints) {
      message("This Points offer cannot be used with your current balance for this order. Choose a lower offer or remove the selected reward.");
      return;
    }
    if (totals.final > 0 && !validCard()) return;

    orderSubmitting = true;
    const createdAt = new Date().toISOString();
    const rawNumber = (get("card-number")?.value || "").replace(/\D/g, "");
    const appliedReward = totals.rewardApplied ? rewardOffer : null;
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
      discountRate: appliedReward
        ? (appliedReward.kind === "points" ? appliedReward.rate : 0)
        : discountRate,
      discountCode: appliedReward ? appliedReward.code : discountCode,
      discountAmount: totals.discountAmount,
      pointsRedeemed: appliedReward ? totals.pointsRedeemed : 0,
      total: totals.final,
      shippingInfo: shippingData || {},
      paymentSummary: totals.final === 0
        ? { method: "No payment", status: "no payment required", last4: "N/A", brand: "N/A" }
        : {
            method: paymentMethod === "debit" ? "Debit Card" : "Credit Card",
            status: "approved",
            last4: rawNumber.slice(-4),
            brand: rawNumber.startsWith("4") ? "Visa" : rawNumber.startsWith("5") ? "Mastercard" : rawNumber.startsWith("3") ? "Amex" : "Card"
          },
      createdAt
    };

    try {
      localStorage.setItem("recentOrder", JSON.stringify(order));
      if (rewardOffer) {
        if (appliedReward) {
          const completed = window.BondsRewards.completeOffer(appliedReward.id, totals.pointsRedeemed);
          if (!completed.ok) console.error("Order completed but Rewards balance update failed:", completed.reason);
        } else {
          window.BondsRewards?.clearPendingOffer();
        }
      }
      if (window.BondsCart?.clear) window.BondsCart.clear();
      else localStorage.removeItem(CART_KEY);
      let emailResult;
      try {
        emailResult = await window.BondsEmailJS.sendOrderEmail(order);
      } catch (error) {
        emailResult = { success: false, reason: error?.message || "Email notification failed." };
      }
      if (!emailResult?.success) console.error("Order created but confirmation email was not sent:", emailResult?.reason);
      window.location.assign("order-success.html");
    } catch (error) {
      orderSubmitting = false;
      message(error?.message || "The order could not be saved. Please try again.");
    }
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

  document.addEventListener("bonds-cart-ready", mount);
  document.addEventListener("bonds-checkout-start", start);
  document.addEventListener("bonds-checkout-back", () => { hide("checkout-steps"); show("cart-summary"); });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("#to-shipping,#apply-discount,#clear-reward-offer");
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
    if (target.id === "clear-reward-offer") removeRewardOffer();
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
      const totals = updateTotals();
      if (totals.final === 0) {
        setCardFieldsRequired(false);
        hide("payment-section");
        show("discount-section");
        message("Your selected offer covers the order. No payment details are required.", true);
      } else {
        setCardFieldsRequired(true);
        show("payment-section");
      }
      return;
    }
    if (event.target.id === "payment-form") {
      const totals = updateTotals();
      if (totals.final > 0 && !validCard()) return;
      setCardFieldsRequired(false);
      hide("payment-section");
      show("discount-section");
      if (totals.final === 0) message("Your selected offer covers the order. No payment details are required.", true);
      else if (discountCode === window.BondsDiscounts.newCustomerOffer.code && !rewardOffer) message("Your 25% new-customer offer is applied to this order.", true);
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
