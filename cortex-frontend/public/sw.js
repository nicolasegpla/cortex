/**
 * CORTEX Phase 1 Service Worker
 *
 * Scope: lightweight static asset caching for faster repeat loads.
 * Out of scope: offline writes, background sync, authenticated API caching.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `cortex-static-${CACHE_VERSION}`;

const STATIC_ASSET_EXTENSIONS = ['.js', '.css', '.png', '.svg', '.ico', '.woff2', '.woff'];

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isStaticAsset(url) {
    const pathname = url.pathname.toLowerCase();
    return STATIC_ASSET_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('cortex-static-') && name !== STATIC_CACHE_NAME)
                        .map((name) => caches.delete(name)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || !isSameOrigin(url) || !isStaticAsset(url)) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();

                caches.open(STATIC_CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return response;
            });
        }),
    );
});
