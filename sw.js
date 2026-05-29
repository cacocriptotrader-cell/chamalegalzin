const CACHE_NAME = "docfin-static-v1";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/docfin-icon.svg",
  "/icons/docfin-icon-192.png",
  "/icons/docfin-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.url.includes("/auth/") || request.url.includes("/rest/")) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => caches.match("/"));
    })
  );
});
