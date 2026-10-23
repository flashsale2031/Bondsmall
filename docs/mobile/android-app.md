# Bonds Mall on Android

## What this conversion delivers

Bonds Mall is available as an installable Progressive Web App (PWA) at the existing site origin. Android users can install the storefront from a supported browser and launch it from the home screen or app list. The installed experience uses the same website and online commerce services; this repository does not contain a signed APK/AAB or a Google Play listing.

## Website app components

- `manifest.webmanifest` defines the app name, standalone display mode, start route, scope, and icon sizes.
- `service-worker.js` supplies the installation-required worker and a small offline shell. It deliberately does not cache account, checkout, payment, or product data.
- `assets/app-icons/` contains the Android install icons derived from the existing Bonds Mall logo.
- `app-install.js` captures the Android browser `beforeinstallprompt` event and registers the worker on HTTPS.
- `android-app.html` is the install guide reached by the Android footer action.

The footer action asks the browser to install when the browser exposes an install prompt. If not, the Android guide explains the browser menu route. After installation, launch Bonds Mall from the new home-screen/app-list icon. Online access is needed for shopping and checkout.

## If a native Play Store app is required

A native Android release is a separate deliverable from this PWA. Before publishing, choose and reserve the production application ID, decide whether to wrap the site as a Trusted Web Activity or build a native/Capacitor client, configure Android Digital Asset Links for `bondsmall.com`, prepare signing keys and privacy/store disclosures, and build and test a signed release bundle. Then publish through an authorized Google Play Console account and replace/update the footer destination only after the approved Play listing exists. Do not advertise a placeholder package ID or store URL as a live download.
