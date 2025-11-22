import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import "../styles/Subject.css";
import { deleteWeekCompletely } from "../utils/deleteUtils";

export default function Subject() {
  const navigate = useNavigate();
  const { id } = useParams(); // subjectId

  const userId = auth.currentUser?.uid;
  const subjectPath = ["users", userId, "subjects", id];

  const [subject, setSubject] = useState({});
  const [weeks, setWeeks] = useState([]);

  /* ============================
     🔥 NavBar 숨기기
  ============================= */
  useEffect(() => {
    const globalNav = document.querySelector("#global-nav");
    if (globalNav) globalNav.style.display = "none";
    return () => {
      if (globalNav) globalNav.style.display = "";
    };
  }, []);

  /* ============================
     📌 과목 데이터 실시간
  ============================= */
  useEffect(() => {
    if (!userId || !id) return;

    const unsub = onSnapshot(doc(db, ...subjectPath), (snap) => {
      if (snap.exists()) setSubject(snap.data());
    });

    return () => unsub();
  }, [userId, id]);

  /* ============================
     📌 주차 리스트
  ============================= */
  useEffect(() => {
    if (!userId || !id) return;

    const weeksRef = collection(db, ...subjectPath, "weeks");

    const unsub = onSnapshot(weeksRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.weekTitle.localeCompare(b.weekTitle));
      setWeeks(list);
    });

    return () => unsub();
  }, [userId, id]);

  /* ============================
     📌 주차 추가
  ============================= */
  const addWeek = async () => {
    const newWeek = {
      weekTitle: `${weeks.length + 1}주차`,
      content: "",
      summary: "",
      memo: "",
      reviewMemo: "",
      aiSummary: "",
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, ...subjectPath, "weeks"), newWeek);
    } catch (err) {
      console.error("주차 추가 실패:", err);
    }
  };

  return (
    <div className="subject-page">
      {/* 헤더 */}
      <div className="subject-header">
        <button className="back-btn" onClick={() => navigate("/study")}>
          ←
        </button>
        <h2 className="subject-title">{subject.name}</h2>
      </div>

      {/* 주차 리스트만 표시 */}
      <div className="week-list-only">
        <h4>주차 선택</h4>

        {weeks.map((w) => (
          <div
            key={w.id}
            className="week-item"
            onClick={() => navigate(`/subject/${id}/week/${w.id}`)} 
          >
            {w.weekTitle}
            <button
              className="delete-week"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("주차 전체 삭제하시겠습니까?")) {
                  deleteWeekCompletely(userId, id, w.id);
                }
              }}
            >
              🗑️
            </button>
          </div>
        ))}

        <button className="add-week-btn" onClick={addWeek}>
          ＋ 주차 추가
        </button>
      </div>
    </div>
  );
}