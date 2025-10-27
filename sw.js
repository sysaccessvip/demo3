// sw.js - Service Worker con soporte para notificaciones medias y acciones
const CACHE_NAME = 'mp-cache-v1';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(()=>{})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // simple network-first strategy with cache fallback
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// Escucha clicks en las notificaciones y reenvía la acción a la página
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action; // 'play_pause', 'next', 'prev', etc.

  // Enviar mensaje a todas las ventanas/controladores abiertos
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length === 0) {
        // Si no hay cliente abierto, abrir la app
        return clients.openWindow('/');
      }
      clientList.forEach(client => {
        client.postMessage({ type: 'media-action', action });
      });
      // además se puede enfocar la primera client
      return clientList[0].focus();
    })
  );
});

// Opcional: manejar close/other notification events
self.addEventListener('notificationclose', (event) => {
  // puedes limpiar estado o logs si lo deseas
});
