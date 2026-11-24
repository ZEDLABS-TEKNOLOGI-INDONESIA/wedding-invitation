/* Service Worker — Wedding Management (ZEDLABS)
 * Strategi aman untuk Astro SSR multi-pasangan:
 * - Tidak pernah meng-cache endpoint privat (/api/auth, /api/admin, /api/superadmin, /api/billing, /api/whatsapp, non-GET)
 * - Cache-First untuk aset build immutable (/_astro/*) & media lokal (/api/media/*)
 * - Network-First + fallback /offline untuk navigasi halaman HTML
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `wm-static-${CACHE_VERSION}`;
const PAGES_CACHE = `wm-pages-${CACHE_VERSION}`;
const MEDIA_CACHE = `wm-media-${CACHE_VERSION}`;
const MAX_MEDIA_ENTRIES = 60;

const PRECACHE_URLS = [
  "/offline",
  "/favicon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/manifest.webmanifest",
];

const NEVER_CACHE_PATHS = [
  "/admin",
  "/superadmin",
  "/masuk",
  "/daftar",
  "/lupa-password",
  "/api/auth/",
  "/api/admin",
  "/api/superadmin",
  "/api/billing",
  "/api/whatsapp/",
  "/api/couple/",
  "/api/export-",
  "/api/upload",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const validCaches = new Set([STATIC_CACHE, PAGES_CACHE, MEDIA_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (validCaches.has(key) ? Promise.resolve() : caches.delete(key))),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (NEVER_CACHE_PATHS.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  // 1. Aset build Astro immutable (/_astro/*) & font/ikon statis -> Cache-First
  if (
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(woff2|woff|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // 2. Media lokal (/api/media/* & file audio/gambar) -> Cache-First dengan batas jumlah
  if (
    url.pathname.startsWith("/api/media/") ||
    /\.(png|jpe?g|webp|mp3|ogg|m4a)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches
              .open(MEDIA_CACHE)
              .then((c) => c.put(request, clone))
              .then(() => trimCache(MEDIA_CACHE, MAX_MEDIA_ENTRIES));
          }
          return response;
        });
      }),
    );
    return;
  }

  // 3. Endpoint API publik lain tidak di-cache agar data RSVP/ucapan selalu segar
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 4. Navigasi halaman HTML -> Network-First, fallback ke cache halaman lalu /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return (
            offline ||
            new Response("Anda sedang offline. Periksa koneksi internet lalu coba lagi.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
  }
});
