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
    icon: '/favicon.ico',
    tag: 'unique-reminder' // Aaa tag nakhtaj juna notification par navu override thai jay, double na aave!
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click Event (Fix for opening tab)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Tamari app ni main URL (e.g. root domain)
  const targetUrl = self.location.origin + '/'; 

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Jo koi tab already open hoy to aane focus karo
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Jo ek pan tab open na hoy to navu window open karo
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
}); 