// src/hooks/useAutoNotification.js
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * 🔔 자동 알림 생성 훅
 * Firestore 컬렉션을 모니터링하고 변경사항 발생 시 자동으로 알림 생성
 */
export const useAutoNotification = (userId, config) => {
  const { addNotification } = useNotifications();
  const initialLoadRef = useRef(true);
  const lastTimestampRef = useRef(Date.now());

  useEffect(() => {
    if (!userId || !config) return;

    const {
      collectionPath,    // 모니터링할 컬렉션 경로
      type,              // 알림 타입 (todo, schedule, subject, diary 등)
      tab,               // 탭 이름 (HOME, WITH AI, SUBJECT, IMAGE DIARY)
      getMessage,        // 알림 메시지 생성 함수 (doc) => string
      getDetails,        // 알림 상세 정보 생성 함수 (doc) => string[]
      getSourceId,       // 소스 ID 생성 함수 (doc) => string
      filters = [],      // 추가 필터 조건
      skipInitial = true, // 초기 로드 시 알림 생성 안 함
    } = config;

    // 쿼리 생성
    let q = query(
      collection(db, collectionPath),
      where('userId', '==', userId),
      ...filters
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 초기 로드는 스킵
      if (skipInitial && initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      // 변경사항만 처리
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const doc = change.doc;
          const data = doc.data();

          // 생성 시간 체크 (5초 이내 생성된 문서만 알림)
          const createdAt = data.createdAt?.seconds
            ? data.createdAt.seconds * 1000
            : data.createdAt?.getTime?.() || Date.now();

          if (Date.now() - createdAt > 5000) {
            return; // 오래된 문서는 무시
          }

          // 마지막 알림 시간 체크 (1초 이내 중복 방지)
          if (Date.now() - lastTimestampRef.current < 1000) {
            return;
          }

          lastTimestampRef.current = Date.now();

          // 알림 생성
          try {
            await addNotification({
              type,
              tab,
              message: getMessage(data),
              details: getDetails ? getDetails(data) : [],
              sourceId: getSourceId ? getSourceId(doc) : doc.id,
            });
            console.log(`🔔 [${tab}] 알림 생성:`, getMessage(data));
          } catch (error) {
            console.error('❌ 알림 생성 실패:', error);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [userId, config, addNotification]);
};

/**
 * 🏠 HOME 탭 - TODO 알림
 */
export const useTodoNotifications = (userId) => {
  useAutoNotification(userId, {
    collectionPath: 'todos',
    type: 'todo',
    tab: 'HOME',
    getMessage: (data) => {
      if (data.completed) {
        return `✅ "${data.title}" 완료!`;
      }
      return `📝 새로운 할 일: "${data.title}"`;
    },
    getDetails: (data) => {
      const details = [];
      if (data.dueDate) {
        details.push(`📅 ${data.dueDate}`);
      }
      if (data.category) {
        details.push(`🏷️ ${data.category}`);
      }
      return details;
    },
  });
};

/**
 * 🤖 WITH AI 탭 - 일정 알림
 */
export const useScheduleNotifications = (userId) => {
  useAutoNotification(userId, {
    collectionPath: 'calendarEvents',
    type: 'schedule',
    tab: 'WITH AI',
    getMessage: (data) => `📅 새로운 일정: "${data.title}"`,
    getDetails: (data) => {
      const details = [];
      if (data.date) {
        details.push(`📅 ${data.date}`);
      }
      if (data.time && data.end) {
        details.push(`⏰ ${data.time} ~ ${data.end}`);
      }
      if (data.categoryLabel) {
        details.push(`🏷️ ${data.categoryLabel}`);
      }
      return details;
    },
  });
};

/**
 * 📚 SUBJECT 탭 - 과목/주차 알림
 */
export const useSubjectNotifications = (userId) => {
  // 과목 추가 알림
  useAutoNotification(userId, {
    collectionPath: `users/${userId}/subjects`,
    type: 'subject',
    tab: 'SUBJECT',
    getMessage: (data) => `📚 새로운 과목 추가: "${data.title}"`,
    getDetails: (data) => {
      const details = [];
      if (data.professor) {
        details.push(`👨‍🏫 ${data.professor}`);
      }
      if (data.semester) {
        details.push(`📅 ${data.semester}`);
      }
      return details;
    },
    getSourceId: (doc) => doc.id,
  });
};

/**
 * 📔 IMAGE DIARY 탭 - 다이어리 알림
 */
export const useDiaryNotifications = (userId) => {
  useAutoNotification(userId, {
    collectionPath: 'imageDiaries',
    type: 'diary',
    tab: 'IMAGE DIARY',
    getMessage: (data) => {
      const emoji = data.emotion || '😊';
      return `${emoji} 오늘의 다이어리가 생성되었습니다`;
    },
    getDetails: (data) => {
      const details = [];
      if (data.date) {
        details.push(`📅 ${data.date}`);
      }
      if (data.emotion) {
        details.push(`💭 ${data.emotion}`);
      }
      if (data.prompt) {
        details.push(`✨ ${data.prompt.slice(0, 50)}...`);
      }
      return details;
    },
  });
};

/**
 * 🎯 시간표 알림
 */
export const useTimetableNotifications = (userId) => {
  useAutoNotification(userId, {
    collectionPath: `users/${userId}/timetable`,
    type: 'timetable',
    tab: 'SUBJECT',
    getMessage: (data) => `🗓️ 시간표 추가: "${data.title}"`,
    getDetails: (data) => {
      const details = [];
      if (data.day) {
        details.push(`📅 ${data.day}요일`);
      }
      if (data.start && data.end) {
        details.push(`⏰ ${data.start} ~ ${data.end}`);
      }
      return details;
    },
  });
};