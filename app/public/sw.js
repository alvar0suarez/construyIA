/* Service worker de "autodestrucción".
 *
 * El SW de caché causó dos veces que la web saliera en blanco (servía un
 * index.html cacheado que apuntaba a assets con hash ya inexistentes). La app
 * ya no registra ningún service worker; este fichero solo existe para que los
 * navegadores que TODAVÍA tienen el SW viejo registrado lo actualicen a esta
 * versión, que se desregistra a sí misma, borra todas las cachés y recarga.
 * Así cualquier dispositivo atascado se recupera solo. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clientes = await self.clients.matchAll({ type: 'window' });
      for (const c of clientes) {
        // Recargar cada pestaña abierta para que cargue ya sin SW, de la red.
        c.navigate(c.url);
      }
    })(),
  );
});

// Sin caché: todo va directo a la red mientras este SW siga vivo.
