// src/components/Home.jsx (또는 Home 컴포넌트 파일)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/home.css";

export default function Home() {
  const navigate = useNavigate();

  const [todos, setTodos] = useState([]);
  const [timetable, setTimetables] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [days, setDays] = useState([]);

  // 🔹 시간표용 요일 매핑 (영어 -> 한글)
  const timetableDayMap = {
    Mon: "월",
    Tue: "화",
    Wed: "수",
    Thu: "목",
    Fri: "금",
  };

  // 🔥 Firestore 실시간 구독
  useEffect(() => {
    const unsubTodos = onSnapshot(collection(db, "todos"), (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTimetable = onSnapshot(collection(db, "timetable"), (snap) => {
      setTimetables(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTodos();
      unsubTimetable();
      unsubEvents();
    };
  }, []);

  // 🔥 달력 날짜 생성
  useEffect(() => {
    const startOfMonth = calendarDate.startOf("month");
    const endOfMonth = calendarDate.endOf("month");
    const startDay = startOfMonth.day(); // 0(일) ~ 6(토)
    const totalDays = endOfMonth.date();

    const daysArr = [];
    for (let i = 0; i < startDay; i++) daysArr.push(null);
    for (let i = 1; i <= totalDays; i++) daysArr.push(i);
    setDays(daysArr);
  }, [calendarDate]);

  // 미완료 ToDo만 필터
  const incompleteTodos = todos.filter((todo) => !todo.completed);

  return (
    <div id="home-container">
      {/* ✅ ToDo 섹션 */}
      <section id="todo-section">
        <h2>ToDo</h2>

        {incompleteTodos.length > 0 ? (
          <div className="home-card" onClick={() => navigate("/TodoTab")}>
            {incompleteTodos.slice(0, 3).map((todo) => (
              <div key={todo.id} className="todo-item">
                <span className="todo-dot"></span>
                <span>{todo.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="todo-empty">
            <p>현재 미완료된 할 일이 없습니다.</p>
            <button
              onClick={() => navigate("/TodoTab")}
              className="todo-btn"
            >
              ToDo List 작성하기
            </button>
          </div>
        )}
      </section>

      {/* ✅ 시간표 섹션 */}
      <section id="timetable-section">
        <h2>나의 시간표</h2>
        {timetable.length > 0 ? (
          <div
            className="timetable-box"
            onClick={() => navigate("/School")}
          >
            <div className="timetable-grid">
  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((engDay) => {
    const list = timetable
      .filter((s) => s.day === engDay)
      .slice(0, 2);

    return (
      <div key={engDay} className="timetable-cell">
        {list.length === 0 ? (
          <span className="timetable-empty">-</span>
        ) : (
          list.map((s) => (
            <span
              key={s.id}
              className="timetable-item"
              style={{ backgroundColor: s.color || "#f8b6b6" }}
            >
              {s.title}
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
              onClick={() => navigate("/School")}
              className="timetable-btn"
            >
              시간표 만들기
            </button>
          </div>
        )}
      </section>

      {/* ✅ 캘린더 미리보기 */}
      <section id="calendar-preview">
        <h2 className="calendar-header">
          {calendarDate.format("YYYY년 M월")}
        </h2>

        {/* 🔹 라우트는 /Calendar (대문자 C) */}
        <div
          className="calendar-box"
          onClick={() => navigate("/Calendar")}
        >
          {/* 요일 헤더 */}
          <div className="calendar-grid calendar-header-row">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
              <div
                key={i}
                className={`calendar-day-header ${
                  i === 0 ? "sunday" : ""
                } ${i === 6 ? "saturday" : ""}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 박스 (앞부분 2주만 미리보기) */}
          <div className="calendar-grid calendar-body">
            {days.slice(0, 14).map((day, i) => {
              const dateStr =
                day && calendarDate.date(day).format("YYYY-MM-DD");

              const dayEvents = dateStr
                ? events.filter((ev) => ev.date === dateStr)
                : [];

              const extraCount = dayEvents.length - 1;

              return (
                <div
                  key={i}
                  className={`calendar-day-cell ${
                    i % 7 === 0
                      ? "sunday"
                      : i % 7 === 6
                      ? "saturday"
                      : ""
                  }`}
                >
                  {day && (
                    <>
                      <span className="calendar-date">{day}</span>

                      {dayEvents.length > 0 && (
                        <div className="calendar-event">
                          {dayEvents[0].title}
                        </div>
                      )}

                      {extraCount > 0 && (
                        <span className="calendar-more">
                          +{extraCount}
                        </span>
                      )}
                    </>
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
