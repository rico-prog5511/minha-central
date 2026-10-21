/* Service worker: guarda o app no aparelho para funcionar offline.
   Estratégia: responde do cache e atualiza em segundo plano (a versão nova aparece na abertura seguinte).
   Cada app tem o seu próprio cache e só mexe nos arquivos DELE: os outros apps da mesma pasta não são afetados. */
const CACHE = 'minha-central-v2';
const PREFIX = 'minha-central-';
const ASSETS = ['./minha-central.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const MINE = new Set(ASSETS.map(a => new URL(a, self.location).pathname));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || !MINE.has(url.pathname)) return;     // deixa passar tudo que não é deste app
  e.respondWith(caches.open(CACHE).then(cache => cache.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});