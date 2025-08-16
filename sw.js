const CACHE_NAME = 'deepdive-podcasts-v1';
const DYNAMIC_CACHE_NAME = 'deepdive-dynamic-v1';

// These are the files that make up the "app shell" and are cached on install.
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    '/manifest.json'
];

// Install event: cache the app shell.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: serve from cache or fetch from network.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Strategy for API calls: Network first, then cache.
    // This ensures the user gets the latest data when online.
    if (requestUrl.pathname === '/api/music') {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(event.request).then(response => {
                    // If the network request is successful, cache it and return it.
                    cache.put(event.request, response.clone());
                    return response;
                }).catch(() => {
                    // If the network request fails, return the cached response.
                    return cache.match(event.request);
                });
            })
        );
    // Strategy for other requests: Cache first, then network.
    // This is good for static assets that don't change often.
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        // If we have a cached response, return it.
                        return response;
                    }
                    // If not in cache, fetch from the network.
                    return fetch(event.request).then(networkResponse => {
                        // For non-API assets, we can also cache them dynamically as they are requested.
                        // This is useful for images or other assets not in the initial cache list.
                        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            // Don't cache chrome-extension URLs
                            if (event.request.url.startsWith('chrome-extension://')) {
                                return networkResponse;
                            }
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    });
                })
                .catch(error => {
                    console.error('Fetching failed:', error);
                    // You could return a fallback offline page here if needed.
                })
        );
    }
});
