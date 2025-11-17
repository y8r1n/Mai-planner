// src/components/School.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/school.css";

export default function School() {
  const [subjects, setSubjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const [formData, setFormData] = useState({
    day: "",
    start: "",
    end: "",
    title: "",
    room: "",
  });

  const col = collection(db, "timetable");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const korDays = ["월", "화", "수", "목", "금"];
  const colors = ["#f8b6b6", "#f3a6b6", "#f8c2c2", "#fcbfcf", "#f4a5a5"];

  // ------------------------------
  // 🔥 Firestore 실시간 반영
  // ------------------------------
  useEffect(() => {
    const unsub = onSnapshot(col, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(list);
    });
    return () => unsub();
  }, []);

  // ------------------------------
  // 🔥 과목 추가
  // ------------------------------
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.day || !formData.start || !formData.end || !formData.title.trim())
      return alert("모든 필드를 입력하세요!");

    const color = colors[Math.floor(Math.random() * colors.length)];
    await addDoc(col, { ...formData, color });

    setShowAddModal(false);
    setFormData({ day: "", start: "", end: "", title: "", room: "" });
  };

  // ------------------------------
  // 🔥 과목 삭제
  // ------------------------------
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "timetable", id));
    setShowInfoModal(false);
    setSelected(null);
  };

  // ------------------------------
  // 🔥 과목 수정
  // ------------------------------
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;

    const ref = doc(db, "timetable", selected.id);
    await updateDoc(ref, { ...formData });

    setShowEditModal(false);
    setShowInfoModal(false);
  };

  // ------------------------------
  // 🔥 시간 배치 계산
  // ------------------------------
  const topPx = (t) => {
    const [h, m] = t.split(":").map(Number);
    const base = h - 9;
    return base * 64 + (m / 60) * 64;
  };

  const heightPx = (start, end) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diffHours = eh + em / 60 - (sh + sm / 60);
    return diffHours * 64;
  };

  const maxHour =
    subjects.length > 0
      ? Math.max(...subjects.map((s) => Number(s.end.split(":")[0]))) + 1
      : 16;

  const timeSlots = Array.from({ length: maxHour - 9 }, (_, i) => `${9 + i}:00`);

  return (
    <div id="school-page">
      <h1 className="school-title">나의 시간표</h1>

      <div className="school-table">
        {/* 요일 헤더 */}
        <div className="school-header">
          <div className="school-header-empty"></div>
          {days.map((d) => (
            <div key={d} className="school-header-day">
              {d}
            </div>
          ))}
        </div>

        {/* 그리드 */}
        <div className="school-grid">
          <div className="school-time-column">
            {timeSlots.map((t) => (
              <div key={t} className="school-time-cell">
                {t}
              </div>
            ))}
          </div>

          <div className="school-subject-container">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setFormData({
                    day: s.day,
                    start: s.start,
                    end: s.end,
                    title: s.title,
                    room: s.room,
                  });
                  setShowInfoModal(true);
                }}
                className="school-subject"
                style={{
                  top: `${topPx(s.start)}px`,
                  left: `${days.indexOf(s.day) * 18}%`,
                  height: `${heightPx(s.start, s.end)}px`,
                  width: "16%",
                  backgroundColor: s.color || "#f8b6b6",
                }}
              >
                <div className="school-subject-title">{s.title}</div>
                <div className="school-subject-room">{s.room}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="school-add-btn" onClick={() => setShowAddModal(true)}>
        과목 추가
      </button>

      {/* 모달 3종 */}
      {showAddModal && (
        <SchoolModal
          title="과목 추가"
          formData={formData}
          setFormData={setFormData}
          korDays={korDays}
          days={days}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showInfoModal && selected && (
        <SchoolInfoModal
          selected={selected}
          setSelected={setSelected}
          handleDelete={handleDelete}
          setFormData={setFormData}
          setShowInfoModal={setShowInfoModal}
          setShowEditModal={setShowEditModal}
        />
      )}

      {showEditModal && (
        <SchoolModal
          title="과목 수정"
          formData={formData}
          setFormData={setFormData}
          korDays={korDays}
          days={days}
          onSubmit={handleUpdate}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

/* ======================== 📌 SchoolModal ======================== */

function SchoolModal({ title, formData, setFormData, korDays, days, onSubmit, onClose }) {
  return (
    <div className="school-modal-bg">
      <div className="school-modal">
        <h4 className="school-modal-title">{title}</h4>

        <form onSubmit={onSubmit}>
          {/* 요일 선택 */}
          <div className="school-modal-day">
            <p>요일 선택</p>
            <div className="school-day-buttons">
              {korDays.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormData({ ...formData, day: days[i] })}
                  className={
                    formData.day === days[i] ? "school-day-btn active" : "school-day-btn"
                  }
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 */}
          <div className="school-time-inputs">
            <input
              type="time"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
            />
            <span>~</span>
            <input
              type="time"
              value={formData.end}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
            />
          </div>

          {/* 과목명 */}
          <input
            type="text"
            placeholder="과목명"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="school-input"
          />

          {/* 강의실 */}
          <input
            type="text"
            placeholder="강의실"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            className="school-input"
          />

          <div className="school-modal-btns">
            <button type="submit" className="school-btn-confirm">
              확인
            </button>
            <button type="button" className="school-btn-cancel" onClick={onClose}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================== 📌 SchoolInfoModal ======================== */

function SchoolInfoModal({
  selected,
  setSelected,
  handleDelete,
  setFormData,
  setShowInfoModal,
  setShowEditModal,
}) {
  return (
    <div className="school-modal-bg">
      <div className="school-modal">
        <h4 className="school-modal-title">과목 정보</h4>

        <div className="school-info">
          <div>요일: {selected.day}</div>
          <div>
            시간: {selected.start} ~ {selected.end}
          </div>
          <div>과목명: {selected.title}</div>
          <div>강의실: {selected.room || "-"}</div>
        </div>

        <div className="school-info-btns">
          <button
            onClick={() => {
              setFormData({
                day: selected.day,
                start: selected.start,
                end: selected.end,
                title: selected.title,
                room: selected.room,
              });
              setShowEditModal(true);
            }}
            className="school-btn-edit"
          >
            수정
          </button>

          <button
            onClick={() => handleDelete(selected.id)}
            className="school-btn-delete"
          >
            삭제
          </button>

          <button
            onClick={() => {
              setShowInfoModal(false);
              setSelected(null);
            }}
            className="school-btn-close"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
