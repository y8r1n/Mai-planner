// src/utils/deleteUtils.js

import { db } from "../services/firebase";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

import { getStorage, ref, deleteObject } from "firebase/storage";

const storage = getStorage();

/**
 * ✅ Storage 파일 삭제
 */
const deleteFileFromStorage = async (path) => {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    console.warn("⚠️ 파일 삭제 실패:", err.message);
  }
};

/**
 * ================================================
 *  🔥 주차 삭제
 *  users/{uid}/subjects/{subjectId}/weeks/{weekId}
 * ================================================
 */
export const deleteWeekCompletely = async (userId, subjectId, weekId) => {
  try {
    const weekRef = doc(
      db,
      "users",
      userId,
      "subjects",
      subjectId,
      "weeks",
      weekId
    );

    // 🔹 파일 삭제
    const filesSnap = await getDocs(collection(weekRef, "files"));
    for (const f of filesSnap.docs) {
      const fileData = f.data();
      if (fileData.path) await deleteFileFromStorage(fileData.path);
      await deleteDoc(doc(weekRef, "files", f.id));
    }

    // 🔹 quizzes / notes / chats 삭제
    const subCollections = ["quizzes", "notes", "chats"];
    for (const sub of subCollections) {
      const snap = await getDocs(collection(weekRef, sub));
      for (const s of snap.docs) {
        await deleteDoc(doc(weekRef, sub, s.id));
      }
    }

    // 🔹 주차 문서 삭제
    await deleteDoc(weekRef);

    console.log(`✅ Week(${weekId}) 완전 삭제 완료`);
  } catch (err) {
    console.error("🔥 주차 삭제 오류:", err);
    throw err;
  }
};

/**
 * ================================================
 *  🔥 과목 삭제
 *  users/{uid}/subjects/{subjectId}
 * ================================================
 */
export const deleteSubjectCompletely = async (userId, subjectId) => {
  try {
    const subjectRef = doc(db, "users", userId, "subjects", subjectId);

    // 모든 하위 week 삭제
    const weeksSnap = await getDocs(collection(subjectRef, "weeks"));

    for (const week of weeksSnap.docs) {
      await deleteWeekCompletely(userId, subjectId, week.id);
    }

    // 과목 문서 삭제
    await deleteDoc(subjectRef);

    console.log(`📘 과목 ${subjectId} 전체 삭제 완료`);
  } catch (err) {
    console.error("🔥 과목 삭제 오류:", err);
    throw err;
  }
};
