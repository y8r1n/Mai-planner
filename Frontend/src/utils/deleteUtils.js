import { db } from "../services/firebase.js";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

const storage = getStorage();

/**
 * ✅ 파일 스토리지 삭제 유틸
 * @param {string} path - Storage 경로
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
 * ✅ 주차(week) 단위 삭제
 * Firestore + Storage 내 파일/퀴즈/노트/채팅 데이터 완전 삭제
 */
export const deleteWeekCompletely = async (subjectId, weekId) => {
  try {
    const weekRef = doc(db, "subjects", subjectId, "weeks", weekId);

    // 🔹 파일들 삭제
    const filesSnap = await getDocs(collection(weekRef, "files"));
    for (const f of filesSnap.docs) {
      const fileData = f.data();
      if (fileData.path) await deleteFileFromStorage(fileData.path);
      await deleteDoc(doc(weekRef, "files", f.id));
    }

    // 🔹 퀴즈 / 오답노트 / 챗 기록 삭제
    const subCollections = ["quizzes", "notes", "chats"];
    for (const sub of subCollections) {
      const snap = await getDocs(collection(weekRef, sub));
      for (const s of snap.docs) await deleteDoc(doc(weekRef, sub, s.id));
    }

    // 🔹 주차 문서 삭제
    await deleteDoc(weekRef);
    console.log(`✅ ${weekId} 주차 완전 삭제 완료`);
  } catch (err) {
    console.error("🔥 주차 삭제 오류:", err);
    throw err;
  }
};

/**
 * ✅ 과목(subject) 단위 완전 삭제
 * 하위 주차, 파일, 챗, 퀴즈, 오답노트 전부 포함
 */
export const deleteSubjectCompletely = async (subjectId) => {
  try {
    const subjectRef = doc(db, "subjects", subjectId);
    const weeksSnap = await getDocs(collection(subjectRef, "weeks"));

    for (const week of weeksSnap.docs) {
      await deleteWeekCompletely(subjectId, week.id);
    }

    await deleteDoc(subjectRef);
    console.log(`📘 과목 ${subjectId} 및 모든 하위 데이터 삭제 완료`);
  } catch (err) {
    console.error("🔥 과목 삭제 오류:", err);
    throw err;
  }
};
