/**
 * NurseFlow Service Worker
 *
 * Strategy:
 *  - Every release uses a new cache version.
 *  - install() pre-caches the minimum application shell.
 *  - activate() deletes every previous NurseFlow cache immediately.
 *  - Navigation and core application files use NETWORK FIRST, so a newly
 *    published GitHub Pages version is preferred whenever there is internet.
 *  - Static assets use CACHE FIRST after installation for fast offline use.
 *  - skipWaiting() + clients.claim() activate updates without requiring the
 *    user to manually remove the PWA.
 *
 * IMPORTANT:
 * Increment CACHE_VERSION on every deployment that changes application files.
 */

const CACHE_VERSION = 'nurseflow-v1.0.2';
const CACHE_PREFIX = 'nurseflow-';
const CACHE_NAME = CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './data.js',
  './app.js',
  './manifest.webmanifest',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

const NETWORK_FIRST_FILES = new Set([
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/db.js',
  '/data.js',
  '/manifest.webmanifest',
  '/sw.js'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if(request.method !== 'GET') return;

  const url = new URL(request.url);

  // External APIs are never cached by the Service Worker. Their own application
  // cache is handled explicitly by IndexedDB where appropriate.
  if(url.origin !== self.location.origin) return;

  const relativePath = url.pathname.endsWith('/') ? '/' : url.pathname;
  const isNavigation = request.mode === 'navigate';
  const useNetworkFirst = isNavigation || NETWORK_FIRST_FILES.has(relativePath);

  if(useNetworkFirst) {
    event.respondWith(networkFirst(request, isNavigation));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request, isNavigation = false) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // cache: 'no-store' prevents the browser HTTP cache from hiding a fresh
    // GitHub Pages deployment from the Service Worker update strategy.
    const response = await fetch(request, { cache: 'no-store' });

    if(response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch(error) {
    const cached = await cache.match(request);
    if(cached) return cached;

    if(isNavigation) {
      const fallback = await cache.match('./index.html');
      if(fallback) return fallback;
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if(cached) return cached;

  const response = await fetch(request);

  if(response && response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}
