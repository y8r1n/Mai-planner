import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../services/firebase";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "../styles/CalendarCustom.css";

dayjs.locale("ko");

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [newEventText, setNewEventText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [addingNew, setAddingNew] = useState(false);

  const today = dayjs();
  const userId = auth.currentUser?.uid;

  /* ----------------------------------------
      🔥 Firestore 일정 실시간 구독
  ----------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, "users", userId, "calendar", "events");

    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(list);
    });

    return () => unsub();
  }, [userId]);

  /* ----------------------------------------
      🔥 달력 날짜 생성
  ----------------------------------------- */
  const generateCalendar = () => {
    const start = currentDate.startOf("month");
    const end = currentDate.endOf("month");

    const startDay = start.day();
    const totalDays = end.date();

    const arr = [];

    for (let i = 0; i < startDay; i++) arr.push(null);
    for (let i = 1; i <= totalDays; i++) arr.push(i);

    return arr;
  };

  const days = generateCalendar();

  /* ----------------------------------------
      🔥 특정 날짜의 일정 필터링
  ----------------------------------------- */
  const dailyEvents = selectedDate
    ? events.filter((ev) => ev.date === selectedDate.format("YYYY-MM-DD"))
    : [];

  /* ----------------------------------------
      🔥 일정 추가
  ----------------------------------------- */
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventText.trim()) return;

    const colRef = collection(db, "users", userId, "calendar", "events");

    await addDoc(colRef, {
      title: newEventText.trim(),
      date: selectedDate.format("YYYY-MM-DD"),
    });

    setNewEventText("");
    setAddingNew(false);
  };

  /* ----------------------------------------
      🔥 일정 수정
  ----------------------------------------- */
  const handleUpdateEvent = async (id) => {
    const ref = doc(db, "users", userId, "calendar", "events", id);

    await updateDoc(ref, { title: newEventText.trim() });

    setNewEventText("");
    setSelectedEvent(null);
  };

  /* ----------------------------------------
      🔥 일정 삭제
  ----------------------------------------- */
  const handleDeleteEvent = async (id) => {
    const ref = doc(db, "users", userId, "calendar", "events", id);

    await deleteDoc(ref);

    setSelectedEvent(null);
  };

  return (
    <div id="fullcalendar-page">
      {/* 월 이동 */}
      <div className="fullcalendar-header">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}>
          ◀
        </button>
        <h2>{currentDate.format("YYYY년 M월")}</h2>
        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))}>
          ▶
        </button>
      </div>

      {/* 요일 */}
      <div className="fullcalendar-days-row">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div key={i} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 */}
      <div className="fullcalendar-grid">
        {days.map((day, i) => {
          const dateStr = day
            ? currentDate.date(day).format("YYYY-MM-DD")
            : null;

          const dayEvents = events.filter((ev) => ev.date === dateStr);
          const extra = dayEvents.length - 1;
          const isToday = today.isSame(currentDate.date(day), "day");

          return (
            <div
              key={i}
              className={`fullcalendar-cell ${
                day ? "active" : "inactive"
              } ${i % 7 === 0 ? "sun" : i % 7 === 6 ? "sat" : ""}`}
              onClick={() => day && setSelectedDate(currentDate.date(day))}
            >
              {day && (
                <span
                  className={`fullcalendar-day-number ${
                    isToday ? "today" : ""
                  }`}
                >
                  {day}
                </span>
              )}

              <div className="fullcalendar-event-preview">
                {dayEvents.length > 0 && (
                  <div className="fullcalendar-event-badge">
                    {dayEvents[0].title}
                  </div>
                )}
                {extra > 0 && (
                  <div className="fullcalendar-extra-count">+{extra}</div>
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
          <div
            className="fullcalendar-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{selectedDate.format("M월 D일 (ddd)")}</h3>

            {/* 일정 목록 */}
            <div className="fullcalendar-event-list">
              {dailyEvents.length > 0 ? (
                dailyEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() =>
                      setSelectedEvent(
                        selectedEvent?.id === ev.id ? null : ev
                      )
                    }
                    className={`fullcalendar-event-item ${
                      selectedEvent?.id === ev.id ? "selected" : ""
                    }`}
                  >
                    {selectedEvent?.id === ev.id && newEventText ? (
                      <input
                        autoFocus
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
                <button onClick={() => setNewEventText(selectedEvent.title)}>
                  수정
                </button>
                <button
                  className="delete"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  삭제
                </button>
              </div>
            ) : (
              !addingNew && (
                <button
                  className="fullcalendar-add-btn"
                  onClick={() => setAddingNew(true)}
                >
                  ＋ 일정 추가하기
                </button>
              )
            )}

            {/* 일정 입력창 */}
            {addingNew && (
              <form onSubmit={handleAddEvent} className="fullcalendar-add-form">
                <input
                  value={newEventText}
                  autoFocus
                  onChange={(e) => setNewEventText(e.target.value)}
                  placeholder="일정을 입력하세요"
                />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
