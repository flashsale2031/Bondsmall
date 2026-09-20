(() => {
  const CART_KEY = "bonds_mall_cart";
  let items = [];
  let root = null;
  const read = () => { try { const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); items = Array.isArray(value) ? value : []; } catch (_) { items = []; } };
  const save = () => localStorage.setItem(CART_KEY, JSON.stringify(items));
  const count = () => items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const money = (value) => `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const renderCount = () => document.querySelectorAll("#sr-cart-count,#cart-count,#popup-cart-count").forEach(el => { el.textContent = String(count()); });
  const subtotal = () => items.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
  function render() {
    if (!root) return;
    const list = root.querySelector("#cart-items"), summary = root.querySelector("#cart-summary"), total = root.querySelector("#cart-total");
    if (!list) return;
    list.innerHTML = items.length ? items.map(item => `<div class="cart-item"><img src="${item.image || ""}" alt="${item.name || "Product"}"><div><strong class="cart-item-title">${item.name || "Product"}</strong><p class="cart-item-price">Unit: ${money(item.price)}</p><p class="cart-item-line-total">${money(Number(item.price || 0) * Number(item.quantity || 0))}</p><div class="qty-row"><button class="qty-btn" type="button" data-cart-action="dec" data-id="${item.id}">-</button><span class="qty-count">${item.quantity}</span><button class="qty-btn" type="button" data-cart-action="inc" data-id="${item.id}">+</button></div></div></div>`).join("") : '<p class="empty-state">Your cart is empty</p>';
    if (summary) summary.classList.toggle("hidden", items.length === 0);
    if (total) total.textContent = money(subtotal());
    renderCount();
    document.dispatchEvent(new CustomEvent("bonds-cart-updated", { detail: { items: [...items], subtotal: subtotal() } }));
  }
  function open() { if (root) { root.classList.remove("hidden"); root.setAttribute("aria-hidden", "false"); render(); } }
  function close() { if (root) { root.classList.add("hidden"); root.setAttribute("aria-hidden", "true"); } }
  function add(product, quantity = 1, condition = "New") {
    if (!product) return;
    const id = Number(product.id), price = Number(product.price ?? product["sale price"] ?? product.salePrice ?? 0), amount = Math.max(1, Math.floor(Number(quantity) || 1));
    const existing = items.find(item => Number(item.id) === id && (item.condition || "New") === condition);
    if (existing) existing.quantity += amount; else items.push({ id, name: product.name, image: product.image, price, quantity: amount, condition });
    save(); open();
  }
  function change(id, delta) { const item = items.find(entry => Number(entry.id) === Number(id)); if (!item) return; item.quantity += delta; if (item.quantity <= 0) items = items.filter(entry => Number(entry.id) !== Number(id)); save(); render(); }
  async function mount() { const response = await fetch("cart.html", { cache: "no-store" }); root = document.createElement("div"); root.innerHTML = await response.text(); const fragment = root.firstElementChild; document.body.appendChild(fragment); root = fragment; const proceed = root.querySelector("#to-shipping"); if (proceed) proceed.addEventListener("click", event => { if (!items.length) { event.preventDefault(); proceed.setAttribute("aria-disabled", "true"); } }); read(); render(); document.dispatchEvent(new Event("bonds-cart-ready")); }
  document.addEventListener("click", event => { const target = event.target.closest("[data-cart-action]"); if (target) { change(target.dataset.id, target.dataset.cartAction === "inc" ? 1 : -1); return; } if (event.target.closest("#sr-cart-btn,#cart-btn,#popup-cart-btn")) open(); if (event.target.closest("#close-cart")) close(); if (event.target.closest("#cart-backdrop")) close(); if (event.target.closest("#back-to-cart")) document.dispatchEvent(new Event("bonds-checkout-back")); });
  window.BondsCart = { add, open, close, getItems: () => [...items], subtotal, render, clear: () => { items = []; save(); render(); } };
  window.addEventListener("DOMContentLoaded", mount, { once: true });
})();
