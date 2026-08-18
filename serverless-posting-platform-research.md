# Serverless posting platform research

## Craigslist

Official documentation: https://bapi.craigslist.org/bulkpost-docs/v1/

The Craigslist Bulkpost v1 API provides OAuth2 client-credentials authentication and operations for existing postings, images, billing, and statistics. The documentation links to Craigslist's RSS bulk-posting interface for creating new posts; the v1 OpenAPI definition does not expose a create-new-post endpoint. The current browser/RSS creation path therefore cannot be replaced by a direct browser API call unless an approved RSS feed submission is implemented.

## AdLandPro

Search sources reviewed:

- https://www.adlandpro.com/
- https://usa.adlandpro.com/

Search results surfaced the public classified site and listing pages but no official developer documentation, public API reference, or documented bulk-upload endpoint. No serverless browser-callable API should be assumed without explicit platform authorization and documentation.

## Credential and signup configuration

The following configuration should be supplied through a local `.env` file, deployment secret manager, or the browser’s user-authorized session—not committed to Markdown or source control.

| Platform | Signup or account URL | Required configuration | Safe placeholder |
|---|---|---|---|
| Craigslist Bulkpost | [Craigslist Bulkpost documentation](https://bapi.craigslist.org/bulkpost-docs/v1/) and the Craigslist account associated with the seller | Seller email, Bulkpost account ID, seller password, OAuth scope. The documented client identifier is `SELLER_EMAIL;BULKPOST_ACCOUNT_ID`; the OAuth token endpoint is `https://bapi.craigslist.org/bulkpost/oauth/access-token`. | `CRAIGSLIST_EMAIL=your-email@example.com`, `CRAIGSLIST_BULKPOST_ACCOUNT_ID=your-account-id`, `CRAIGSLIST_PASSWORD=use-secret-manager`, `CRAIGSLIST_BULKPOST_SCOPE=bulkpost.posting` |
| AdLandPro | [AdLandPro](https://www.adlandpro.com/) account signup/login | Account email and password for the existing browser workflow. No official public API signup or API-key flow was found in the reviewed sources. | `ADLANDPRO_EMAIL=your-email@example.com`, `ADLANDPRO_PASSWORD=use-secret-manager` |
| ClassifiedAds.com | [ClassifiedAds.com](https://www.classifiedads.com/) [login/help](https://www.classifiedads.com/help) | Account email and password for the existing browser workflow. No official public API signup or API-key flow was found in the reviewed sources. | `CLASSIFIEDADS_EMAIL=your-email@example.com`, `CLASSIFIEDADS_PASSWORD=use-secret-manager` |

Do not paste real passwords, API keys, OAuth client secrets, access tokens, Gmail app passwords, or CAPTCHA keys into this Markdown file. Keep a local `.env` file out of version control, use deployment secrets in production, and rotate any credential that is accidentally committed. The seller UI may display configuration field names and setup links, but token exchange and browser automation credentials must remain in protected runtime storage.

## Current Bondsmall architecture

`seller.html` currently calls the local backend at `SERVER = http://localhost:5000` for product loading, account persistence, login-window flows, `/post`, `/bulk-post`, status polling, SSE logs, and product mutations. `server_new.py` invokes platform adapters: `craigslist_new.py`, `adlandpro.py`, and `classifiedads.py`. Removing the server entirely would require replacing browser automation, credential storage, login-window handling, and product persistence with public client-safe APIs or user-authorized external integrations; those capabilities are not currently documented for AdLandPro or ClassifiedAds.com.
