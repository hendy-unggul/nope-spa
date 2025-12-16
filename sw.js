const CACHE_NAME = 'app-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('Service Worker: Installed');
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Klaim semua klien segera
      self.clients.claim(),
      
      // Hapus semua cache lama
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
              console.log('Service Worker: Clearing Old Cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
  console.log('Service Worker: Activated');
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  // JANGAN intercept request API atau data sensitif
  const url = new URL(event.request.url);
  
  // 1. Skip request API (biarkan fresh selalu)
  if (url.pathname.includes('/api/') || 
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/register')) {
    return; // Biarkan request lepas tanpa caching
  }
  
  // 2. Skip request dengan query parameter (untuk hindari cache unique session)
  if (url.search) {
    return;
  }
  
  // 3. Hanya cache asset statis
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Jika ada di cache, return
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Jika tidak, fetch dan cache untuk future
        return fetch(event.request).then(response => {
          // Jangan cache response yang tidak valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone response untuk cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            // JANGAN cache halaman login/register
            if (!url.pathname.includes('login') && 
                !url.pathname.includes('register')) {
              cache.put(event.request, responseToCache);
            }
          });
          
          return response;
        });
      }).catch(() => {
        // Fallback untuk halaman offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});

// ==================== MESSAGE HANDLER ====================
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
    console.log('Service Worker: Cache Cleared by Message');
  }
});
