const CACHE_NAME = 'transformacao-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logo.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Ignora chamadas de API (sempre vai buscar no servidor real)
  if (event.request.url.includes('/api/')) return;
  // Ignora métodos diferentes de GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Só faz cache se a resposta for válida
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaqueredirect'
        ) {
          return response;
        }
        try {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        } catch (e) {
          // Silencia erros de cache sem quebrar a resposta
          console.warn('SW cache error:', e);
        }
        return response;
      }).catch(() => {
        // Sem rede e sem cache: retorna vazio sem quebrar
        return new Response('', { status: 408 });
      });
    })
  );
});
