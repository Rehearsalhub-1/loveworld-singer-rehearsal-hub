// Firebase Cloud Messaging Service Worker
// Handles background notifications when web app is not active

// Import Firebase scripts from CDN (required for service workers)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkpkvkV82ILc8R_BjDK9OBDPqDaCbM9lM",
  authDomain: "loveworld-singers-app.firebaseapp.com",
  projectId: "loveworld-singers-app",
  storageBucket: "loveworld-singers-app.firebasestorage.app",
  messagingSenderId: "155599595615",
  appId: "1:155599595615:web:f431ecd7276a22a33f53ea",
  measurementId: "G-0SN10RN806"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  // Check if this is a voice call notification
  const isVoiceCall = payload.data?.type === 'VOICE_CALL';

  const notificationTitle = isVoiceCall
    ? `📞 ${payload.data?.callerName || 'Someone'} is calling`
    : (payload.notification?.title || 'LWSRHP');

  const notificationOptions = {
    body: isVoiceCall
      ? 'Tap to answer the call'
      : (payload.notification?.body || 'You have a new notification'),
    // Use sender avatar or specific icon if provided, fallback to app icon
    icon: payload.notification?.icon || payload.data?.senderAvatar || '/APP ICON/pwa_192_filled.png',
    image: payload.notification?.image || payload.data?.senderImage || undefined,
    badge: '/APP ICON/pwa_192_filled.png',
    tag: isVoiceCall ? `call-${payload.data?.callId}` : (payload.data?.tag || `notification-${Date.now()}`),
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: isVoiceCall ? [500, 200, 500, 200, 500] : [200, 100, 200], // Longer vibration for calls
    data: {
      url: isVoiceCall ? `/pages/groups?call=${payload.data?.callId}` : (payload.data?.url || '/pages/notifications'),
      type: payload.data?.type,
      callId: payload.data?.callId,
      callerName: payload.data?.callerName,
      callerAvatar: payload.data?.callerAvatar,
      ...payload.data
    },
    actions: isVoiceCall
      ? [
        { action: 'answer', title: '✅ Answer' },
        { action: 'decline', title: '❌ Decline' }
      ]
      : (payload.data?.type === 'chat' ? [
        { action: 'reply', title: 'Reply' },
        { action: 'mark_read', title: 'Mark as Read' }
      ] : [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ])
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const isVoiceCall = data.type === 'VOICE_CALL';

  // Handle call-specific actions
  if (isVoiceCall) {
    if (event.action === 'decline') {
      console.log('[firebase-messaging-sw] Call declined from notification');
      // Post message to any open client to decline the call
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          windowClients.forEach(client => {
            client.postMessage({
              type: 'DECLINE_CALL',
              callId: data.callId
            });
          });
        });
      return;
    }

    // Answer or tap on call notification - open the app
    // Use relative URL for navigation (works better with PWA)
    const callUrl = `/pages/groups?call=${data.callId}&action=answer`;
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Check if app is already open
          for (const client of windowClients) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              // Post message first, then navigate
              client.postMessage({
                type: 'INCOMING_CALL',
                callId: data.callId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                action: event.action === 'answer' ? 'answer' : 'show'
              });
              return client.focus().then(() => client.navigate(callUrl));
            }
          }
          // Open new window if app not open - use origin + path
          return self.clients.openWindow(self.location.origin + callUrl);
        })
    );
    return;
  }

  // Handle regular notification actions
  if (event.action === 'dismiss') {
    return;
  }

  if (event.action === 'mark_read') {
    console.log('[firebase-messaging-sw] Mark as Read clicked');
    // We can't easily call authenticated Firestore from SW, 
    // but we can notify open windows to handle it
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        windowClients.forEach(client => {
          client.postMessage({
            type: 'MARK_AS_READ',
            chatId: data.chatId,
            notificationId: data.tag
          });
        });
      });
    return; // Just dismisses the notification
  }

  // Get URL - handle both relative and absolute URLs
  let urlToOpen = data.url || '/pages/notifications';

  if (event.action === 'reply') {
    // Force focus on input if possible, for now just ensure we land in the chat
    urlToOpen = data.chatId ? `/pages/groups?chat=${data.chatId}&action=reply` : '/pages/groups';
  }

  if (urlToOpen.startsWith('/')) {
    urlToOpen = self.location.origin + urlToOpen;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        // Open new window if app not open
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Handle push events directly (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw] Push event received:', event);

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw] Push payload:', payload);

      // Handle both notification and data-only messages
      const title = payload.notification?.title || payload.data?.title || 'LWSRHP';
      const body = payload.notification?.body || payload.data?.body || 'New notification';

      const options = {
        body: body,
        icon: '/APP ICON/pwa_192_filled.png',
        badge: '/APP ICON/pwa_192_filled.png',
        tag: payload.data?.tag || `push-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: payload.data?.url || payload.fcmOptions?.link || '/pages/notifications',
          ...payload.data
        }
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('[firebase-messaging-sw] Error parsing push data:', e);
      // Try to show notification with raw text
      if (event.data) {
        const text = event.data.text();
        event.waitUntil(
          self.registration.showNotification('LWSRHP', {
            body: text || 'New notification',
            icon: '/APP ICON/pwa_192_filled.png',
            badge: '/APP ICON/pwa_192_filled.png',
            tag: `push-${Date.now()}`
          })
        );
      }
    }
  } else {
    // No data, show generic notification
    event.waitUntil(
      self.registration.showNotification('LWSRHP', {
        body: 'You have a new notification',
        icon: '/APP ICON/pwa_192_filled.png',
        badge: '/APP ICON/pwa_192_filled.png',
        tag: `push-${Date.now()}`
      })
    );
  }
});

console.log('[firebase-messaging-sw] Service worker loaded and ready');
