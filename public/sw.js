/*
 * Minimal service worker (04-ui-spec § PWA): it exists so the app qualifies
 * as installable, and it caches nothing because the app is online-only (D19).
 * Every request goes straight to the network.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No respondWith: the browser handles the request normally.
});
