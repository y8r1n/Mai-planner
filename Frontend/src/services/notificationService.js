// src/services/notificationService.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let messaging = null;

/**
 * 🔥 FCM 초기화
 */
export const initializeMessaging = () => {
  try {
    // Service Worker 지원 여부 확인
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker를 지원하지 않는 브라우저입니다.');
      return null;
    }

    // Notification API 지원 여부 확인
    if (!('Notification' in window)) {
      console.warn('⚠️ 알림을 지원하지 않는 브라우저입니다.');
      return null;
    }

    messaging = getMessaging(app);
    console.log('✅ FCM 초기화 완료');
    return messaging;
  } catch (error) {
    console.error('❌ FCM 초기화 실패:', error);
    return null;
  }
};

/**
 * 🔥 알림 권한 요청
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 알림 권한:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('❌ 권한 요청 실패:', error);
    return false;
  }
};

/**
 * 🔥 FCM 토큰 발급
 */
export const getFCMToken = async (userId) => {
  try {
    if (!messaging) {
      messaging = initializeMessaging();
      if (!messaging) return null;
    }

    const permission = await requestNotificationPermission();
    if (!permission) {
      console.warn('⚠️ 알림 권한이 거부되었습니다.');
      return null;
    }

    // Service Worker 등록 대기
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('✅ Service Worker 등록 완료');

    // VAPID Key 가져오기
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      console.error('❌ VAPID Key가 설정되지 않았습니다.');
      return null;
    }

    // FCM 토큰 발급
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('🔑 FCM Token:', token);

      // Firestore에 토큰 저장
      if (userId) {
        await saveFCMToken(userId, token);
      }

      return token;
    } else {
      console.warn('⚠️ FCM 토큰 발급 실패');
      return null;
    }
  } catch (error) {
    console.error('❌ FCM 토큰 발급 오류:', error);
    return null;
  }
};

/**
 * 🔥 Firestore에 FCM 토큰 저장
 */
export const saveFCMToken = async (userId, token) => {
  try {
    await setDoc(
      doc(db, 'users', userId, 'settings', 'notifications'),
      {
        fcmToken: token,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    console.log('✅ FCM 토큰 저장 완료');
  } catch (error) {
    console.error('❌ FCM 토큰 저장 실패:', error);
  }
};

/**
 * 🔥 포그라운드 메시지 리스너
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    messaging = initializeMessaging();
    if (!messaging) return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('📬 [Foreground] 메시지 수신:', payload);

    // 브라우저 알림 표시
    if (Notification.permission === 'granted') {
      const title = payload.notification?.title || 'MAi Better Life';
      const options = {
        body: payload.notification?.body || '새로운 알림',
        icon: '/logo.png',
        badge: '/badge.png',
        tag: payload.data?.type || 'notification',
        data: payload.data,
        requireInteraction: false,
      };

      new Notification(title, options);
    }

    // 콜백 실행 (NotificationContext에 추가용)
    if (callback) {
      callback(payload);
    }
  });

  return unsubscribe;
};

/**
 * 🔥 알림 권한 상태 확인
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

/**
 * 🔥 FCM 지원 여부 확인
 */
export const isMessagingSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
};