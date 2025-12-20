// Service Worker for NOPE PWA
const CACHE_NAME = 'nope-v1.3';
const urlsToCache = [
    '/',
    '/index.html',
    '/home.html',
    '/feed.html',
    '/styles.css',
    '/auth.js',
    '/app.js',
    '/feed.js',
    '/manifest.json',
    '/icons/icon-72.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event (Cache-first strategy)
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip Chrome extensions
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    // Skip analytics if present
    if (event.request.url.includes('analytics')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache the new response
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.log('Fetch failed; returning offline page:', error);
                        
                        // For HTML requests, return cached page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        
                        // For CSS/JS, return cached version if exists
                        return caches.match(event.request);
                    });
            })
    );
});

// Background sync for potential future features
self.addEventListener('sync', event => {
    if (event.tag === 'sync-rants') {
        event.waitUntil(syncRants());
    }
});

// Periodic background sync (if browser supports it)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'backup-data') {
        event.waitUntil(backupUserData());
    }
});

// Example sync functions (for future use)
async function syncRants() {
    // Could sync with cloud backup if implemented later
    console.log('Syncing rants...');
}

async function backupUserData() {
    // Backup user data to IndexedDB
    console.log('Backing up user data...');
}

// Push notifications (if implemented later)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Update dari NOPE',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: data.tag || 'nope-notification',
        data: {
            url: data.url || '/home.html'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'NOPE', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
    );
});
