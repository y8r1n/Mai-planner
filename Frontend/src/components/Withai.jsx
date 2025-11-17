// src/components/WithAi.jsx
// src/components/WithAi.jsx
import React, { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "../styles/WithAi.css";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { withAI } from "../services/api";

import { Edit3, Trash2, Sparkles, AlertCircle } from "lucide-react";

export default function WithAi() {
  const [timeline, setTimeline] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [aiPlan, setAiPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [newTask, setNewTask] = useState({ title: "", time: "", end: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [dateList, setDateList] = useState([]);

  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));

  const [todos, setTodos] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [events, setEvents] = useState([]);

  const [startTask, setStartTask] = useState({ title: "기상", time: "07:00" });
  const [endTask, setEndTask] = useState({ title: "하루 마무리", time: "23:00" });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [currentTime, setCurrentTime] = useState(dayjs());

  // 🔥 현재 시간 1분마다 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 안전한 시간
  const safeTime = (t) => {
    if (!t) return "00:00";
    if (t === "24:00") return "23:59";
    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return "00:00";
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // 🔥 시간 상태 체크
  const getTimeStatus = (time, end = null) => {
    const t = dayjs(`${selectedDate} ${safeTime(time)}`);
    const te = end ? dayjs(`${selectedDate} ${safeTime(end)}`) : t.add(1, "hour");
    const now = currentTime;

    if (!now.isSame(dayjs(selectedDate), "day")) return "future";
    if (now.isBefore(t)) return "future";
    if (now.isAfter(te)) return "completed";
    return "current";
  };

  // 🔥 Firestore 데이터 로드
  useEffect(() => {
    const unsubTodos = onSnapshot(collection(db, "todos"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTodos(data.filter((t) => t.date === selectedDate && !t.complete));
    });

    const unsubTimetable = onSnapshot(collection(db, "timetable"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const dayStr = ["일", "월", "화", "수", "목", "금", "토"][dayjs(selectedDate).day()];
      setTimetable(data.filter((t) => t.day === dayStr));
    });

    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(data.filter((e) => e.date === selectedDate));
    });

    const unsubCalendar = onSnapshot(collection(db, "calendar"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTimeline(
        data
          .filter((c) => c.date === selectedDate)
          .sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)))
      );
    });

    return () => {
      unsubTodos();
      unsubTimetable();
      unsubEvents();
      unsubCalendar();
    };
  }, [selectedDate]);

  // 🔥 날짜 리스트
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar"), (snap) => {
      const uniqueDates = snap.docs.map((d) => d.data()?.date).filter(Boolean);
      setDateList([...new Set(uniqueDates)].sort().reverse());
    });
    return () => unsub();
  }, []);

  // 🔥 타임라인 통합
  const combinedTimeline = [
    ...timeline.map((t) => ({ ...t, type: "calendar", time: safeTime(t.time) })),
    ...timetable.map((t) => ({
      ...t,
      type: "timetable",
      time: safeTime(t.start),
      end: safeTime(t.end),
    })),
    ...events.map((e) => ({ ...e, type: "event", time: safeTime(e.time) })),
  ].sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));

  // 🔥 Task 저장/수정
  const saveTask = async () => {
    if (!newTask.time) return;

    try {
      if (isEditing && editId === "start") {
        setStartTask(newTask);
        setShowModal(false);
        return;
      }
      if (isEditing && editId === "end") {
        setEndTask(newTask);
        setShowModal(false);
        return;
      }

      const map = {
        calendar: "calendar",
        todo: "todos",
        event: "events",
        timetable: "timetable",
      };
      const targetCol = map[newTask.type] || "calendar";

      if (isEditing && editId) {
        await updateDoc(doc(db, targetCol, editId), {
          ...newTask,
          date: selectedDate,
        });
      } else {
        await addDoc(collection(db, targetCol), {
          ...newTask,
          date: selectedDate,
          type: targetCol,
        });
      }
    } catch (err) {
      console.error("저장 실패:", err);
    } finally {
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      setNewTask({ title: "", time: "", end: "" });
    }
  };

  // 🔥 Task 삭제
  const handleDelete = async (item) => {
    try {
      const map = {
        calendar: "calendar",
        todo: "todos",
        event: "events",
        timetable: "timetable",
      };
      const targetCol = map[item.type] || "calendar";
      await deleteDoc(doc(db, targetCol, item.id));
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  // 🔥 Gap 계산
  useEffect(() => {
    const tasks = [
      { id: "start", title: startTask.title, end: safeTime(startTask.time) },
      ...combinedTimeline,
      { id: "end", title: endTask.title, time: safeTime(endTask.time) },
    ];

    const arr = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      const cur = tasks[i];
      const next = tasks[i + 1];

      const diff = dayjs(`${selectedDate} ${safeTime(next.time)}`).diff(
        dayjs(`${selectedDate} ${safeTime(cur.end || cur.time)}`),
        "minute"
      );

      if (diff < 10) continue;

      arr.push({
        id: `${cur.id}-gap`,
        text: `💬 다음 일정까지 ${
          diff >= 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`
        } 남았어요 ☕`,
        after: cur.id,
      });
    }
    setSuggestions(arr);
  }, [combinedTimeline, selectedDate, startTask, endTask]);

  // 🔥 AI 추천
  const aiFetching = useRef(false);
  useEffect(() => {
    const fetchAI = async () => {
      if (aiFetching.current) return;
      aiFetching.current = true;

      try {
        const res = await withAI.post("/recommend", {
          userId: "예린",
          day: selectedDate,
          subject: "오늘 일정",
          mood: "보통",
        });

        if (res.data?.success && res.data.recommendations?.length) {
          const plan = res.data.recommendations
            .map((r) => `🌸 ${r.title}\n${r.description}`)
            .join("\n\n");
          setAiPlan(plan);
        } else {
          setAiPlan("오늘은 여유롭게 하루를 시작해보세요 ☕");
        }
      } catch {
        setAiPlan("오늘은 여유롭게 하루를 시작해보세요 ☕");
      } finally {
        setTimeout(() => {
          aiFetching.current = false;
        }, 300);
      }
    };

    fetchAI();
  }, [selectedDate]);

  // 🔥 AI 일정 생성 기능
  const generateAISchedule = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 기존 AI 일정 삭제
      const q = query(
        collection(db, "calendar"),
        where("date", "==", selectedDate),
        where("aiGenerated", "==", true)
      );

      const snapshot = await getDocs(q);
      const del = snapshot.docs.map((s) =>
        deleteDoc(doc(db, "calendar", s.id))
      );
      await Promise.all(del);

      // AI 호출
      const res = await withAI.post("/generate", {
        selectedDate,
        startTime: startTask.time,
        endTime: endTask.time,
        todos: todos.map((t) => ({
          title: t.title,
          priority: t.priority || "medium",
        })),
        timetable,
        events,
        userName: "예린",
      });

      if (res.data.success) {
        alert(`AI가 ${res.data.totalTasks}개의 일정을 생성했습니다!`);

        await addDoc(collection(db, "notifications"), {
          type: "ai_schedule",
          title: "AI 일정 생성 완료",
          message: res.data.summary,
          tab: "WITH AI",
          read: false,
          createdAt: new Date(),
        });

        setShowSettingsModal(false);
      }
    } catch (err) {
      console.error(err);
      setError("AI 일정 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ===========================
  // 🔥 렌더링
  // ===========================
  return (
    <div className="withai-page flex flex-col items-center">
      <div className="withai-header">
        <h2 className="withai-title">
          <span className="title-icon">✨</span>
          <span className="title-text">
            <span className="title-ai">AI 추천</span>
            <span className="title-timeline">TIME-LINE</span>
          </span>
        </h2>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="withai-error-box">
          <AlertCircle size={18} />
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* 날짜 + 추가 */}
      <div className="withai-topbar">
        <button
          className="withai-playbtn"
          onClick={() => setShowSettingsModal(true)}
        >
          <Sparkles size={20} />
        </button>

        <span
          className="withai-date"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {dayjs(selectedDate).format("YYYY년 MM월 DD일 일정")}
        </span>

        <button
          className="withai-addbtn"
          onClick={() => {
            setShowModal(true);
            setIsEditing(false);
          }}
        >
          ✏️ 추가하기
        </button>

        {/* 날짜 목록 */}
        <div className={`withai-dropdown ${showDropdown ? "open" : ""}`}>
          <p
            className="withai-dateitem today"
            onClick={() => {
              setSelectedDate(dayjs().format("YYYY-MM-DD"));
              setShowDropdown(false);
            }}
          >
            📅 오늘로 돌아가기
          </p>

          {dateList.length ? (
            dateList.map((d) => (
              <p
                key={d}
                className="withai-dateitem"
                onClick={() => {
                  setSelectedDate(d);
                  setShowDropdown(false);
                }}
              >
                {d}
              </p>
            ))
          ) : (
            <p className="no-data">저장된 일정 없음</p>
          )}
        </div>
      </div>

      {/* AI 추천 루틴 */}
      {aiPlan && (
        <div className="withai-aiplan-card">
          <h3>🌤️ AI가 제안하는 오늘의 루틴</h3>
          <p style={{ whiteSpace: "pre-line" }}>{aiPlan}</p>
        </div>
      )}

      {/* 타임라인 */}
      <div className="withai-timeline">
        {/* 기상 */}
        <div className="withai-item">
          <div className={`withai-circle ${getTimeStatus(startTask.time)}`} />
          <div className="withai-content">
            <h4>{startTask.title}</h4>
            <p>{startTask.time}</p>
          </div>

          <button
            className="withai-editbtn"
            onClick={() => {
              setIsEditing(true);
              setEditId("start");
              setNewTask(startTask);
              setShowModal(true);
            }}
          >
            <Edit3 size={14} />
          </button>
        </div>

        {/* 통합 일정 */}
        {combinedTimeline.length ? (
          combinedTimeline.map((item) => (
            <React.Fragment key={item.id}>
              <div className="withai-item editable">
                <div
                  className={`withai-circle ${getTimeStatus(
                    item.time,
                    item.end
                  )}`}
                />
                <div className="withai-content">
                  <h4>{item.title}</h4>
                  <p>
                    {item.time}
                    {item.end && ` ~ ${item.end}`}
                  </p>
                  {item.aiGenerated && (
                    <span className="ai-badge">AI 생성</span>
                  )}
                </div>

                <div className="withai-editbtns">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditId(item.id);
                      setNewTask({
                        title: item.title,
                        time: item.time,
                        end: item.end,
                        type: item.type,
                      });
                      setShowModal(true);
                    }}
                  >
                    <Edit3 size={15} color="#e85a8c" />
                  </button>

                  <button onClick={() => handleDelete(item)}>
                    <Trash2 size={15} color="#e85a8c" />
                  </button>
                </div>
              </div>

              {/* Gap */}
              {suggestions
                .filter((s) => s.after === item.id)
                .map((s) => (
                  <div className="withai-item ai" key={s.id}>
                    <div className="withai-circle ai" />
                    <div className="withai-content ai-box">{s.text}</div>
                  </div>
                ))}
            </React.Fragment>
          ))
        ) : (
          <p className="no-data">등록된 일정이 없습니다.</p>
        )}

        {/* 마무리 */}
        <div className="withai-item end">
          <div className={`withai-circle ${getTimeStatus(endTask.time)}`} />
          <div className="withai-content">
            <h4>{endTask.title}</h4>
            <p>{endTask.time}</p>
          </div>

          <button
            onClick={() => {
              setIsEditing(true);
              setEditId("end");
              setNewTask(endTask);
              setShowModal(true);
            }}
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {showModal && (
        <div className="withai-modal-bg" onClick={() => setShowModal(false)}>
          <div className="withai-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="withai-modal-title">
              {isEditing ? "✏️ 일정 수정" : "➕ 일정 추가"}
            </h3>

            <input
              type="text"
              placeholder="제목"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              className="withai-input"
            />

            <div className="withai-time-group">
              <input
                type="time"
                value={newTask.time}
                onChange={(e) =>
                  setNewTask({ ...newTask, time: e.target.value })
                }
                className="withai-input"
              />
              <input
                type="time"
                value={newTask.end}
                onChange={(e) =>
                  setNewTask({ ...newTask, end: e.target.value })
                }
                className="withai-input"
              />
            </div>

            <div className="withai-modal-buttons">
              <button onClick={() => setShowModal(false)}>취소</button>
              <button onClick={saveTask}>
                {isEditing ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 일정 생성 모달 */}
      {showSettingsModal && (
        <div
          className="withai-modal-bg"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="withai-settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="withai-settings-title">
              <Sparkles size={20} /> AI 일정 생성
            </h3>

            <label className="withai-label">📅 날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="withai-input"
            />

            <label className="withai-label">🌅 시작 시간</label>
            <input
              type="time"
              value={startTask.time}
              onChange={(e) =>
                setStartTask({ ...startTask, time: e.target.value })
              }
              className="withai-input"
            />

            <label className="withai-label">🌙 종료 시간</label>
            <input
              type="time"
              value={endTask.time}
              onChange={(e) =>
                setEndTask({ ...endTask, time: e.target.value })
              }
              className="withai-input"
            />

            <p className="withai-warning">
              ⚠️ 기존 AI 생성 일정은 삭제되고 새로 생성됩니다.
            </p>

            {error && (
              <div className="withai-error-box">
                <AlertCircle />
                {error}
              </div>
            )}

            <div className="withai-modal-buttons">
              <button onClick={() => setShowSettingsModal(false)}>
                취소
              </button>

              <button
                onClick={generateAISchedule}
                disabled={isGenerating}
                className="withai-generate-btn"
              >
                {isGenerating ? "생성 중..." : "일정 생성하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
