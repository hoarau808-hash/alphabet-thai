const CACHE = 'thai-abc-v1';
const ASSETS = [
  '/alphabet-thai/',
  '/alphabet-thai/index.html',
  '/alphabet-thai/manifest.json',
  '/alphabet-thai/icon-192.png',
  '/alphabet-thai/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
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
  // Laisser passer Firebase, Google APIs, fonts (besoin réseau)
  if(url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic') || url.includes('firestore')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/alphabet-thai/index.html'));
    })
  );
});
