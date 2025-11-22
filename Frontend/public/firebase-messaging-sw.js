// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정 (env 변수는 Service Worker에서 직접 접근 불가하므로 하드코딩 필요)
// 배포 시 환경변수로 교체하거나, 빌드 시 주입하는 방식 사용
firebase.initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// 🔥 백그라운드 메시지 수신
messaging.onBackgroundMessage((payload) => {
  console.log('📬 [Background] 메시지 수신:', payload);

  const notificationTitle = payload.notification?.title || 'MAi Better Life';
  const notificationOptions = {
    body: payload.notification?.body || '새로운 알림이 있습니다.',
    icon: '/logo.png', // public 폴더에 로고 추가
    badge: '/badge.png',
    tag: payload.data?.type || 'notification',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 🔥 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 알림 클릭:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});