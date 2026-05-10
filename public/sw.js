// JHB Service Worker — production PWA
// Strategy: cache-first static, cache-first images (LRU), network-first HTML

const CACHE_VERSION = 'v4';
const STATIC_CACHE  = 'jhb-static-' + CACHE_VERSION;
const IMAGE_CACHE   = 'jhb-images-' + CACHE_VERSION;
const PAGE_CACHE    = 'jhb-pages-'  + CACHE_VERSION;

const OFFLINE_URL   = '/offline';

// Cache size budgets
const IMAGE_MAX_ENTRIES = 60;
const IMAGE_MAX_BYTES   = 50 * 1024 * 1024; // 50 MB
const PAGE_MAX_ENTRIES  = 30;

// Pre-cache assets on install
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-jhb.webp',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function trimCacheEntries(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

async function trimCacheSize(cacheName, maxBytes) {
  const cache    = await caches.open(cacheName);
  const keys     = await cache.keys();
  let totalBytes = 0;
  const entries  = [];

  for (const key of keys) {
    const resp = await cache.match(key);
    if (!resp) continue;
    const clone = resp.clone();
    const buf   = await clone.arrayBuffer();
    totalBytes += buf.byteLength;
    entries.push({ key, size: buf.byteLength });
  }

  if (totalBytes <= maxBytes) return;

  for (const entry of entries) {
    if (totalBytes <= maxBytes) break;
    await cache.delete(entry.key);
    totalBytes -= entry.size;
  }
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  return /\.(?:png|jpg|jpeg|webp|gif|svg|avif)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    /\.(?:js|css|woff2?|ttf)$/i.test(url.pathname)
  );
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip /panel/* — admin routes never cached, always fresh
  if (url.pathname.startsWith('/panel/') || url.pathname === '/panel') return;

  // Skip /api/* — API responses never cached by SW
  if (url.pathname.startsWith('/api/')) return;

  // Skip auth routes
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/auth')) return;

  // 1. Static Next.js assets — cache-first, long TTL
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp.ok) cache.put(request, resp.clone());
          return resp;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 2. Images — cache-first with LRU eviction & size budget
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp.ok) {
            cache.put(request, resp.clone()).then(() => {
              trimCacheEntries(IMAGE_CACHE, IMAGE_MAX_ENTRIES);
              trimCacheSize(IMAGE_CACHE, IMAGE_MAX_BYTES);
            });
          }
          return resp;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 3. HTML pages — network-first, fall back to cache, then offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(request);
          if (resp.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, resp.clone()).then(() => {
              trimCacheEntries(PAGE_CACHE, PAGE_MAX_ENTRIES);
            });
          }
          return resp;
        } catch {
          const cache  = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })()
    );
    return;
  }
});

// ── Message handler — allow client to trigger updates ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Push event — show notification ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Jurnalis Hukum Bandung', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Jurnalis Hukum Bandung';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.imageUrl || undefined,
    data: { url: data.url || '/' },
    tag: data.tag || 'jhb-news',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click — focus existing tab or open new ──────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Reuse existing tab from same origin if already open
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        } catch {
          /* ignore */
        }
      }

      // Otherwise open new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// ── Subscription change — re-subscribe (browser may rotate keys) ─────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub.toJSON()),
        });
      } catch {
        /* silently fail — user can re-enable manually */
      }
    })(),
  );
});
