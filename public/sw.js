// Cache only public shell assets. Authenticated pages and tickets remain network-only.
const CACHE_NAME = 'haramaya-trip-v6';
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
        keys
          .filter((key) => key.startsWith('haramaya-trip-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isNextStaticAsset = url.pathname.startsWith('/_next/static/');
  const isPrecachedAsset = STATIC_ASSETS.includes(url.pathname);
  if (!isNextStaticAsset && !isPrecachedAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse.ok &&
          networkResponse.type === 'basic' &&
          !networkResponse.headers.has('Set-Cookie')
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.put(event.request, networkResponse.clone()).then(() => {
              return networkResponse;
            });
          });
        }
        return networkResponse;
      });
    })
  );
});
