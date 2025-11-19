// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db, auth } from "../services/firebase";
import "../styles/home.css";

dayjs.locale("ko");

export default function Home() {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const [todayTodos, setTodayTodos] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [events, setEvents] = useState([]);

  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [days, setDays] = useState([]);

  const today = dayjs().format("YYYY-MM-DD");

  /* -------------------------------
      ✔ 오늘의 Todo 실시간 구독
  -------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "todos", today, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTodayTodos(data);
    });

    return () => unsub();
  }, [userId, today]);

  /* -------------------------------
      ✔ 시간표 실시간 구독
  -------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(
      collection(db, "users", userId, "timetable"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTimetable(data);
      }
    );

    return () => unsub();
  }, [userId]);

  /* -------------------------------
      ✔ 캘린더 이벤트 구독
  -------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(
      collection(db, "users", userId, "calendar", "events"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(data);
      }
    );

    return () => unsub();
  }, [userId]);

  /* -------------------------------
      ✔ 달력 날짜 생성
  -------------------------------- */
  useEffect(() => {
    const startOfMonth = calendarDate.startOf("month");
    const endOfMonth = calendarDate.endOf("month");
    const startDay = startOfMonth.day();
    const totalDays = endOfMonth.date();

    const arr = [];
    for (let i = 0; i < startDay; i++) arr.push(null);
    for (let i = 1; i <= totalDays; i++) arr.push(i);

    setDays(arr);
  }, [calendarDate]);

  const incompleteTodos = todayTodos.filter((t) => !t.completed);

  return (
    <div id="home-container">
      {/* 오늘의 할 일 */}
      <section id="todo-section">
        <h2>오늘의 할 일</h2>

        {incompleteTodos.length > 0 ? (
          <div className="home-card" onClick={() => navigate("/todotab")}>
            {incompleteTodos.slice(0, 3).map((todo) => (
              <div key={todo.id} className="todo-item">
                <span className="todo-dot"></span>
                <span>{todo.title}</span>
              </div>
            ))}

            {incompleteTodos.length > 3 && (
              <div className="todo-more">외 {incompleteTodos.length - 3}개</div>
            )}
          </div>
        ) : (
          <div className="todo-empty">
            <p>오늘의 할 일이 없습니다.</p>
            <button
              className="todo-btn"
              onClick={() => navigate("/todotab")}
            >
              오늘의 할 일 추가하기
            </button>
          </div>
        )}
      </section>

      {/* 시간표 */}
      <section id="timetable-section">
        <h2>나의 시간표</h2>

        {timetable.length > 0 ? (
          <div
            className="timetable-box"
            onClick={() => navigate("/school")}
          >
            <div className="timetable-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => {
                const items = timetable
                  .filter((t) => t.day === day)
                  .slice(0, 2);

                return (
                  <div className="timetable-cell" key={day}>
                    {items.length === 0 ? (
                      <span className="timetable-empty">-</span>
                    ) : (
                      items.map((i) => (
                        <span
                          key={i.id}
                          className="timetable-item"
                          style={{ backgroundColor: i.color || "#feb" }}
                        >
                          {i.title}
                        </span>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="timetable-empty-box">
            <p>아직 등록된 시간표가 없습니다.</p>
            <button
              className="timetable-btn"
              onClick={() => navigate("/school")}
            >
              시간표 만들기
            </button>
          </div>
        )}
      </section>

      {/* 캘린더 미리보기 */}
      <section id="calendar-preview">
        <h2 className="calendar-header">
          {calendarDate.format("YYYY년 M월")}
        </h2>

        <div
          className="calendar-box"
          onClick={() => navigate("/calendar")}
        >
          <div className="calendar-grid calendar-header-row">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div key={i} className="calendar-day-header">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-grid calendar-body">
            {days.slice(0, 14).map((day, i) => {
              if (!day) return <div key={i} className="calendar-day-cell"></div>;

              const dateStr = calendarDate.date(day).format("YYYY-MM-DD");
              const dayEvents = events.filter((ev) => ev.date === dateStr);

              return (
                <div key={i} className="calendar-day-cell">
                  <span className="calendar-date">{day}</span>

                  {dayEvents.length > 0 && (
                    <div className="calendar-event">
                      {dayEvents[0].title}
                    </div>
                  )}

                  {dayEvents.length > 1 && (
                    <span className="calendar-more">+{dayEvents.length - 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="calendar-footer">전체 달력 보기 →</p>
        </div>
      </section>
    </div>
  );
}
