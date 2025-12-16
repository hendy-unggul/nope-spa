// ============================================
// NOPE SERVICE WORKER - SIMPLE NO CACHE
// ============================================

const APP_VERSION = 'nope-v1.0-' + new Date().toISOString().split('T')[0];

self.addEventListener('install', event => {
  console.log('[NOPE SW] Installing version:', APP_VERSION);
  self.skipWaiting(); // Aktifkan segera
});

self.addEventListener('activate', event => {
  console.log('[NOPE SW] Activating');
  event.waitUntil(self.clients.claim()); // Kontrol semua tab
  
  // Clear semua cache lama
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[NOPE SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // JANGAN cache halaman auth/login/create
  const url = new URL(event.request.url);
  const path = url.pathname;
  
  // Skip caching untuk semua .html files (biarkan fresh)
  if (path.endsWith('.html') || 
      path.includes('/?') || 
      path === '/' ||
      event.request.method !== 'GET') {
    return; // Biarkan langsung ke network
  }
  
  // Hanya cache asset statis (CSS, JS, images) kalau mau
  // Tapi untuk simplicity, skip semua caching
  return;
});

// Handler untuk clear cache via message
self.addEventListener('message', event => {
  if (event.data === 'CLEAR_NOPE_CACHE') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
});
