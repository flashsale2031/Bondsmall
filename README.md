# Bonds Bank POS + Visa Direct integration

This package updates the supplied `bondsmall-3.js` payment flow.

## What changed

1. The checkout payment is routed to a server endpoint:
   `POST /api/payments/visa-direct`.
2. Visa Direct credentials and cryptographic material stay server-side.
3. The browser no longer writes PAN, CVV, or expiry to `localStorage`.
4. EmailJS remains enabled for order notifications, but receives only:
   - order/customer information
   - payment method and brand
   - last four digits
   - payment reference
   - payment status
   - order totals/items
5. EmailJS never receives PAN, CVV, expiry, Visa credentials, MLE keys,
   authentication tokens, or bank credentials.
6. Idempotency is required for payment requests.
7. The server returns only a safe payment reference/status.

## Production requirement

The supplied page currently has ordinary card inputs. For a production
card-payment deployment, replace those inputs with a PCI-compliant hosted
field/tokenization solution so the Bonds Bank web frontend does not handle
raw PAN/CVV. The server adapter is intentionally the security boundary.

The exact Visa API operation (Visa Direct for Card AFT/OCT, or an approved
Visa Direct Connect payin/payout flow) must match the merchant's Visa
program authorization and certified payload. Do not invent or substitute
endpoints.

## EmailJS

The existing EmailJS service/template/public key remains intact. Update the
EmailJS template to use `card_last4`, `payment_reference`, and
`payment_status`; remove any template variables that print PAN/CVV/expiry.

## Secrets

Do not commit `.env`, certificates, private keys, Visa passwords, MLE shared
secrets, or merchant credentials. Use a production secret manager.

