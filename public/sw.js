// Service worker do Gym Evolution
// Estáticos: network-first (atualizações chegam na hora; cache é fallback offline).
// Imagens de exercícios: cache-first. APIs: sempre rede.
const CACHE = 'gym-static-v2';
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

  // Demais estáticos: rede primeiro, cache como fallback offline
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
