# Craigslist Bulkpost API configuration findings

Source pages:

- https://bapi.craigslist.org/bulkpost-docs/v1/
- https://bapi.craigslist.org/bulkpost-docs/v1/bulkpost-openapi.yaml
- https://www.craigslist.org/about/bulk_posting_interface

The official API uses OAuth2 client credentials. The client ID is the Craigslist email and account ID separated by a semicolon: `USER_EMAIL;ACCOUNT_ID`. The token endpoint is `https://bapi.craigslist.org/bulkpost/oauth/access-token`. Token requests use HTTP Basic authentication with `USER_EMAIL;ACCOUNT_ID:USER_PASSWORD`, form data `grant_type=client_credentials`, and a scope such as `bulkpost.posting` or `bulkpost.posting bulkpost.account.billing`. API calls use `Authorization: Bearer <access_token>`.

The documented API base is `https://bapi.craigslist.org/bulkpost/v1`. Documented operations include posting-area lookup, editing/deleting existing postings, image management, account billing, and statistics. The documentation explicitly links to Craigslist’s RSS bulk-posting interface for creating new posts; the v1 OpenAPI paths do not expose a create-new-post endpoint.

Implication for the current CLBlast lister: do not put the client secret/password or token exchange in browser-side seller.html. seller.html may collect and pass a non-secret account ID and an explicit API mode, but OAuth token exchange and any official API calls must remain server-side. The existing browser automation path should remain the fallback for creating new postings unless an RSS creation implementation is added separately.
