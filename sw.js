const CACHE = 'thai-abc-v2';

// Uniquement les appels API dynamiques Firebase sont ignorés (auth, Firestore live)
const BYPASS = [
  'identitytoolkit.googleapis.com',
  'firestore.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com/v1',
];

const CORE = [
  '/alphabet-thai/',
  '/alphabet-thai/index.html',
  '/alphabet-thai/manifest.json',
  '/alphabet-thai/icon-192.png',
  '/alphabet-thai/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // allSettled : n'échoue pas si un asset manque
      Promise.allSettled(CORE.map(u => c.add(u)))
    )
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
  const url = e.request.url;

  // Laisser passer les appels API Firebase temps-réel
  if(BYPASS.some(p => url.includes(p))) return;

  e.respondWith(
    caches.match(e.request).then(hit => {
      if(hit) {
        // Revalider en arrière-plan (stale-while-revalidate)
        fetch(e.request).then(res => {
          if(res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res));
          }
        }).catch(() => {});
        return hit;
      }

      // Pas encore en cache → fetch + mise en cache automatique
      return fetch(e.request).then(res => {
        if(res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => {
        // Fallback navigation → index.html hors-ligne
        if(e.request.mode === 'navigate') {
          return caches.match('/alphabet-thai/index.html');
        }
      });
    })
  );
});
