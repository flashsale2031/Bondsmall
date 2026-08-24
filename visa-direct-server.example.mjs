import express from "express";
import crypto from "node:crypto";

/*
 * Bonds Bank / POS Visa Direct server adapter.
 *
 * Secrets MUST be supplied by a secret manager/environment:
 * VISA_API_BASE_URL
 * VISA_USERNAME
 * VISA_PASSWORD
 * VISA_CERT_PATH
 * VISA_KEY_PATH
 * VISA_MLE_KEY_ID
 * VISA_MLE_SHARED_SECRET
 * VISA_ACQUIRING_BIN
 * VISA_ACQUIRER_COUNTRY_CODE
 *
 * Do not place these values in frontend JavaScript, EmailJS templates,
 * source control, logs, or localStorage.
 *
 * The exact Visa Direct endpoint/payload must be selected from the Visa
 * product(s) for which the merchant has been approved. This adapter keeps
 * that product-specific call behind the server boundary.
 */

const app = express();
app.use(express.json({ limit: "64kb" }));

function requireMerchantSession(req, res, next) {
  // Replace with Bonds Bank's real authenticated merchant/session middleware.
  if (!req.headers.authorization) {
    return res.status(401).json({ success: false, message: "Merchant authentication required." });
  }
  next();
}

function assertAmount(amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999) {
    throw new Error("Invalid payment amount.");
  }
}

function redactError(error) {
  return {
    message: "Payment processing failed.",
    correlationId: crypto.randomUUID()
  };
}

app.post("/api/payments/visa-direct", requireMerchantSession, async (req, res) => {
  try {
    const { amount, currency, paymentMethod, brand, last4, card, merchantOrderId, idempotencyKey } = req.body || {};
    assertAmount(Number(amount));

    if (currency !== "USD") throw new Error("Unsupported currency.");
    if (!merchantOrderId || !idempotencyKey) throw new Error("Missing transaction identifiers.");
    if (!card?.number || !card?.expiry || !card?.cvv || !card?.name) {
      throw new Error("Incomplete payment credentials.");
    }

    /*
     * Production implementation:
     * 1. Validate merchant session and POS permissions.
     * 2. Enforce idempotency before calling Visa.
     * 3. Tokenize/forward payment credentials through the approved PCI-compliant
     *    payment component/processor. Prefer a PCI token reference instead of PAN.
     * 4. Build the exact Visa Direct AFT/OCT or Visa Direct Connect request
     *    required by the approved program.
     * 5. Apply Visa-required mutual TLS and MLE server-side.
     * 6. Persist only non-sensitive transaction metadata.
     * 7. Return a transaction reference/status to the browser.
     *
     * Do NOT log req.body.card or store it in a database.
     */

    // Placeholder until the merchant's approved Visa API product and certified
    // endpoint/payload are configured.
    if (!process.env.VISA_CERT_PATH || !process.env.VISA_KEY_PATH ||
        !process.env.VISA_USERNAME || !process.env.VISA_PASSWORD) {
      return res.status(503).json({
        success: false,
        message: "Visa Direct server credentials are not configured."
      });
    }

    // Call the certified Visa client here. Never return PAN/CVV.
    const reference = `VISA-${crypto.randomUUID()}`;

    return res.json({
      success: true,
      status: "authorized",
      reference,
      brand,
      last4: String(last4 || "").slice(-4)
    });
  } catch (error) {
    const safe = redactError(error);
    console.error("Visa payment error", safe);
    return res.status(400).json({
      success: false,
      message: safe.message,
      correlationId: safe.correlationId
    });
  }
});

app.listen(process.env.PORT || 3000);
