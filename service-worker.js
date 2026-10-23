const CACHE_NAME = "bondsmall-app-shell-v1";
const APP_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/assets/app-icons/app-icon-192.png",
  "/assets/app-icons/app-icon-512.png",
  "/assets/app-icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("bondsmall-app-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cachedOfflinePage = await caches.match("/offline.html");
      return cachedOfflinePage || new Response(
        "Bonds Mall is offline. Please reconnect and try again.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    })
  );
});
