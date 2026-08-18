# Multi-platform seller route research

Research date: 2026-08-18.

| Platform | Official host | Seller route finding | Implementation note |
|---|---|---|---|
| OfferUp | `https://offerup.com/` | Official home page exposes login and local marketplace navigation; the official help page explains that posting is performed in the mobile app. | Use the verified OfferUp host for destination safety and keep the dashboard flow as a prepared client-side handoff with manual completion where web listing is unavailable. |
| Mercari | `https://www.mercari.com/` | Official help/seller content is under `/us/how-to-sell/`; page access may be affected by cookie/consent UI. | Use `www.mercari.com` and `/us/` routes for validation, with manual authenticated completion in the compact session. |
| Poshmark | `https://poshmark.com/` | Official selling guidance is available through Poshmark’s help/guide pages; listing is generally an authenticated seller action. | Use `poshmark.com` and `www.poshmark.com` host variants with a prepared handoff panel. |
| Facebook Marketplace | `https://www.facebook.com/marketplace/` | Official Marketplace page and Facebook Help Center provide the listing destination and sell-on-Marketplace guidance. | Use `www.facebook.com` with `/marketplace` route validation; do not attempt cross-origin form automation. |
| Nextdoor | `https://nextdoor.com/` | Official Nextdoor domain is the supported authenticated community marketplace entry point; local posting routes may vary by user location. | Use `nextdoor.com` and `www.nextdoor.com` host variants with broad secure-path validation and manual completion. |

The requested implementation excludes eBay and Etsy. Since several platforms restrict web listing creation or use location/account-dependent flows, the safe implementation pattern is client-side prepared listing handoff plus explicit user confirmation, not automatic cross-origin form submission.

Sources visited:
- https://offerup.com/
- https://www.mercari.com/us/how-to-sell/
- https://www.facebook.com/marketplace/
- https://www.facebook.com/help/153832041692242
- https://poshmark.com/
- https://nextdoor.com/

No credentials or secrets were recorded.
