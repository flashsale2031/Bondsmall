(() => {
    "use strict";

    // This module stores no member records and performs no storage writes.
    // It can only compare against account/receipt data already present in this
    // browser; clearing browser storage or switching devices bypasses that history.
    const ACCOUNT_KEYS = ["fc_profile", "fc_account_session", "fc_account_credential"];
    const RECEIPT_KEYS = ["recentOrder", "fc_order_history"];

    function parseStored(storage, key) {
        try {
            const raw = storage && storage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function asArray(value) {
        if (Array.isArray(value)) return value;
        return value && typeof value === "object" ? [value] : [];
    }

    function getStorage(name) {
        try {
            return window[name] || null;
        } catch (_) {
            return null;
        }
    }

    function readExistingRecords() {
        const sessionStore = getStorage("sessionStorage");
        const localStore = getStorage("localStorage");
        const stores = [sessionStore, localStore].filter(Boolean);
        const accounts = [];
        for (const store of stores) {
            for (const key of ACCOUNT_KEYS) accounts.push(...asArray(parseStored(store, key)));
        }

        const receipts = [];
        for (const store of [localStore].filter(Boolean)) {
            for (const key of RECEIPT_KEYS) receipts.push(...asArray(parseStored(store, key)));
        }
        return { accounts, receipts };
    }

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function normalizePhone(value) {
        const digits = String(value || "").replace(/\D/g, "");
        return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    }

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function shippingInfo(record) {
        return record && record.shippingInfo && typeof record.shippingInfo === "object"
            ? record.shippingInfo
            : record;
    }

    function fullShippingIdentity(info) {
        const parts = [
            normalizeText(info && info.name),
            normalizeText(info && info.address),
            normalizeText(info && info.city),
            normalizeText(info && info.state),
            normalizeText(info && info.zip),
            normalizeText(info && info.country)
        ];
        return parts.every(Boolean) ? parts.join("|") : "";
    }

    function checkRepeatAccountInfo(candidate = {}) {
        const { accounts, receipts } = readExistingRecords();
        const previousShipping = receipts.map(shippingInfo).filter(Boolean);
        const accountEmail = normalizeEmail(candidate.email);

        // Check 1: exact normalized email against saved account profiles/receipts.
        if (accountEmail) {
            if (accounts.some((account) => normalizeEmail(account.email) === accountEmail)) {
                return { eligible: false, matchedBy: "account-email", scope: "this-browser" };
            }
            if (previousShipping.some((info) => normalizeEmail(info.email) === accountEmail)) {
                return { eligible: false, matchedBy: "receipt-email", scope: "this-browser" };
            }
        }

        // Check 2: phone number, ignoring punctuation and an optional leading US 1.
        const phone = normalizePhone(candidate.phone);
        if (phone.length >= 7) {
            const priorPhones = [
                ...accounts.map((account) => account.phone),
                ...previousShipping.map((info) => info.phone)
            ].map(normalizePhone).filter((value) => value.length >= 7);
            if (priorPhones.includes(phone)) {
                return { eligible: false, matchedBy: "phone", scope: "this-browser" };
            }
        }

        // Check 3: require the full name and complete shipping address to match;
        // matching a name or shared address alone is not enough to deny the offer.
        const identity = fullShippingIdentity(candidate);
        if (identity) {
            const priorIdentities = [
                ...previousShipping.map(fullShippingIdentity)
            ].filter(Boolean);
            if (priorIdentities.includes(identity)) {
                return { eligible: false, matchedBy: "full-shipping-identity", scope: "this-browser" };
            }
        }

        return { eligible: true, matchedBy: null, scope: "this-browser" };
    }

    window.BondsMembers = Object.freeze({
        checkRepeatAccountInfo,
        sequence: Object.freeze(["email", "phone", "full name + complete shipping address"])
    });
})();
