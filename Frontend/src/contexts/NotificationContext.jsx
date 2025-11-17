import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

/* =========================================================
 🔥 createdAt 통일된 timestamp 계산 함수
========================================================= */
const getTime = (ts) => {
  if (!ts) return 0;
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts.getTime === "function") return ts.getTime();
  return 0;
};

/* =========================================================
 🔥 중복 알림 찾기 함수
========================================================= */
const isDuplicate = (existing, incoming) => {
  return (
    existing.type === incoming.type &&
    existing.sourceId === incoming.sourceId &&
    existing.tab === incoming.tab
  );
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  /* ----------------------------------------------------------
     🔥 탭별 알림 unreadCount
  ---------------------------------------------------------- */
  const unread = {
    HOME: notifications.filter((n) => !n.read && n.tab === "HOME").length,
    "WITH AI": notifications.filter((n) => !n.read && n.tab === "WITH AI").length,
    SUBJECT: notifications.filter((n) => !n.read && n.tab === "SUBJECT").length,
    "IMAGE DIARY": notifications.filter((n) => !n.read && n.tab === "IMAGE DIARY").length,
    total: notifications.filter((n) => !n.read).length,
  };

  /* ----------------------------------------------------------
     🔥 Firestore 초기 로드 완료 플래그
     → 초기 로드 동안에는 알림 생성 금지
  ---------------------------------------------------------- */
  const initialLoad = useRef({
    notifications: false,
    todos: false,
    events: false,
    calendar: false,
    subjects: false,
    diary: false,
  });

  /* =========================================================
     🔥 1. notifications 전체 실시간 구독 (읽기 최소화)
========================================================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "notifications"), (snap) => {

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const sorted = list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

      setNotifications(sorted);

      initialLoad.current.notifications = true;
    });

    return () => unsub();
  }, []);

  /* =========================================================
     🔥 공통: 새 알림 생성 함수 (중복 자동 방지 포함)
========================================================= */
  const createNotification = async (notice) => {

    // 중복 알림 체크
    const duplicated = notifications.find((n) => isDuplicate(n, notice));

    if (duplicated) {
      // details만 push해서 업데이트할 수도 있음 — 원하면 이 기능 적용 가능
      return;
    }

    await addDoc(collection(db, "notifications"), {
      ...notice,
      read: false,
      createdAt: new Date(),
    });
  };

  /* =========================================================
     🔥 2. 개별 컬렉션 구독 — 변화 감지 후 알림 생성
========================================================= */

  const subscribeWithFilter = (colName, keyName, builder) => {
    return onSnapshot(collection(db, colName), (snap) => {
      if (!initialLoad.current[keyName]) {
        initialLoad.current[keyName] = true;
        return;
      }

      snap.docChanges().forEach(async (change) => {
        if (change.type !== "added") return;

        const item = { id: change.doc.id, ...change.doc.data() };
        const createdTime = getTime(item.createdAt);
        const now = Date.now();

        if (now - createdTime > 4000) return;

        const notice = builder(item);
        if (notice) await createNotification(notice);
      });
    });
  };

  /* 🔥 ToDo 알림 */
  useEffect(() => {
    return subscribeWithFilter("todos", "todos", (todo) => ({
      type: "todo",
      title: "할 일 알림",
      message: "새로운 할 일이 등록되었습니다",
      details: [todo.title],
      sourceId: todo.id,
      tab: "HOME",
    }));
  }, []);

  /* 🔥 일정 알림 */
  useEffect(() => {
    return subscribeWithFilter("events", "events", (event) => ({
      type: "schedule",
      title: "일정 알림",
      message: event.title || "새로운 일정이 생겼습니다",
      details: event.time ? [event.time] : [],
      sourceId: event.id,
      tab: "HOME",
    }));
  }, []);

  /* 🔥 AI 일정 알림 */
  useEffect(() => {
    return subscribeWithFilter("calendar", "calendar", (cal) => ({
      type: "ai",
      title: "AI 일정 알림",
      message: "AI가 새로운 일정을 추천했습니다",
      details: [cal.title || ""],
      sourceId: cal.id,
      tab: "WITH AI",
    }));
  }, []);

  /* 🔥 과목 알림 */
  useEffect(() => {
    return subscribeWithFilter("subjects", "subjects", (subject) => ({
      type: "subject",
      title: "과목 알림",
      message: `새로운 과목이 등록되었습니다`,
      details: [subject.name],
      sourceId: subject.id,
      tab: "SUBJECT",
    }));
  }, []);

  /* 🔥 이미지 다이어리 알림 */
  useEffect(() => {
    return subscribeWithFilter("imageDiary", "diary", (diary) => {
      if (!diary.imageUrl) return null;
      return {
        type: "diary",
        title: "이미지 다이어리 알림",
        message: "새로운 감정 기록이 추가되었습니다",
        details: [diary.emotion || ""],
        sourceId: diary.id,
        tab: "IMAGE DIARY",
      };
    });
  }, []);

  /* =========================================================
     🔥 알림 읽기 / 삭제
========================================================= */
  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const deleteNotification = async (id) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  /* =========================================================
     🔥 Context 전달
========================================================= */
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markAsRead,
        deleteNotification,
        unread, // 🔥 탭별 unreadCount 제공
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/* ----------------------------------------------------------
 🔥 시간 표시 함수
---------------------------------------------------------- */
export const getTimeAgo = (ts) => {
  const diff = Date.now() - getTime(ts);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);

  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};
