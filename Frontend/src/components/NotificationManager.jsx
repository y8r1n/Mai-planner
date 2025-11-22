// src/components/NotificationManager.jsx
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';
import {
  useTodoNotifications,
  useScheduleNotifications,
  useSubjectNotifications,
  useDiaryNotifications,
  useTimetableNotifications,
} from '../hooks/useAutoNotification';

/**
 * 🔔 알림 시스템 관리자
 * 앱 전체에서 자동 알림을 처리하는 컴포넌트
 * Layout 또는 App.jsx에 추가하여 사용
 */
export default function NotificationManager() {
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  // 🏠 HOME - TODO 알림
  useTodoNotifications(userId);

  // 🤖 WITH AI - 일정 알림
  useScheduleNotifications(userId);

  // 📚 SUBJECT - 과목/주차 알림
  useSubjectNotifications(userId);

  // 📔 IMAGE DIARY - 다이어리 알림
  useDiaryNotifications(userId);

  // 🎯 시간표 알림
  useTimetableNotifications(userId);

  // 초기화 로그
  useEffect(() => {
    if (userId) {
      console.log('✅ 알림 시스템 초기화 완료:', userId);
    }
  }, [userId]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}