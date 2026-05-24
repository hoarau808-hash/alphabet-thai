importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBlktgKK7ol6HdwE0ahcvXi619Ney4iCic",
  authDomain: "alphabet-thai.firebaseapp.com",
  projectId: "alphabet-thai",
  storageBucket: "alphabet-thai.firebasestorage.app",
  messagingSenderId: "710772576918",
  appId: "1:710772576918:web:48e4c715b3e020374968b7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || '📚 Thai ABC', {
    body: n.body || 'Continue ton apprentissage du thaï !',
    icon: '/alphabet-thai/icon-192.png',
    badge: '/alphabet-thai/icon-192.png',
    tag: 'thai-abc-daily',
    renotify: false,
    data: { url: '/alphabet-thai/' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/alphabet-thai/') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/alphabet-thai/');
    })
  );
});
