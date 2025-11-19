// src/components/Withai.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "../styles/WithAi.css";

import {
  collection,
  addDoc,
  deleteDoc,
  doc as fsDoc,
  onSnapshot,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

import { db, auth } from "../services/firebase";
import { withAI } from "../services/api";

import { Sparkles, AlertCircle } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";

dayjs.locale("ko");

export default function Withai() {
  /* ----------------------------
      AUTH
  ----------------------------- */
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="withai-page withai-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="withai-page withai-center">
        <p>로그인이 필요합니다.</p>
      </div>
    );
  }

  const userId = user.uid;

  /* ----------------------------
      STATE
  ----------------------------- */
  const [timeline, setTimeline] = useState([]);
  const [todos, setTodos] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [events, setEvents] = useState([]);

  const [suggestions, setSuggestions] = useState([]);
  const [aiPlan, setAiPlan] = useState(null);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [dateList, setDateList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", time: "", end: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [startTask, setStartTask] = useState({ title: "기상", time: "07:00" });
  const [endTask, setEndTask] = useState({ title: "하루 마무리", time: "23:00" });

  const [currentTime, setCurrentTime] = useState(dayjs());
  const aiFetching = useRef(false);

  const today = dayjs();

  /* ----------------------------
      현재 시간 업데이트
  ----------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ----------------------------
      안전한 time 변환
  ----------------------------- */
  const safeTime = (t) => {
    if (!t) return "00:00";
    if (t === "24:00") return "23:59";
    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return "00:00";
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  /* ----------------------------
      날짜 리스트 생성
  ----------------------------- */
  useEffect(() => {
    const start = dayjs().subtract(7, "day");
    const arr = Array.from({ length: 15 }, (_, i) => {
      const d = start.add(i, "day");
      return {
        date: d.format("YYYY-MM-DD"),
        day: d.format("M/D(ddd)"),
      };
    });
    setDateList(arr);
  }, []);

  /* ----------------------------
      Todo 구독
  ----------------------------- */
  useEffect(() => {
    const qTodos = query(
      collection(db, "users", userId, "todos", selectedDate, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qTodos, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTodos(data.filter((t) => !t.completed));
    });

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      Timetable 구독
  ----------------------------- */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users", userId, "timetable"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayStr = dayNames[dayjs(selectedDate).day()];
        setTimetable(data.filter((t) => t.day === dayStr));
      }
    );

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      CalendarEvents 구독 (날짜별)
  ----------------------------- */
  useEffect(() => {
    const q = query(
      collection(db, "calendarEvents"),
      where("userId", "==", userId),
      where("date", "==", selectedDate)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(data);
      setTimeline(data.filter((e) => !e.fromTimetable && !e.fromEvent));
    });

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      combinedTimeline
  ----------------------------- */
  const combinedTimeline = useMemo(() => {
    const base = [...timeline];

    timetable.forEach((t) => {
      base.push({
        id: `tt-${t.id}`,
        title: `📚 ${t.title}`,
        time: t.start,
        end: t.end,
        fromTimetable: true,
      });
    });

    events.forEach((e) => {
      base.push({
        id: `evt-${e.id}`,
        title: `📅 ${e.title}`,
        time: e.time || "00:00",
        end: e.end || "",
        fromEvent: true,
      });
    });

    base.sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));
    return base;
  }, [timeline, timetable, events]);

  /* ----------------------------
      일정 간 공백 → suggestions
  ----------------------------- */
  useEffect(() => {
    const tasks = [
      { id: "start", title: startTask.title, end: safeTime(startTask.time) },
      ...combinedTimeline,
      { id: "end", title: endTask.title, time: safeTime(endTask.time) },
    ];

    const newSuggestions = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      const current = tasks[i];
      const next = tasks[i + 1];

      const diff = dayjs(`${selectedDate} ${safeTime(next.time)}`).diff(
        dayjs(`${selectedDate} ${safeTime(current.end || current.time)}`),
        "minute"
      );

      if (diff < 10) continue;

      const gapText =
        diff >= 60
          ? `${Math.floor(diff / 60)}시간 ${diff % 60}분`
          : `${diff}분`;

      newSuggestions.push({
        id: `${current.id}-gap`,
        after: current.id,
        text: `💬 다음 일정까지 ${gapText} 남았어요 ☕`,
      });
    }

    setSuggestions(newSuggestions);
  }, [combinedTimeline, selectedDate, startTask, endTask]);

  /* ----------------------------
      일정 저장
  ----------------------------- */
  const saveTask = async () => {
    if (!newTask.title.trim()) return;

    const data = {
      userId,
      title: newTask.title,
      time: safeTime(newTask.time),
      end: safeTime(newTask.end),
      date: selectedDate,
      aiGenerated: false,
      createdAt: new Date(),
    };

    try {
      if (isEditing && editId) {
        await updateDoc(fsDoc(db, "calendarEvents", editId), data);
      } else {
        await addDoc(collection(db, "calendarEvents"), data);
      }

      setShowTaskModal(false);
      setNewTask({ title: "", time: "", end: "" });
      setIsEditing(false);
      setEditId(null);
    } catch (err) {
      console.error(err);
      setError("일정 저장 실패");
    }
  };

  /* ----------------------------
      일정 삭제
  ----------------------------- */
  const deleteTask = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteDoc(fsDoc(db, "calendarEvents", id));
    } catch (err) {
      console.error(err);
    }
  };

  /* ----------------------------
      AI 일정 생성
  ----------------------------- */
  const generateAISchedule = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 기존 AI 일정 삭제
      const qOld = query(
        collection(db, "calendarEvents"),
        where("userId", "==", userId),
        where("date", "==", selectedDate),
        where("aiGenerated", "==", true)
      );

      const old = await getDocs(qOld);
      await Promise.all(old.docs.map((d) => deleteDoc(d.ref)));

      // API 호출
      const res = await withAI.post("/generate", {
        userId,
        selectedDate,
        startTime: startTask.time,
        endTime: endTask.time,
        todos,
        timetable,
        events,
      });

      if (res.data?.success) {
        await addDoc(collection(db, "notifications"), {
          type: "ai_schedule",
          title: "AI 일정 생성 완료",
          message: "AI가 일정을 생성했습니다.",
          userId,
          createdAt: new Date(),
        });

        alert("AI 일정 생성 완료!");
        setShowSettingsModal(false);
      }
    } catch (err) {
      console.error(err);
      setError("AI 일정 생성 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ----------------------------
      AI 추천 fetch
  ----------------------------- */
  useEffect(() => {
    if (!userId) return;
    if (aiFetching.current) return;

    const fetchPlan = async () => {
      aiFetching.current = true;
      try {
        const res = await withAI.post("/recommend", {
          userId,
          day: selectedDate,
          subject: "오늘 일정",
          mood: "보통",
          todos,
        });

        if (res.data?.success) {
          const plan = res.data.recommendations
            .map((r) => `🌸 ${r.title}\n${r.description}`)
            .join("\n\n");
          setAiPlan(plan);
        } else {
          setAiPlan("오늘은 여유롭게 하루를 보내보세요 ☕");
        }
      } catch (err) {
        setAiPlan("오늘은 여유롭게 하루를 보내보세요 ☕");
      } finally {
        setTimeout(() => {
          aiFetching.current = false;
        }, 500);
      }
    };

    fetchPlan();
  }, [selectedDate, userId, todos]);

  /* ----------------------------
      RENDER
  ----------------------------- */
  return (
    <div className="withai-page">
      {/* 헤더 */}
      <div className="withai-header">
        <h2 className="withai-title">
          <span className="title-icon">✨</span>
          <span className="title-text">
            <span className="title-ai">AI 추천</span>
            <span className="title-timeline">TIME-LINE</span>
          </span>
        </h2>
      </div>

      {/* TOP Bar */}
      <div className="withai-topbar">
        <button
          className="withai-playbtn"
          onClick={() => setShowSettingsModal(true)}
        >
          <Sparkles size={22} />
        </button>

        <button
          className="withai-date"
          onClick={() => setShowDropdown((p) => !p)}
        >
          {dayjs(selectedDate).format("M월 D일 (ddd)")}
        </button>

        <button
          className="withai-addbtn"
          onClick={() => {
            setNewTask({ title: "", time: "", end: "" });
            setIsEditing(false);
            setShowTaskModal(true);
          }}
        >
          + 일정 추가
        </button>

        <div className={`withai-dropdown ${showDropdown ? "open" : ""}`}>
          {dateList.map((d) => (
            <p
              key={d.date}
              onClick={() => {
                setSelectedDate(d.date);
                setShowDropdown(false);
              }}
            >
              {d.day}
            </p>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="withai-error-message">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* AI 추천 */}
      {aiPlan && (
        <div className="withai-aiplan-card">
          <h3>오늘의 AI 추천</h3>
          <p>{aiPlan}</p>
        </div>
      )}

      {/* 타임라인 */}
      <div className="withai-timeline">
        {combinedTimeline.length === 0 ? (
          <div className="withai-empty">
            <p>아직 일정이 없어요.</p>
            <p>AI 버튼 또는 [+ 일정 추가]를 사용해보세요.</p>
          </div>
        ) : (
          combinedTimeline.map((task) => {
            const status = (() => {
              const start = dayjs(`${selectedDate} ${safeTime(task.time)}`);
              const end = dayjs(`${selectedDate} ${safeTime(task.end)}`);

              if (!currentTime.isSame(dayjs(selectedDate), "day")) {
                return "future";
              }
              if (currentTime.isBefore(start)) return "future";
              if (currentTime.isAfter(end)) return "completed";
              return "current";
            })();

            const circleClass = [
              "withai-circle",
              status === "completed" ? "completed" : "",
              status === "current" ? "current" : "",
              status === "future" ? "future" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const gapAfter = suggestions.find((s) => s.after === task.id);

            return (
              <React.Fragment key={task.id}>
                <div className="withai-item">
                  <button
                    className={circleClass}
                    onClick={() => {
                      if (!task.fromTimetable && !task.fromEvent) {
                        setIsEditing(true);
                        setEditId(task.id);
                        setNewTask({
                          title: task.title,
                          time: safeTime(task.time),
                          end: safeTime(task.end),
                        });
                        setShowTaskModal(true);
                      }
                    }}
                    disabled={task.fromTimetable || task.fromEvent}
                  />

                  <div className="withai-content">
                    <h4>{task.title}</h4>
                    <div className="withai-time">
                      {safeTime(task.time)} ~ {safeTime(task.end)}
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {task.fromTimetable && (
                        <span className="tag timetable">시간표</span>
                      )}
                      {task.fromEvent && (
                        <span className="tag event">캘린더</span>
                      )}
                    </div>

                    {!task.fromTimetable && !task.fromEvent && (
                      <div className="withai-editbtns">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setEditId(task.id);
                            setNewTask({
                              title: task.title,
                              time: safeTime(task.time),
                              end: safeTime(task.end),
                            });
                            setShowTaskModal(true);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {gapAfter && (
                  <div
                    className="gap-suggestion"
                    style={{
                      marginLeft: 52,
                      marginBottom: 16,
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    {gapAfter.text}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* 일정 추가/수정 모달 */}
      {showTaskModal && (
        <div
          className="withai-task-modal"
          onClick={() => {
            setShowTaskModal(false);
            setIsEditing(false);
            setEditId(null);
          }}
        >
          <div
            className="withai-task-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="withai-task-header">
              <h3>{isEditing ? "일정 수정" : "일정 추가"}</h3>
              <button
                className="modal-close-btn"
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  setIsEditing(false);
                  setEditId(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="withai-task-form">
              <div className="withai-task-group">
                <label className="withai-task-label">제목</label>
                <input
                  type="text"
                  className="withai-task-input"
                  placeholder="일정 제목"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>

              <div className="withai-task-group">
                <label className="withai-task-label">시간</label>
                <div className="withai-time-group">
                  <input
                    type="time"
                    className="withai-task-input withai-time-input"
                    value={newTask.time}
                    onChange={(e) =>
                      setNewTask({ ...newTask, time: e.target.value })
                    }
                  />
                  <span className="withai-time-separator">~</span>
                  <input
                    type="time"
                    className="withai-task-input withai-time-input"
                    value={newTask.end}
                    onChange={(e) =>
                      setNewTask({ ...newTask, end: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="withai-task-buttons">
              <button
                type="button"
                className="withai-btn-task-cancel"
                onClick={() => {
                  setShowTaskModal(false);
                  setIsEditing(false);
                  setEditId(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="withai-btn-task-submit"
                onClick={saveTask}
              >
                {isEditing ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 설정 모달 */}
      {showSettingsModal && (
        <div
          className="withai-settings-modal"
          onClick={() => !isGenerating && setShowSettingsModal(false)}
        >
          <div
            className="withai-settings-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="withai-settings-header">
              <Sparkles size={20} />
              <h3>AI 일정 생성 설정</h3>
            </div>

            <div className="withai-settings-form">
              <div className="withai-form-group">
                <label className="withai-form-label">하루 시작 시간</label>
                <input
                  type="time"
                  className="withai-form-input"
                  value={startTask.time}
                  onChange={(e) =>
                    setStartTask({ ...startTask, time: e.target.value })
                  }
                />
              </div>

              <div className="withai-form-group">
                <label className="withai-form-label">하루 종료 시간</label>
                <input
                  type="time"
                  className="withai-form-input"
                  value={endTask.time}
                  onChange={(e) =>
                    setEndTask({ ...endTask, time: e.target.value })
                  }
                />
              </div>

              <div className="withai-data-summary">
                <h4>사용할 데이터 요약</h4>
                <div className="withai-data-item">
                  <span className="withai-data-label">Todo</span>
                  <span className="withai-data-value">{todos.length}개</span>
                </div>
                <div className="withai-data-item">
                  <span className="withai-data-label">시간표</span>
                  <span className="withai-data-value">
                    {timetable.length}개
                  </span>
                </div>
                <div className="withai-data-item">
                  <span className="withai-data-label">캘린더 이벤트</span>
                  <span className="withai-data-value">
                    {events.length}개
                  </span>
                </div>
              </div>

              {error && (
                <div className="withai-error-message">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="withai-modal-buttons">
              <button
                type="button"
                className="withai-btn-cancel"
                disabled={isGenerating}
                onClick={() => {
                  if (!isGenerating) setShowSettingsModal(false);
                }}
              >
                닫기
              </button>

              <button
                type="button"
                className="withai-btn-generate"
                disabled={isGenerating}
                onClick={generateAISchedule}
              >
                {isGenerating && (
                  <span className="withai-loading-spinner" />
                )}
                <span style={{ marginLeft: isGenerating ? 8 : 0 }}>
                  AI 일정 생성
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
