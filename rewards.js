(() => {
    "use strict";

    const formatPoints = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");

    function loadDashboard() {
        const api = window.BondsRewards;
        if (!api || document.body.dataset.page !== "rewards") return;
        const state = api.getState();
        const points = document.getElementById("points-balance");
        const earned = document.getElementById("total-earned");
        const redeemed = document.getElementById("redeemed");
        const tier = document.getElementById("tier-level");
        if (points) points.textContent = formatPoints(state.points);
        if (earned) earned.textContent = formatPoints(state.totalEarned);
        if (redeemed) redeemed.textContent = formatPoints(state.redeemed);
        if (tier) tier.textContent = state.tier;
    }

    function renderOfferCard(offer, section) {
        const isFreebie = section === "freebies";
        return `
            <article class="redeem-card">
                <span class="redeem-card-tag">${isFreebie ? "0 points" : "Points at checkout"}</span>
                <h3>${offer.label}</h3>
                <p>${isFreebie
                    ? "A fixed-dollar discount with no points required. Applied up to the order total."
                    : "Point cost is based on the actual savings at checkout using 100 points = $5."}</p>
                <button type="button" class="redeem-button" data-reward-id="${offer.id}">${isFreebie ? "Use Freebie" : "Choose Offer"}</button>
            </article>`;
    }

    function updateSelectionView() {
        const api = window.BondsRewards;
        const note = document.getElementById("reward-selection-status");
        const continueLink = document.getElementById("continue-to-shop");
        const balance = document.getElementById("redeem-points-balance");
        if (!api) return;
        const state = api.getState();
        if (balance) balance.textContent = formatPoints(state.points);
        const selected = api.getPendingOffer();
        if (note) {
            note.textContent = selected
                ? `${selected.label} is selected. It will be applied at checkout if eligible; points are deducted only after an order is completed.`
                : "Choose one offer to use on your next order. Offers do not stack.";
        }
        if (continueLink) continueLink.hidden = !selected;
        document.querySelectorAll("[data-reward-id]").forEach((button) => {
            const isSelected = Boolean(selected && button.dataset.rewardId === selected.id);
            button.classList.toggle("is-selected", isSelected);
            button.textContent = isSelected
                ? "Selected"
                : (button.closest("#freebies-grid") ? "Use Freebie" : "Choose Offer");
        });
    }

    function initRedemptionPage() {
        const api = window.BondsRewards;
        if (!api || document.body.dataset.page !== "rewards-redeem") return;
        const catalog = api.getCatalog();
        const freebiesGrid = document.getElementById("freebies-grid");
        const pointsGrid = document.getElementById("points-grid");
        if (freebiesGrid) freebiesGrid.innerHTML = catalog.freebies.map((offer) => renderOfferCard(offer, "freebies")).join("");
        if (pointsGrid) pointsGrid.innerHTML = catalog.points.map((offer) => renderOfferCard(offer, "points")).join("");
        updateSelectionView();

        document.addEventListener("click", (event) => {
            const button = event.target.closest("button[data-reward-id]");
            if (!button) return;
            const result = api.selectOffer(button.dataset.rewardId);
            const note = document.getElementById("reward-selection-status");
            if (!result.ok) {
                if (note) note.textContent = result.reason;
                return;
            }
            updateSelectionView();
        });
    }

    function init() {
        loadDashboard();
        initRedemptionPage();
    }

    window.addEventListener("DOMContentLoaded", init);
    window.addEventListener("storage", (event) => {
        if (event.key === "fc_rewards") loadDashboard();
        if (event.key === "fc_pending_reward") updateSelectionView();
    });
})();
