// ============================================
// RESET SESSION SCRIPT - HARUS DILOAD DI SEMUA HALAMAN
// ============================================

(function() {
    'use strict';
    
    console.log('=== RESET SESSION SCRIPT LOADED ===');
    
    // Config
    const CONFIG = {
        FORCE_RESET: true,
        DEBUG: true,
        VERSION: '1.0.0'
    };
    
    // Utility functions
    const utils = {
        log: function(...args) {
            if (CONFIG.DEBUG) {
                console.log('[Reset]', ...args);
            }
        },
        
        error: function(...args) {
            console.error('[Reset]', ...args);
        },
        
        generateId: function() {
            return 'rs-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
    };
    
    // Storage cleaner
    const storageCleaner = {
        clearLocalStorage: function() {
            try {
                const before = localStorage.length;
                localStorage.clear();
                const after = localStorage.length;
                utils.log(`LocalStorage cleared: ${before} -> ${after} items`);
                return true;
            } catch (e) {
                utils.error('Failed to clear localStorage:', e);
                return false;
            }
        },
        
        clearSessionStorage: function() {
            try {
                const before = sessionStorage.length;
                sessionStorage.clear();
                const after = sessionStorage.length;
                utils.log(`SessionStorage cleared: ${before} -> ${after} items`);
                return true;
            } catch (e) {
                utils.error('Failed to clear sessionStorage:', e);
                return false;
            }
        },
        
        clearCookies: function() {
            try {
                const cookies = document.cookie.split(';');
                let cleared = 0;
                
                cookies.forEach(cookie => {
                    const name = cookie.split('=')[0].trim();
                    if (name) {
                        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
                        cleared++;
                    }
                });
                
                utils.log(`Cookies cleared: ${cleared} cookies`);
                return cleared;
            } catch (e) {
                utils.error('Failed to clear cookies:', e);
                return 0;
            }
        },
        
        clearIndexedDB: function() {
            return new Promise((resolve) => {
                if (!window.indexedDB) {
                    resolve(0);
                    return;
                }
                
                if (indexedDB.databases) {
                    indexedDB.databases().then(dbs => {
                        const deletions = dbs.map(db => {
                            if (db.name) {
                                return new Promise(res => {
                                    const deleteReq = indexedDB.deleteDatabase(db.name);
                                    deleteReq.onsuccess = () => {
                                        utils.log(`IndexedDB deleted: ${db.name}`);
                                        res(true);
                                    };
                                    deleteReq.onerror = () => {
                                        utils.error(`Failed to delete IndexedDB: ${db.name}`);
                                        res(false);
                                    };
                                });
                            }
                            return Promise.resolve(false);
                        });
                        
                        Promise.all(deletions).then(results => {
                            resolve(results.filter(Boolean).length);
                        });
                    }).catch(() => resolve(0));
                } else {
                    resolve(0);
                }
            });
        },
        
        clearCacheStorage: function() {
            return new Promise((resolve) => {
                if (!window.caches) {
                    resolve(0);
                    return;
                }
                
                caches.keys().then(cacheNames => {
                    const deletions = cacheNames.map(cacheName => {
                        utils.log(`Deleting cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    });
                    
                    Promise.all(deletions).then(results => {
                        resolve(results.filter(Boolean).length);
                    });
                }).catch(() => resolve(0));
            });
        }
    };
    
    // Service Worker manager
    const swManager = {
        unregisterAll: function() {
            return new Promise((resolve) => {
                if (!navigator.serviceWorker) {
                    resolve(0);
                    return;
                }
                
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    const unregisters = registrations.map(registration => {
                        utils.log(`Unregistering SW: ${registration.scope}`);
                        return registration.unregister();
                    });
                    
                    Promise.all(unregisters).then(results => {
                        resolve(results.filter(Boolean).length);
                    });
                }).catch(() => resolve(0));
            });
        },
        
        clearSWCache: function() {
            return new Promise((resolve) => {
                if (!navigator.serviceWorker) {
                    resolve(false);
                    return;
                }
                
                // Send message to clear cache
                navigator.serviceWorker.ready.then(registration => {
                    if (registration.active) {
                        const channel = new MessageChannel();
                        
                        channel.port1.onmessage = (event) => {
                            if (event.data.success) {
                                utils.log('SW cache cleared via message');
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        };
                        
                        registration.active.postMessage({
                            type: 'CLEAR_CACHE'
                        }, [channel.port2]);
                        
                        // Timeout after 2 seconds
                        setTimeout(() => resolve(false), 2000);
                    } else {
                        resolve(false);
                    }
                }).catch(() => resolve(false));
            });
        },
        
        updateSW: function() {
            if (!navigator.serviceWorker) return;
            
            navigator.serviceWorker.ready.then(registration => {
                registration.update();
                utils.log('Service Worker updated');
            });
        }
    };
    
    // URL manager
    const urlManager = {
        addFreshParam: function(url) {
            try {
                const urlObj = new URL(url, window.location.origin);
                urlObj.searchParams.set('fresh', Date.now());
                urlObj.searchParams.set('rs', utils.generateId());
                return urlObj.toString();
            } catch (e) {
                return url + (url.includes('?') ? '&' : '?') + 'fresh=' + Date.now();
            }
        },
        
        shouldReset: function() {
            const pathname = window.location.pathname;
            const search = window.location.search;
            
            // Always reset for these pages
            if (pathname.includes('login') || 
                pathname.includes('register') ||
                pathname === '/' ||
                pathname === '/index.html') {
                return true;
            }
            
            // Reset if fresh parameter exists
            if (search.includes('fresh')) {
                return true;
            }
            
            return CONFIG.FORCE_RESET;
        },
        
        redirectToFresh: function(path) {
            const freshUrl = this.addFreshParam(path);
            utils.log(`Redirecting to fresh URL: ${freshUrl}`);
            
            // Use replace to prevent back button issues
            setTimeout(() => {
                window.location.replace(freshUrl);
            }, 100);
        }
    };
    
    // Main reset function
    const resetSession = {
        performFullReset: async function() {
            utils.log('=== PERFORMING FULL RESET ===');
            
            // Generate reset ID for tracking
            const resetId = utils.generateId();
            sessionStorage.setItem('lastResetId', resetId);
            sessionStorage.setItem('resetTime', Date.now());
            
            // Step 1: Clear all storage
            storageCleaner.clearLocalStorage();
            storageCleaner.clearSessionStorage();
            storageCleaner.clearCookies();
            
            // Step 2: Clear IndexedDB
            const indexedDBCleared = await storageCleaner.clearIndexedDB();
            
            // Step 3: Clear Cache Storage
            const cacheCleared = await storageCleaner.clearCacheStorage();
            
            // Step 4: Handle Service Workers
            const swCleared = await swManager.unregisterAll();
            await swManager.clearSWCache();
            
            // Step 5: Clear other storages
            if (window.webkitStorageInfo) {
                try {
                    window.webkitStorageInfo.queryUsageAndQuota(
                        window.webkitStorageInfo.TEMPORARY,
                        function(used, quota) {
                            utils.log(`Webkit Storage: ${used} used of ${quota}`);
                        }
                    );
                } catch (e) {}
            }
            
            // Step 6: Clear form data (autocomplete)
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // Step 7: Update SW
            swManager.updateSW();
            
            utils.log(`Reset completed:`, {
                resetId,
                indexedDB: indexedDBCleared,
                cache: cacheCleared,
                serviceWorkers: swCleared,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                resetId,
                cleared: {
                    indexedDB: indexedDBCleared,
                    cache: cacheCleared,
                    serviceWorkers: swCleared
                }
            };
        },
        
        checkAndReset: async function() {
            // Check if we should reset
            if (!urlManager.shouldReset()) {
                utils.log('Reset not required for this page');
                return false;
            }
            
            // Check last reset time (prevent infinite loops)
            const lastReset = parseInt(sessionStorage.getItem('resetTime') || '0');
            const now = Date.now();
            
            if (now - lastReset < 1000) {
                utils.log('Reset performed recently, skipping');
                return false;
            }
            
            // Perform the reset
            const result = await this.performFullReset();
            
            // If we're on a page that needs fresh params, add them
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            
            if ((currentPath.includes('login') || 
                 currentPath.includes('register') ||
                 currentPath === '/') && 
                !currentSearch.includes('fresh')) {
                
                setTimeout(() => {
                    urlManager.redirectToFresh(window.location.href);
                }, 300);
            }
            
            return result;
        }
    };
    
    // Initialize
    document.addEventListener('DOMContentLoaded', async function() {
        utils.log('DOM loaded, checking for reset...');
        
        // Wait a bit for other scripts
        setTimeout(async () => {
            await resetSession.checkAndReset();
            
            // Add reset button to page if debug mode
            if (CONFIG.DEBUG) {
                const resetBtn = document.createElement('button');
                resetBtn.textContent = '🔄 Reset Session';
                resetBtn.style.cssText = `
                    position: fixed;
                    bottom: 70px;
                    right: 20px;
                    background: #ff4757;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    padding: 10px 15px;
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 9999;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                `;
                
                resetBtn.onclick = async function() {
                    const result = await resetSession.performFullReset();
                    alert(`Session reset!\nID: ${result.resetId}`);
                    window.location.reload();
                };
                
                document.body.appendChild(resetBtn);
            }
        }, 500);
    });
    
    // Make reset function globally available
    window.resetAppSession = resetSession.performFullReset;
    
    // Auto-reset on page visibility change (optional)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // Check if we should reset when page becomes visible again
            const lastReset = parseInt(sessionStorage.getItem('resetTime') || '0');
            const now = Date.now();
            
            if (now - lastReset > 300000) { // 5 minutes
                resetSession.checkAndReset();
            }
        }
    });
    
    utils.log('Reset session script initialized');
})();
