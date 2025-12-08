// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  version: '1.0.0',
  maxCacheSize: 100 * 1024,
  precacheUrls: [],
  cacheStrategies: {
    images: { mode: 'cache-first', maxAge: 30 * 86400000 },
    scripts: { mode: 'network-first', maxAge: 7 * 86400000 },
    styles: { mode: 'network-first', maxAge: 7 * 86400000 },
    api: { mode: 'network-first', maxAge: 300000 },
    html: { mode: 'network-first', maxAge: 86400000 } // x
  }
};

const CACHE_NAMES = {
  static: `static-v${CONFIG.version}`,
  dynamic: `dynamic-v${CONFIG.version}`
};

// ============================================================
// LIFECYCLE EVENTS
// ============================================================

self.addEventListener('install', e => {
  console.log('[SW] Installing version', CONFIG.version);
  e.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => cache.addAll(CONFIG.precacheUrls))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Precache failed:', err))
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating version', CONFIG.version);
  e.waitUntil(Promise.all([cleanupOldCaches(), self.clients.claim()]));
});

async function cleanupOldCaches() {
  const keys = await caches.keys();
  const oldCaches = keys.filter(k => 
    (k.startsWith('static-') || k.startsWith('dynamic-')) &&
    k !== CACHE_NAMES.static && k !== CACHE_NAMES.dynamic
  );
  return Promise.all(oldCaches.map(k => {
    console.log('[SW] Deleting old cache:', k);
    return caches.delete(k);
  }));
}

// ============================================================
// FETCH HANDLING
// ============================================================

self.addEventListener('fetch', e => {
  if (!isHttpRequest(e.request)) return;
  const assetType = getAssetType(e.request.url);
  const strategy = CONFIG.cacheStrategies[assetType]?.mode || 'network-first';
  e.respondWith(handleFetch(e.request, strategy, assetType, e.preloadResponse));
});

function isHttpRequest(req) {
  return new URL(req.url).protocol.startsWith('http');
}

function getAssetType(url) {
  const path = new URL(url).pathname.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(path)) return 'images';
  if (/\.(js|mjs)$/i.test(path)) return 'scripts';
  if (/\.css$/i.test(path)) return 'styles';
  if (path.startsWith('/api/')) return 'api';
  if (path === '/' || path.endsWith('.html')) return 'html';
  return 'html';
}

async function handleFetch(req, strategy, assetType, preloadRes) {
  if (strategy === 'cache-first') return cacheFirst(req, assetType, preloadRes);
  if (strategy === 'network-first') return networkFirst(req, assetType, preloadRes);
  return fetchWithFallback(req);
}

// ============================================================
// CACHE STRATEGIES
// ============================================================

async function cacheFirst(req, assetType, preloadRes) {
  // 1. Try cache (if not expired)
  const cached = await caches.match(req);
  if (cached && !isCacheExpired(cached, assetType)) return cached;
  
  // 2. Try preload
  const preloaded = await preloadRes;
  if (preloaded) {
    await saveToCache(req, preloaded.clone());
    return preloaded;
  }
  
  // 3. Fetch from network
  try {
    const res = await fetch(req);
    if (res?.ok) await saveToCache(req, res.clone());
    return res;
  } catch (err) {
    return cached || getOfflineFallback(req);
  }
}

async function networkFirst(req, assetType, preloadRes) {
  // 1. Try preload
  const preloaded = await preloadRes;
  if (preloaded) {
    if (preloaded.ok) await saveToCache(req, preloaded.clone());
    return preloaded;
  }
  
  // 2. Fetch from network
  try {
    const res = await fetch(req);
    if (res?.ok) await saveToCache(req, res.clone());
    return res;
  } catch (err) {
    // 3. Fallback to cache
    const cached = await caches.match(req);
    return cached || getOfflineFallback(req);
  }
}

async function fetchWithFallback(req) {
  try {
    return await fetch(req);
  } catch (err) {
    return getOfflineFallback(req);
  }
}

// ============================================================
// CACHE HELPERS
// ============================================================

async function saveToCache(req, res) {
  if (!isValidResponse(res)) return;
  if (await isResponseTooLarge(res)) return;
  const cache = await caches.open(CACHE_NAMES.dynamic);
  await cache.put(req, res);
}

function isValidResponse(res) {
  return res && res.status === 200 && res.type === 'basic';
}

async function isResponseTooLarge(res) {
  const blob = await res.clone().blob();
  const tooLarge = blob.size > CONFIG.maxCacheSize;
  if (tooLarge) console.log('[SW] Skipped (too large):', blob.size, 'bytes');
  return tooLarge;
}

function isCacheExpired(res, assetType) {
  const cacheTime = res.headers.get('sw-cached-at');
  if (!cacheTime) return false;
  const maxAge = CONFIG.cacheStrategies[assetType]?.maxAge || 86400000;
  return Date.now() - new Date(cacheTime).getTime() > maxAge;
}

function getOfflineFallback(req) {
  const isHtml = req.destination === 'document' || req.headers.get('accept')?.includes('text/html');
  if (isHtml) {
    return caches.match('/offline.html') || 
      new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
  return new Response('Resource unavailable', { status: 503, statusText: 'Service Unavailable' });
}

// ============================================================
// MESSAGE HANDLING
// ============================================================

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') e.waitUntil(self.skipWaiting());
  if (e.data?.type === 'CLEAR_CACHE') e.waitUntil(clearAllCaches());
});

async function clearAllCaches() {
  const keys = await caches.keys();
  return Promise.all(keys.map(k => caches.delete(k)));
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body || 'New notification',
      icon: data.icon || '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.notification.data?.url) e.waitUntil(clients.openWindow(e.notification.data.url));
});

// ============================================================
// BACKGROUND SYNC
// ============================================================

self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') e.waitUntil(syncData());
});

async function syncData() {
  console.log('[SW] Syncing data...');
  // Implementiere deine Sync-Logik
}