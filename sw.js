// sw.js - Service Worker mínimo (coloca en la raíz)
// Esto es intencionalmente simple: registra el SW para permitir instalar la PWA
// y deja espacio para añadir caching/estrategias offline si lo deseas.

const CACHE_NAME = 'mp-cache-v1';
const PRECACHE_URLS = [
  '/', '/index.html', '/manifest.json',
  // añade más recursos estáticos que quieras cachear
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(()=>{});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Estrategia: primero intenta network, si falla devuelve cache (fallback)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Opcional: manejar clicks en notificaciones (si en el futuro muestras)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
