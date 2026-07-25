// Service worker do Gym Evolution
// Estáticos: stale-while-revalidate. Imagens de exercícios: cache-first.
// APIs: sempre rede (dados nunca ficam velhos).
const CACHE = 'gym-static-v1';
const IMG_CACHE = 'gym-img-v1';

const PRECACHE = [
  '/style.css',
  '/app.js',
  '/water-jar.js',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // APIs e navegação: sempre rede (autenticação e dados frescos)
  if (url.pathname.startsWith('/api/') || req.mode === 'navigate') return;

  // Imagens (inclui os GIFs dos exercícios no GitHub): cache-first
  if (req.destination === 'image') {
    e.respondWith(
      caches.open(IMG_CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Demais estáticos: responde do cache e atualiza em segundo plano
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const fresh = fetch(req)
        .then(res => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
