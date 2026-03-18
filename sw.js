const CACHE_NAME = 'hanami2026-v1';
const urlsToCache = [
  '/hanami2026/',
  '/hanami2026/index.html',
  '/hanami2026/manifest.json',
  '/hanami2026/icons/icon-192.png',
  '/hanami2026/icons/icon-512.png'
];

// Install event: cache essential files
self.addEventListener('install', event => {
  console.log('Service Worker (Hanami2026): Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(error => {
          console.warn('Some files could not be cached, continuing...', error);
          return Promise.resolve(); // don't fail the install
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches from this scope
self.addEventListener('activate', event => {
  console.log('Service Worker (Hanami2026): Activating...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker (Hanami2026): Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker (Hanami2026): Now controlling clients');
      return self.clients.claim();
    })
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // For image files, we try cache first, then network, and optionally store in cache
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          // Only cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If image fetch fails, return a simple SVG placeholder
          return new Response(
            '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#362f4a"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#ffa5b9" text-anchor="middle">🌸</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // For other requests (HTML, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        // Optionally cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(error => {
        // If offline and the request is for a navigation, return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/hanami2026/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});