// ============================================
// SERVICE WORKER - NO CACHE UNTUK AUTH PAGES
// ============================================

const APP_VERSION = 'v3-' + new Date().toISOString().split('T')[0];
const STATIC_CACHE = 'static-' + APP_VERSION;
const DYNAMIC_CACHE = 'dynamic-' + APP_VERSION;

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log('[SW] Install event:', APP_VERSION);
  
  // Skip waiting agar SW aktif segera
  self.skipWaiting();
  
  // Cache file statis ESSENTIAL saja
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icon-192.png'
        // JANGAN cache login.html, register.html, dunia.html, jalan.html
      ]);
    }).catch(err => {
      console.log('[SW] Cache failed:', err);
    })
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Klaim kontrol semua clients
      self.clients.claim(),
      
      // Hapus SEMUA cache lama
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Hapus semua cache kecuali yang versi sekarang
            if (!cacheName.includes(APP_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Clear semua storage di semua clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CLEAR_STORAGE',
            timestamp: Date.now()
          });
        });
      })
    ])
  );
});

// ==================== FETCH HANDLER ====================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const requestUrl = url.pathname + url.search;
  
  console.log('[SW] Fetch:', requestUrl);
  
  // ===== BLOCKLIST: JANGAN PROSES HALAMAN INI =====
  const BLOCKED_PATHS = [
    'login',
    'register',
    'logout',
    'auth',
    'signin',
    'signup',
    'dunia',  // Tambahkan dunia.html
    'jalan'   // Tambahkan jalan.html
  ];
  
  const isBlocked = BLOCKED_PATHS.some(path => 
    url.pathname.toLowerCase().includes(path.toLowerCase())
  );
  
  // ===== SKIP UNTUK HALAMAN BLOCKED =====
  if (isBlocked) {
    console.log('[SW] Bypassing blocked page:', url.pathname);
    return; // Biarkan request ke network tanpa caching
  }
  
  // ===== SKIP UNTUK REQUEST METHOD SELAIN GET =====
  if (event.request.method !== 'GET') {
    return;
  }
  
  // ===== SKIP UNTUK REQUEST DENGAN QUERY PARAMETER =====
  if (url.search) {
    console.log('[SW] Bypassing request with query params');
    return;
  }
  
  // ===== HANYA PROSES ASSET STATIS =====
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/i.test(url.pathname);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Jika ada di cache, return (kecuali manifest.json)
        if (cachedResponse && !url.pathname.includes('manifest.json')) {
          return cachedResponse;
        }
        
        // Fetch dari network
        return fetch(event.request).then(response => {
          // Validasi response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone response untuk cache
          const responseToCache = response.clone();
          
          // Simpan ke cache dinamis
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // Fallback untuk asset yang gagal load
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
    );
  } else {
    // Untuk HTML pages lainnya, bypass SW
    return;
  }
});

// ==================== MESSAGE HANDLER ====================
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear semua cache
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[SW] Clearing cache by request:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

// ==================== SYNC & BACKGROUND SYNC ====================
self.addEventListener('sync', event => {
  console.log('[SW] Sync event:', event.tag);
});

self.addEventListener('push', event => {
  console.log('[SW] Push event');
});

// ==================== ERROR HANDLER ====================
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
});
