// Service worker for the portal PWA, registered at scope "/" for students and
// admins alike - see src/components/pwa-register.tsx.
//
// Deliberately conservative: this app's pages are server-rendered from a live
// database, and serving a stale question set or scoreboard from cache would be
// worse than showing nothing. So navigations always go to the network, and the
// cache exists only to put a friendly page up when the device is offline.
// Static build assets are cached because they are content-hashed and therefore
// safe to reuse - in production. The dev server reuses chunk names, so caching
// them there serves stale JavaScript after every edit; see IS_DEV below.

const VERSION = "v3";
const SHELL_CACHE = `portal-shell-${VERSION}`;
const ASSET_CACHE = `portal-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

// Turbopack reuses chunk filenames between rebuilds, so a cache-first rule on
// /_next/static would keep handing back the previous build's code. Production
// filenames are content-hashed, so this only disables caching locally.
const IS_DEV =
  self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      // Take over as soon as it is ready rather than waiting for every tab to
      // close; there is no old cached HTML for a new worker to conflict with.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authentication or server actions - a cached session check is
  // a security problem, not a performance win.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error())
      )
    );
    return;
  }

  // Build output is content-hashed in production, so a cache hit can never be
  // stale there. Locally it can, so leave it to the network.
  if (
    !IS_DEV &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
