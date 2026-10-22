(() => {
  "use strict";

  const BALANCE_KEY = "fc_rewards";
  const PENDING_KEY = "fc_pending_reward";
  const POINTS_PER_DOLLAR = 20; // Redemption: 100 points = $5.
  const POINTS_EARNED_PER_DOLLAR = 10;
  const DEFAULT_STATE = Object.freeze({ points: 2150, totalEarned: 5420, redeemed: 3270, tier: "Silver", awardedOrders: Object.freeze([]) });
  const catalog = [
    ...[5, 10, 20, 25, 30, 40, 50, 100].map((amount) => ({
      id: `free-${amount}`,
      code: `REWARD_FREE_${amount}`,
      kind: "freebie",
      amount,
      label: `$${amount} Free`,
      pointCost: 0
    })),
    ...[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((percent) => ({
      id: `points-${percent}`,
      code: `REWARD_POINTS_${percent}`,
      kind: "points",
      rate: percent / 100,
      percent,
      label: `${percent}% Off`
    }))
  ];

  function copyOffer(offer) {
    return offer ? { ...offer } : null;
  }

  function readState() {
    let stored = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(BALANCE_KEY) || "null");
    } catch (_) {
      stored = null;
    }
    const source = stored && typeof stored === "object" ? stored : DEFAULT_STATE;
    const asCount = (value, fallback) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
    };
    return {
      points: asCount(source.points, DEFAULT_STATE.points),
      totalEarned: asCount(source.totalEarned, DEFAULT_STATE.totalEarned),
      redeemed: asCount(source.redeemed, DEFAULT_STATE.redeemed),
      tier: typeof source.tier === "string" && source.tier ? source.tier : DEFAULT_STATE.tier,
      awardedOrders: Array.isArray(source.awardedOrders)
        ? source.awardedOrders.filter((orderId) => typeof orderId === "string").slice(-500)
        : []
    };
  }

  function getOffer(id) {
    return copyOffer(catalog.find((offer) => offer.id === id));
  }

  function getCatalog() {
    return {
      freebies: catalog.filter((offer) => offer.kind === "freebie").map(copyOffer),
      points: catalog.filter((offer) => offer.kind === "points").map(copyOffer)
    };
  }

  function getPendingOffer() {
    try {
      const pending = JSON.parse(window.localStorage.getItem(PENDING_KEY) || "null");
      return pending && typeof pending.id === "string" ? getOffer(pending.id) : null;
    } catch (_) {
      return null;
    }
  }

  function selectOffer(id) {
    const offer = getOffer(id);
    if (!offer) return { ok: false, reason: "That reward is not available." };
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify({ id: offer.id, selectedAt: new Date().toISOString() }));
      return { ok: true, offer };
    } catch (_) {
      return { ok: false, reason: "This browser cannot save the selected reward. Please allow site storage and try again." };
    }
  }

  function clearPendingOffer() {
    try {
      window.localStorage.removeItem(PENDING_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function quote(id, amountDue) {
    const offer = typeof id === "string" ? getOffer(id) : getOffer(id && id.id);
    if (!offer) return null;
    const eligibleTotal = money(amountDue);
    const discountAmount = offer.kind === "freebie"
      ? Math.min(eligibleTotal, offer.amount)
      : money(eligibleTotal * offer.rate);
    const pointsRequired = offer.kind === "points"
      ? Math.ceil(discountAmount * POINTS_PER_DOLLAR - 1e-9)
      : 0;
    const state = readState();
    return {
      offer,
      eligibleTotal,
      discountAmount,
      pointsRequired,
      availablePoints: state.points,
      sufficientPoints: pointsRequired <= state.points
    };
  }

  function calculatePointsEarned(eligibleSpend) {
    return Math.floor(money(eligibleSpend) * POINTS_EARNED_PER_DOLLAR + 1e-9);
  }

  function completeOrder({ orderId, eligibleSpend = 0, offerId = null, pointsRequired = 0 } = {}) {
    const normalizedOrderId = typeof orderId === "string" ? orderId.trim() : "";
    if (!normalizedOrderId) return { ok: false, reason: "A valid order ID is required." };
    const state = readState();
    if (state.awardedOrders.includes(normalizedOrderId)) {
      return { ok: true, alreadyProcessed: true, state, pointsEarned: 0, pointsRedeemed: 0 };
    }

    const offer = offerId ? getOffer(offerId) : null;
    if (offerId && !offer) return { ok: false, reason: "Reward is no longer available." };
    const cost = offer && offer.kind === "points" ? Math.max(0, Math.ceil(Number(pointsRequired) || 0)) : 0;
    if (cost > state.points) return { ok: false, reason: "There are not enough points to complete this reward." };

    const earned = calculatePointsEarned(eligibleSpend);
    state.points = state.points - cost + earned;
    state.totalEarned += earned;
    state.redeemed += cost;
    state.awardedOrders = [...state.awardedOrders, normalizedOrderId].slice(-500);
    try {
      window.localStorage.setItem(BALANCE_KEY, JSON.stringify(state));
      if (offer) window.localStorage.removeItem(PENDING_KEY);
      return { ok: true, state, pointsEarned: earned, pointsRedeemed: cost };
    } catch (_) {
      return { ok: false, reason: "The Rewards balance could not be updated in this browser." };
    }
  }

  function completeOffer(id, pointsRequired = 0) {
    const offer = getOffer(id);
    if (!offer) return { ok: false, reason: "Reward is no longer available." };
    const state = readState();
    const cost = offer.kind === "points" ? Math.max(0, Math.ceil(Number(pointsRequired) || 0)) : 0;
    if (cost > state.points) return { ok: false, reason: "There are not enough points to complete this reward." };

    if (cost > 0) {
      state.points -= cost;
      state.redeemed += cost;
    }
    try {
      window.localStorage.setItem(BALANCE_KEY, JSON.stringify(state));
      window.localStorage.removeItem(PENDING_KEY);
      return { ok: true, state, pointsRedeemed: cost };
    } catch (_) {
      return { ok: false, reason: "The reward balance could not be updated in this browser." };
    }
  }

  window.BondsRewards = Object.freeze({
    pointsPerDollar: POINTS_PER_DOLLAR,
    pointsRedeemedPerDollar: POINTS_PER_DOLLAR,
    pointsEarnedPerDollar: POINTS_EARNED_PER_DOLLAR,
    getCatalog,
    getOffer,
    getState: readState,
    getPendingOffer,
    selectOffer,
    clearPendingOffer,
    quote,
    completeOffer,
    calculatePointsEarned,
    completeOrder
  });
})();
