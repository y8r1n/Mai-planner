// src/contexts/NotificationContext.jsx
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db, auth } from "../services/firebase";

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

// 🔥 중복 방지용 키 생성
const generateKey = (type, sourceId, tab) =>
  `${type}-${sourceId || "none"}-${tab || "none"}`;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processedKeys, setProcessedKeys] = useState(new Set());

  const user = auth.currentUser;
  const userId = user?.uid || null;

  /** =============================
   *  🔥 userId 기반 실시간 구독
   * ============================= */
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const sorted = docs.sort((a, b) => {
        const aT = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : a.createdAt?.getTime?.() || 0;

        const bT = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : b.createdAt?.getTime?.() || 0;

        return bT - aT;
      });

      setNotifications(sorted);
      setUnreadCount(sorted.filter((n) => !n.read).length);

      const keys = new Set(
        sorted.map((n) =>
          generateKey(n.type, n.sourceId, n.tab)
        )
      );
      setProcessedKeys(keys);
    });

    return () => unsub();
  }, [userId]);

  /** =============================
   *  🔥 알림 추가 (중복 자동 체크)
   * ============================= */
  const addNotification = useCallback(
    async (notif) => {
      if (!userId) return null;

      const type = notif.type === "ai_schedule" ? "ai" : notif.type;

      const key = generateKey(type, notif.sourceId, notif.tab);
      if (processedKeys.has(key)) return null;

      // DB 중복 검사
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("type", "==", type),
        where("tab", "==", notif.tab),
        where("sourceId", "==", notif.sourceId || null)
      );

      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].id;

      // Firestore 저장
      const docRef = await addDoc(collection(db, "notifications"), {
        ...notif,
        type,
        userId,
        read: false,
        createdAt: new Date(),
      });

      return docRef.id;
    },
    [processedKeys, userId]
  );

  /** =============================
   *  🔥 읽음 처리
   * ============================= */
  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllAsRead = async () => {
    await Promise.all(
      notifications.map((n) =>
        updateDoc(doc(db, "notifications", n.id), { read: true })
      )
    );
  };

  /** =============================
   *  🔥 삭제
   * ============================= */
  const deleteNotification = async (id) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  const clearAllNotifications = async () => {
    await Promise.all(
      notifications.map((n) =>
        deleteDoc(doc(db, "notifications", n.id))
      )
    );
  };

  /** =============================
   *  🔥 알림 → 탭 링크
   * ============================= */
  const getNotificationRoute = (n) => {
    const type = n.type;
    switch (type) {
      case "todo":
        return "/TodoTab";
      case "schedule":
      case "event":
        return "/Calendar";
      case "ai":
        return "/Withai";
      case "subject":
        return n.sourceId ? `/subject/${n.sourceId}` : "/Study";
      case "diary":
        return "/ImageDiary";
      case "timetable":
        return "/School";
      default:
        return "/";
    }
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,
    getNotificationRoute,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/** =============================
 *  🔥 시간 표시 (방금 전 / 몇분 전)
 * ============================= */
export const getTimeAgo = (timestamp) => {
  const now = Date.now();

  const time = timestamp?.seconds
    ? timestamp.seconds * 1000
    : timestamp?.getTime?.() || timestamp;

  const diff = now - time;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);

  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  if (hour < 24) return `${hour}시간 전`;
  if (day < 7) return `${day}일 전`;

  return new Date(time).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};
