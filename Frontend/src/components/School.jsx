import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
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

  const resetForm = () => {
    setFormData({ day: "", start: "", end: "", title: "", room: "" });
  };

  const fetchSubjects = async () => {
    const snap = await getDocs(col);
    setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.day || !formData.start || !formData.end || !formData.title.trim()) return;

    const color = colors[Math.floor(Math.random() * colors.length)];

    await addDoc(col, { ...formData, color });

    resetForm();
    setShowAddModal(false);
    fetchSubjects();
  };

  const handleDelete = async (id) => {
    if (!id) return console.error("❌ 삭제 실패: id 없음");

    await deleteDoc(doc(db, "timetable", id));
    setShowInfoModal(false);
    setSelected(null);
    fetchSubjects();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!selected?.id) return console.error("❌ update 실패: selected.id 없음");

    const ref = doc(db, "timetable", selected.id);
    await updateDoc(ref, {
      day: formData.day,
      start: formData.start,
      end: formData.end,
      title: formData.title,
      room: formData.room,
    });

    setShowEditModal(false);
    setShowInfoModal(false);
    setSelected(null);
    resetForm();
    fetchSubjects();
  };

  const topPx = (t) => (parseInt(t.split(":")[0], 10) - 9) * 64;
  const heightPx = (s, e) =>
    (parseInt(e.split(":")[0], 10) - parseInt(s.split(":")[0], 10)) * 64 || 48;

  const maxHour =
    subjects.length > 0
      ? Math.max(...subjects.map((s) => parseInt(s.end.split(":")[0], 10))) + 1
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
            <div key={d} className="school-header-day">{d}</div>
          ))}
        </div>

        {/* 본문 */}
        <div className="school-grid">
          <div className="school-time-column">
            {timeSlots.map((t) => (
              <div key={t} className="school-time-cell">{t}</div>
            ))}
          </div>

          <div className="school-subject-container">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s);
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

      <button
        onClick={() => setShowAddModal(true)}
        className="school-add-btn"
      >
        과목 추가
      </button>

      {/* 모달들 */}
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

/* ===================== 📘 모달: 추가 & 수정 ===================== */

function SchoolModal({ title, formData, setFormData, korDays, days, onSubmit, onClose }) {
  return (
    <div className="school-modal-bg">
      <div className="school-modal">
        <h4 className="school-modal-title">{title}</h4>

        <form onSubmit={onSubmit}>
          <div className="school-modal-day">
            <p>요일 선택</p>
            <div className="school-day-buttons">
              {korDays.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormData({ ...formData, day: days[i] })}
                  className={
                    formData.day === days[i]
                      ? "school-day-btn active"
                      : "school-day-btn"
                  }
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

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

          <input
            type="text"
            placeholder="과목명"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="school-input"
          />

          <input
            type="text"
            placeholder="강의실"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            className="school-input"
          />

          <div className="school-modal-btns">
            <button type="submit" className="school-btn-confirm">확인</button>
            <button type="button" className="school-btn-cancel" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== 📕 모달: 과목 정보 ===================== */

function SchoolInfoModal({ selected, setSelected, handleDelete, setFormData, setShowInfoModal, setShowEditModal }) {
  return (
    <div className="school-modal-bg">
      <div className="school-modal">
        <h4 className="school-modal-title">과목 정보</h4>

        <div className="school-info">
          <div>요일: {selected.day}</div>
          <div>시간: {selected.start} ~ {selected.end}</div>
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
                room: selected.room || "",
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
