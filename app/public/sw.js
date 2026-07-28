/* Service worker de ConstruyIA.
 *
 * Estrategia por tipo de petición:
 *  - Navegaciones / HTML (index.html): RED PRIMERO. El index referencia los
 *    assets con hash en el nombre; si se sirviera un index cacheado y viejo,
 *    apuntaría a un JS que ya no existe en el servidor (404) y la página
 *    saldría en blanco. Por eso el documento se pide siempre a la red y solo
 *    se cae a la caché sin conexión.
 *  - Resto de GET del mismo origen (assets con hash, imágenes...): caché con
 *    revalidación en segundo plano (stale-while-revalidate). Son inmutables:
 *    si cambia el contenido, cambia el hash del nombre.
 *
 * La app se sirve bajo una subruta (GitHub Pages), todo relativo al scope.
 */
const CACHE = 'construyia-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(new URL('./', self.registration.scope).pathname)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** ¿Es una navegación / petición de documento HTML? */
function esNavegacion(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'))
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navegaciones: red primero, caché de respaldo (para no dejar la app en
  // blanco offline). Se guarda una copia de "./" como respaldo.
  if (esNavegacion(request)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(new URL('./', self.registration.scope).pathname, copia));
          }
          return resp;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match(new URL('./', self.registration.scope).pathname)) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // Assets con hash: caché al instante + refresco en segundo plano.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cacheada = await cache.match(request);
      const red = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            cache.put(request, resp.clone());
          }
          return resp;
        })
        .catch(() => cacheada);
      return cacheada || red;
    }),
  );
});
