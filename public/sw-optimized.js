// Optimized Service Worker for Fast First Load
const CACHE_NAME = 'lwsrh-v3';
const DATA_CACHE_NAME = 'lwsrh-data-v3';

// MINIMAL critical files for first load - cache progressively
const CRITICAL_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/lmm.png'
];

// Install event - cache ONLY critical resources
self.addEventListener('install', (event) => {
  console.log('⚡ Service Worker installing (optimized)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching critical resources only...');
        // Use addAll with error handling
        return cache.addAll(CRITICAL_CACHE_URLS).catch(err => {
          console.warn('⚠️ Some critical resources failed to cache:', err);
          // Continue anyway - don't block installation
        });
      })
      .then(() => {
        console.log('✅ Critical resources cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - SMART caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other origins
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // LOGOUT DETECTION - Clear all caches if logout is happening
  if (url.pathname === '/auth' && url.searchParams.get('logout') === 'true') {
    event.respondWith(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        return fetch(request);
      })
    );
    return;
  }

  // API requests - Network First (with timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      Promise.race([
        fetch(request).then(response => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }),
        // Timeout after 10 seconds (increased from 5s for slower connections/local dev)
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        )
      ]).catch(() => {
        // Fallback to cache
        return caches.match(request);
      })
    );
    return;
  }

  // Static assets - Cache First (progressive caching)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|ico)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version immediately
          return cachedResponse;
        }

        // Fetch and cache for next time
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages - Network First with fast fallback
  event.respondWith(
    fetch(request, {
      // Add timeout to prevent hanging (increased to 10s for reliability)
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
    })
      .then(response => {
        // Cache successful page loads
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      })
  )
});


// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  // Handle background sync here if needed
});

// Push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');
  // Handle push notifications here if needed
});

console.log('⚡ Optimized Service Worker loaded');
