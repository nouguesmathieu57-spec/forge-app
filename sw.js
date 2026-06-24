/* FORGE — Service Worker
   Stratégie :
   - index.html     → network-first (toujours à jour, même sur iOS)
   - assets statiques → cache-first (icons, manifest)
   Le nom du cache reste stable → pas de re-installation requise
*/
const CACHE       = 'forge-app-v1';      // NE PAS CHANGER ce nom
const STATIC      = [
  '/forge-app/manifest.json',
  '/forge-app/icon-192.png',
  '/forge-app/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // index.html → network-first : toujours chercher la dernière version
  if (url.pathname === '/forge-app/' || url.pathname === '/forge-app/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))   // offline fallback
    );
    return;
  }

  // Assets statiques → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
