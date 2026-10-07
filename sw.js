const CACHE_NAME = 'nurseflow-ui-v8.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/tokens.css', './styles/base.css', './styles/layout.css', './styles/components.css',
  './scripts/app.js', './scripts/ui.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-180.png',
  './assets/festivos-valencia-2026.json'
];

// Instalar y forzar control inmediato
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

// Limpiar cachés antiguas al activar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

// Interceptar peticiones
self.addEventListener('fetch', e => {
  if (new URL(e.request.url).origin !== self.location.origin) return;

  // Estrategia Network-First para la página principal (HTML)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone()); // Actualiza la caché con la nueva versión
          return response;
        });
      }).catch(() => caches.match(e.request)) // Si no hay internet, usa la caché
    );
    return;
  }

  // Estrategia Stale-While-Revalidate para iconos y recursos estáticos
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
      return cached || fetched;
    })
  );
});