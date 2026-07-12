const CACHE_NAME = 'transformacao-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css?v=5',
  '/app.js?v=5',
  '/logo.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força a atualização imediata no celular
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.warn('Falha no cache inicial', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Apagando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle das abas abertas imediatamente
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
