import React, { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "../styles/CalendarCustom.css";  // ✅ 새로운 css 파일 연결

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEventText, setNewEventText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [addingNew, setAddingNew] = useState(false);

  const today = dayjs();

  // 🔹 Firestore 일정 실시간 구독
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // 🔹 달력 날짜 생성
  const generateCalendar = () => {
    const start = currentDate.startOf("month");
    const end = currentDate.endOf("month");
    const startDay = start.day();
    const totalDays = end.date();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };
  const days = generateCalendar();

  const dailyEvents = selectedDate
    ? events.filter((ev) => ev.date === selectedDate.format("YYYY-MM-DD"))
    : [];

  // 🔹 일정 추가
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventText.trim()) return;
    await addDoc(collection(db, "events"), {
      title: newEventText.trim(),
      date: selectedDate.format("YYYY-MM-DD"),
    });
    setNewEventText("");
    setAddingNew(false);
  };

  // 🔹 일정 수정
  const handleUpdateEvent = async (id) => {
    const ref = doc(db, "events", id);
    await updateDoc(ref, { title: newEventText.trim() });
    setNewEventText("");
    setSelectedEvent(null);
  };

  // 🔹 일정 삭제
  const handleDeleteEvent = async (id) => {
    await deleteDoc(doc(db, "events", id));
    setSelectedEvent(null);
  };

  return (
    <div id="fullcalendar-page">
      {/* 상단 월 이동 */}
      <div className="fullcalendar-header">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}>◀</button>
        <h2>{currentDate.format("YYYY년 M월")}</h2>
        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))}>▶</button>
      </div>

      {/* 요일 헤더 */}
      <div className="fullcalendar-days-row">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div key={i} className={
        i === 0 ? "sun" : i === 6 ? "sat" : ""}>{d}</div>
        ))}
      </div>

      {/* 날짜 + 일정 */}
      <div className="fullcalendar-grid">
        {days.map((day, i) => {
          const dateStr = day ? currentDate.date(day).format("YYYY-MM-DD") : null;
          const dayEvents = events.filter((ev) => ev.date === dateStr);
          const extraCount = dayEvents.length - 1;
          const isToday = today.isSame(currentDate.date(day), "day");

          return (
            <div
              key={i}
              className={`fullcalendar-cell ${day ? "active" : "inactive"} ${i % 7 === 0 ? "sun" : i % 7 === 6 ? "sat" : ""}`}
              onClick={() => day && setSelectedDate(currentDate.date(day))}
            >
              {day && (
                <span className={`fullcalendar-day-number ${isToday ? "today" : ""}`}>
                  {day}
                </span>
              )}

              <div className="fullcalendar-event-preview">
                {dayEvents.length > 0 && (
                  <div className="fullcalendar-event-badge">{dayEvents[0].title}</div>
                )}
                {extraCount > 0 && (
                  <div className="fullcalendar-extra-count">+{extraCount}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 일정 모달 */}
      {selectedDate && (
        <div
          className="fullcalendar-modal-bg"
          onClick={() => {
            setSelectedDate(null);
            setAddingNew(false);
            setSelectedEvent(null);
          }}
        >
          <div className="fullcalendar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedDate.format("M월 D일 (ddd)")}</h3>

            {/* 일정 목록 */}
            <div className="fullcalendar-event-list">
              {dailyEvents.length > 0 ? (
                dailyEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() =>
                      setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)
                    }
                    className={`fullcalendar-event-item ${selectedEvent?.id === ev.id ? "selected" : ""}`}
                  >
                    {selectedEvent?.id === ev.id && newEventText ? (
                      <input
                        value={newEventText}
                        onChange={(e) => setNewEventText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateEvent(ev.id)
                        }
                      />
                    ) : (
                      ev.title
                    )}
                  </div>
                ))
              ) : (
                <p className="fullcalendar-empty">등록된 일정이 없습니다.</p>
              )}
            </div>

            {/* 버튼 */}
            {selectedEvent ? (
              <div className="fullcalendar-modal-btns">
                <button onClick={() => setNewEventText(selectedEvent.title)}>수정</button>
                <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="delete">삭제</button>
              </div>
            ) : (
              !addingNew && (
                <button
                  onClick={() => setAddingNew(true)}
                  className="fullcalendar-add-btn"
                >
                  ＋ 일정을 추가하세요
                </button>
              )
            )}

            {/* 새 일정 입력 */}
            {addingNew && (
              <form onSubmit={handleAddEvent} className="fullcalendar-add-form">
                <input
                  autoFocus
                  value={newEventText}
                  onChange={(e) => setNewEventText(e.target.value)}
                  placeholder="새 일정을 입력하세요"
                />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
