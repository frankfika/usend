/**
 * USend — offline shell service worker.
 *
 * Goals: the app shell stays installable and opens even with no network,
 * while transfers themselves are never cached. Any request under /api/ is
 * passed straight through to the network — caching encrypted payloads or
 * pairing codes on the device would break the "temporary by design" promise.
 */

const CACHE = "usend-shell-v1";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/brand/usend-mark.svg",
];
const MAX_CACHED_ENTRIES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

const trim = async (cache) => {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_ENTRIES) return;
  await Promise.all(
    keys.slice(0, keys.length - MAX_CACHED_ENTRIES).map((key) => cache.delete(key)),
  );
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Transfers, pairing codes and the GitHub star counter stay on the network.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/.well-known/")) return;

  // Navigations: try the network first so a fresh build is picked up, fall
  // back to the cached shell when the device is offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || Response.error())),
    );
    return;
  }

  // Static assets are content hashed, so they can be served from the cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then(async (cache) => {
              await cache.put(request, copy);
              await trim(cache);
            });
          }
          return response;
        }),
    ),
  );
});
