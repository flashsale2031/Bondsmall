# Bonds Mall on iPhone and iPad

## What this conversion delivers

Bonds Mall is available as an installable Progressive Web App (PWA) from the existing site origin. iPhone and iPad users add it to the Home Screen from Safari and can launch it in an app-style window. The installed experience uses the existing Bonds Mall website and online commerce services; this repository does not contain a signed IPA or an App Store listing.

## Website app components

- `manifest.webmanifest` declares the name, standalone display mode, start route, and scope.
- `apple-touch-icon` points to `assets/app-icons/apple-touch-icon.png`, derived from the existing Bonds Mall logo.
- `app-install.js` registers the service worker on HTTPS and routes the iOS footer action to this platform guide when the app is not already running standalone.
- `ios-app.html` gives the Safari installation steps: Share, Add to Home Screen, and Add.
- `service-worker.js` caches only the offline shell and app icons. It does not store account, checkout, payment, or product data.

Unlike the Android browser flow, this iOS PWA path does not use a browser install-prompt API. Open the guide in Safari and use its Share menu. Shopping and checkout require an internet connection.

## If a native App Store app is required

A native iOS release is separate from this PWA. Before publishing, select a production bundle identifier, decide whether to wrap the site or build a native/Capacitor client, configure Associated Domains and Universal Links if app-opening links are needed, prepare signing and privacy disclosures, and build/test the app in Xcode. Submission requires an authorized Apple Developer account and App Store Connect listing. Do not advertise a placeholder bundle ID or store URL as a live download.
