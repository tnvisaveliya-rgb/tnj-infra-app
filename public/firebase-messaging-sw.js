importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "TAMARI_API_KEY",
  authDomain: "TAMARI_AUTH_DOMAIN",
  projectId: "tnj-infra-app",
  storageBucket: "TAMARI_STORAGE_BUCKET",
  messagingSenderId: "TAMARI_SENDER_ID",
  appId: "TAMARI_APP_ID"
});

const messaging = firebase.messaging();

// Background notification handle karva mate
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// AHIYA CLICK EVENT ADD KARVO PADE:
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Je URL par user ne lai java hoy (e.g., tamari live app link ya home page)
  const targetUrl = '/'; 

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Jo app already open hoy to tab focus karo, nahi to new window open karo
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});