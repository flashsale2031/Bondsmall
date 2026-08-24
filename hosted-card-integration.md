# Hosted/tokenized card-entry contract

The Bonds Bank POS no longer renders or reads PAN, CVV, expiry, or cardholder-name inputs. The payment-card UI must be supplied by a PCI DSS validated third-party payment service provider (TPSP) using a hosted page/iframe or equivalent provider-controlled tokenization flow.

## Required provider behavior

1. The provider owns the card-data fields.
2. The provider returns a short-lived or provider-controlled token/reference to the merchant page.
3. The browser sends only the token reference to `/api/payments/visa-direct`.
4. The backend maps the reference to the Visa Direct request using the merchant's authorized Visa program.
5. The backend never accepts PAN/CVV from the browser endpoint.
6. The EmailJS notification receives only brand, last four, payment reference, and status.

The current frontend uses these placeholders and must be replaced with the actual PCI-validated provider's documented URL/origin:

- `iframeUrl`
- `allowedOrigin`
- token postMessage event contract

Do not use the example placeholder host in production.

## PCI boundary

The hosted payment page/iframe must be delivered directly by the PCI DSS validated provider. PCI SSC notes that all payment-page elements must originate from the validated third party for SAQ A eligibility; merchant-provided card-data fields would change that assessment. See PCI SSC guidance before selecting the final integration model.
