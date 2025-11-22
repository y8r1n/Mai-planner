// src/hooks/useNotificationPermission.js
import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  getFCMToken,
  getNotificationPermission,
  isMessagingSupported,
} from '../services/notificationService';

/**
 * 🔔 알림 권한 관리 훅
 */
export const useNotificationPermission = (userId) => {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 초기화: 권한 및 지원 여부 확인
  useEffect(() => {
    const supported = isMessagingSupported();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // 이미 권한이 있으면 토큰 발급 시도
      if (currentPermission === 'granted' && userId) {
        initializeFCM();
      }
    }
  }, [userId]);

  // FCM 초기화 및 토큰 발급
  const initializeFCM = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getFCMToken(userId);
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
      } else {
        setError('토큰 발급에 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ FCM 초기화 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 권한 요청
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('이 브라우저는 알림을 지원하지 않습니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const granted = await requestNotificationPermission();
      
      if (granted) {
        setPermission('granted');
        await initializeFCM();
        return true;
      } else {
        setPermission('denied');
        setError('알림 권한이 거부되었습니다.');
        return false;
      }
    } catch (err) {
      console.error('❌ 권한 요청 오류:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, initializeFCM]);

  return {
    permission,
    fcmToken,
    isSupported,
    loading,
    error,
    requestPermission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
  };
};