# Client-side posting conversion audit

## Browser-safe logic

The following processes can be converted to JavaScript inside `seller.html`: loading static product data from `products.json`, maintaining account and location settings in `localStorage`, validating product fields, normalizing descriptions, generating platform-specific payloads, estimating queue duration, sequencing jobs, exporting a JSON/CSV handoff bundle, and opening the destination platform pages for manual completion.

## Server-only or privileged logic

The current Python adapters use Selenium/WebDriver, browser-window control, persistent driver state, subprocess execution, filesystem reads/writes, server-side account persistence, SSE log streaming, and cross-origin site automation. Plain browser JavaScript cannot launch or control a separate Chromium/WebDriver session, bypass same-origin/CORS restrictions, or safely automate logged-in third-party posting pages. Credentials and CAPTCHA/OTP data also should not be embedded in a static HTML page.

`server_new.py` currently provides product/account persistence, login-window routes, `/post`, `/bulk-post`, status polling, SSE logs, kill/reset controls, and Python adapter execution. Removing the server completely means the actual posting step must be either an official client-safe API, a browser extension/local companion app with explicit user takeover, or a manual handoff workflow.

## Safe conversion boundary

A serverless conversion can remove the server from product preparation and queue management, but it cannot honestly preserve fully automatic cross-site posting in a plain HTML file. The recommended implementation is a client-side queue with localStorage, platform payload previews, downloadable job bundles, and manual “Open destination” handoff buttons. The existing server adapter remains an optional legacy mode until a browser extension or authorized platform integration is chosen.
