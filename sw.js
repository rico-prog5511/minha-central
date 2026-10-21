/* Service worker: guarda o app no aparelho para funcionar offline.
   Estratégia: rede primeiro (a versão nova aparece logo na abertura) com cópia guardada para funcionar offline.
   Cada app tem o seu próprio cache e só mexe nos arquivos DELE: os outros apps da mesma pasta não são afetados. */
const CACHE = 'minha-central-v3';
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
  // Rede primeiro (sempre a versão mais nova, ignorando o cache do navegador); se estiver offline ou lento (4 s), usa a cópia guardada.
  e.respondWith(caches.open(CACHE).then(cache => {
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (!r || !r.ok) throw new Error('resposta ruim'); cache.put(e.request, r.clone()); return r; });
    const slow = new Promise((_, rej) => setTimeout(rej, 4000));
    return Promise.race([net, slow]).catch(() => cache.match(e.request, { ignoreSearch: true }).then(hit => hit || net));
  }));
});