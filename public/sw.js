// Cache only public shell assets. Authenticated pages and tickets remain network-only.
const CACHE_NAME = 'haramaya-trip-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/brand/favicon.ico',
  '/brand/favicon-16x16.png',
  '/brand/favicon-32x32.png',
  '/brand/favicon-48x48.png',
  '/brand/apple-touch-icon.png',
  '/brand/haramaya-trip-logo.png',
  '/brand/haramaya-trip-compact.png',
  '/brand/haramaya-trip-seal.png',
  '/brand/haramaya-trip-app-192.png',
  '/brand/haramaya-trip-app-512.png',
  '/brand/haramaya-trip-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Authenticated pages, tickets, proofs, and verification APIs are network-only.
  if (
    url.pathname.startsWith('/bookings') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/staff') ||
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/notifications')
  ) {
    return;
  }

  // Static assets: Stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});
