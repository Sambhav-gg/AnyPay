const CACHE = 'anypay-v1'

// On install: cache the page shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((cache) =>
            cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/favicon.svg',
                '/icons.svg',
            ])
        )
    )
    self.skipWaiting()
})

// On activate: delete old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    )
    self.clients.claim()
})

// On fetch: cache-first for same-origin assets, network-first for everything else
self.addEventListener('fetch', (e) => {
    // Only handle GET requests
    if (e.request.method !== 'GET') return

    const url = new URL(e.request.url)

    // Cache-first for same-origin static assets (JS, CSS, images, fonts)
    if (url.origin === self.location.origin) {
        e.respondWith(
            caches.match(e.request).then((cached) => {
                if (cached) return cached

                // Not in cache yet — fetch and store it
                return fetch(e.request).then((response) => {
                    // Only cache valid responses
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response
                    }
                    const clone = response.clone()
                    caches.open(CACHE).then((cache) => cache.put(e.request, clone))
                    return response
                })
            }).catch(() => {
                // Offline and not cached — return index.html as fallback for navigation
                if (e.request.mode === 'navigate') {
                    return caches.match('/index.html')
                }
            })
        )
        return
    }

    // For cross-origin requests (e.g. CDN fonts), network with cache fallback
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    )
})