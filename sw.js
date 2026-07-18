/* Service worker de ConstruyIA: caché offline con estrategia
 * stale-while-revalidate para las peticiones GET del mismo origen.
 * La app se sirve bajo una subruta (GitHub Pages), así que todo es relativo
 * al scope del propio service worker. */
const CACHE = 'construyia-v1';

self.addEventListener('install', (event) => {
  // Activarse cuanto antes; los assets se cachean bajo demanda.
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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Solo GET del mismo origen; el resto va directo a la red.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
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
      // Devuelve la caché al instante si existe y refresca en segundo plano.
      return cacheada || red;
    }),
  );
});
