// Service worker for the admin PWA.
//
// Registered from the admin layout with scope "/admin/", so it never touches
// the student side of the portal - see src/components/pwa-register.tsx.
//
// Deliberately conservative: this app's pages are server-rendered from a live
// database, and serving a stale question set or scoreboard from cache would be
// worse than showing nothing. So navigations always go to the network, and the
// cache exists only to put a friendly page up when the device is offline.
// Static build assets are cached because they are content-hashed and therefore
// safe to reuse.

const VERSION = "v1";
const SHELL_CACHE = `admin-shell-${VERSION}`;
const ASSET_CACHE = `admin-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

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

  // Build output is content-hashed, so a cache hit can never be stale.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
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
