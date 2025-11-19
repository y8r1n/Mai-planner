// src/components/Withai.jsx
import React, { useEffect, useState, useRef } from "react";
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
import { Edit3, Trash2, Sparkles, Loader2, AlertCircle, X } from "lucide-react";

dayjs.locale("ko");

export default function Withai() {
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
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );

  const [todos, setTodos] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [events, setEvents] = useState([]);

  const [startTask, setStartTask] = useState({ title: "기상", time: "07:00" });
  const [endTask, setEndTask] = useState({ title: "하루 마무리", time: "23:00" });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(dayjs());

  const aiFetching = useRef(false);
  const userId = auth.currentUser?.uid || null;
  const today = dayjs();

  /* --------------------------------
   * ⏰ 현재 시간 1분마다 갱신
   * -------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /* --------------------------------
   * 🕒 안전한 시간 문자열
   * -------------------------------- */
  const safeTime = (t) => {
    if (!t) return "00:00";
    if (t === "24:00") return "23:59";
    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return "00:00";
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  /* --------------------------------
   * ⏱ 일정 상태 (current/future/completed)
   * -------------------------------- */
  const getTimeStatus = (time, endTime = null) => {
    const taskTime = dayjs(`${selectedDate} ${safeTime(time)}`);
    const taskEndTime = endTime
      ? dayjs(`${selectedDate} ${safeTime(endTime)}`)
      : taskTime.add(1, "hour");

    const now = currentTime;

    if (!now.isSame(dayjs(selectedDate), "day")) {
      return "future";
    }

    if (now.isBefore(taskTime)) return "future";
    if (now.isAfter(taskEndTime)) return "completed";
    return "current";
  };

  /* --------------------------------
   * 📅 날짜 리스트 (지난 7일 ~ 앞으로 7일)
   * -------------------------------- */
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

  /* --------------------------------
   * ✅ 날짜별 Todo / Timetable / Events 구독
   * -------------------------------- */
  useEffect(() => {
    if (!userId) return;

    // 날짜별 Todo
    const todosQuery = query(
      collection(db, "users", userId, "todos", selectedDate, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsubTodos = onSnapshot(todosQuery, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // WithAI에서는 미완료 Todo만 사용
      setTodos(data.filter((t) => !t.completed));
    });

    // 요일 기반 timetable
    const unsubTimetable = onSnapshot(
      collection(db, "users", userId, "timetable"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayStr = dayNames[dayjs(selectedDate).day()];
        setTimetable(data.filter((t) => t.day === dayStr));
      }
    );

    // 날짜 기반 events
    const unsubEvents = onSnapshot(
      collection(db, "users", userId, "calendar", "events"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(data.filter((e) => e.date === selectedDate));
      }
    );

    return () => {
      unsubTodos();
      unsubTimetable();
      unsubEvents();
    };
  }, [selectedDate, userId]);

  /* --------------------------------
   * 📌 타임라인(calendar - root, userId + date 기준)
   * -------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const qTimeline = query(
      collection(db, "calendar"),
      where("userId", "==", userId),
      where("date", "==", selectedDate)
    );

    const unsub = onSnapshot(qTimeline, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));
      setTimeline(data);
    });

    return () => unsub();
  }, [selectedDate, userId]);

  /* --------------------------------
   * 🧠 Combined Timeline (타임라인 + 시간표 + 이벤트)
   * -------------------------------- */
  const combinedTimeline = (() => {
    const base = [...timeline];

    timetable.forEach((t) => {
      base.push({
        id: `tt-${t.id}`,
        title: `📚 ${t.title}`,
        time: t.start,
        end: t.end,
        aiGenerated: false,
        fromTimetable: true,
      });
    });

    events.forEach((e) => {
      base.push({
        id: `evt-${e.id}`,
        title: `📅 ${e.title}`,
        time: e.time || "00:00",
        aiGenerated: false,
        fromEvent: true,
      });
    });

    base.sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));
    return base;
  })();

  /* --------------------------------
   * 💬 일정 사이 공백(gap) 분석 → suggestions
   * -------------------------------- */
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
        type: "gap",
        after: current.id,
        text: `💬 다음 일정까지 ${gapText} 남았어요 ☕`,
      });
    }

    setSuggestions(newSuggestions);
  }, [combinedTimeline, selectedDate, startTask, endTask]);

  /* --------------------------------
   * ✏️ 일정 추가/수정 (타임라인용)
   * -------------------------------- */
  const saveTask = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!newTask.title.trim()) return;

    const taskData = {
      userId,
      title: newTask.title.trim(),
      time: safeTime(newTask.time || "09:00"),
      end: safeTime(newTask.end || newTask.time || "10:00"),
      date: selectedDate,
      aiGenerated: false,
    };

    try {
      if (isEditing && editId) {
        await updateDoc(fsDoc(db, "calendar", editId), taskData);
      } else {
        await addDoc(collection(db, "calendar"), taskData);
      }

      setNewTask({ title: "", time: "", end: "" });
      setIsEditing(false);
      setEditId(null);
      setShowModal(false);
    } catch (err) {
      console.error("일정 저장 실패:", err);
      setError("일정 저장에 실패했습니다.");
    }
  };

  const editTask = (task) => {
    if (task.fromTimetable || task.fromEvent) return; // 외부 데이터는 수정 X
    setNewTask({
      title: task.title,
      time: safeTime(task.time),
      end: safeTime(task.end || task.time),
    });
    setIsEditing(true);
    setEditId(task.id);
    setShowModal(true);
  };

  const deleteTask = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      await deleteDoc(fsDoc(db, "calendar", id));
    } catch (err) {
      console.error("삭제 실패:", err);
      setError("일정 삭제에 실패했습니다.");
    }
  };

  /* --------------------------------
   * 🤖 AI 일정 생성 (타임라인)
   * -------------------------------- */
  const generateAISchedule = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 기존 AI 생성 일정 삭제
      const qOld = query(
        collection(db, "calendar"),
        where("userId", "==", userId),
        where("date", "==", selectedDate),
        where("aiGenerated", "==", true)
      );
      const snapshot = await getDocs(qOld);
      const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(fsDoc(db, "calendar", docSnap.id))
      );
      await Promise.all(deletePromises);

      // AI API 호출
      const response = await withAI.post("/generate", {
        userId,
        selectedDate,
        startTime: startTask.time,
        endTime: endTask.time,
        todos: todos.map((t) => ({
          title: t.title,
          priority: t.priority || "medium",
        })),
        timetable: timetable.map((t) => ({
          title: t.title,
          start: t.start,
          end: t.end,
        })),
        events: events.map((e) => ({
          title: e.title,
          time: e.time || "00:00",
        })),
        userName: "사용자",
      });

      if (response.data?.success) {
        // 알림 (기존 구조 유지: 루트 notifications)
        await addDoc(collection(db, "notifications"), {
          type: "ai_schedule",
          title: "AI 일정 생성 완료",
          message:
            response.data.summary || "AI가 최적화된 일정을 생성했습니다.",
          details: [
            `총 ${response.data.totalTasks || 0}개의 일정이 생성되었습니다.`,
          ],
          tab: "WITH AI",
          read: false,
          createdAt: new Date(),
          userId,
        });

        alert(
          `✅ ${
            response.data.totalTasks || 0
          }개의 AI 일정이 생성되었습니다! (캘린더 탭과 함께 확인해보세요)`
        );
        setShowSettingsModal(false);
      } else {
        setError("AI 일정 생성에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch (error) {
      console.error("❌ AI 일정 생성 오류:", error);
      const errorMsg =
        error.response?.data?.error ||
        "AI 일정 생성 중 오류가 발생했습니다. 백엔드 서버를 확인해주세요.";
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  /* --------------------------------
   * 🤖 AI 추천 텍스트 (상단 카드)
   * -------------------------------- */
  useEffect(() => {
    if (!userId) return;
    if (aiFetching.current) return;

    const fetchAIPlan = async () => {
      aiFetching.current = true;
      try {
        const res = await withAI.post("/recommend", {
          userId,
          day: selectedDate,
          subject: "오늘 일정",
          mood: "보통",
          todos, // 날짜별 Todo
        });

        if (res.data?.success && res.data.recommendations?.length) {
          const plan = res.data.recommendations
            .map((r) => `🌸 ${r.title}\n${r.description}`)
            .join("\n\n");
          setAiPlan(plan);
        } else {
          setAiPlan("오늘은 여유롭게 하루를 시작해보세요 ☕");
        }
      } catch (err) {
        console.error("AI 추천 오류:", err);
        setAiPlan("오늘은 여유롭게 하루를 시작해보세요 ☕");
      } finally {
        setTimeout(() => {
          aiFetching.current = false;
        }, 300);
      }
    };

    fetchAIPlan();
  }, [selectedDate, userId, todos]);

  /* --------------------------------
   * 🔙 로그인 안 되어 있으면 안내
   * -------------------------------- */
  if (!userId) {
    return (
      <div className="withai-page withai-center">
        <p>With AI 타임라인을 사용하려면 로그인이 필요합니다.</p>
      </div>
    );
  }

  /* --------------------------------
   * 🖼 렌더링
   * -------------------------------- */
  return (
    <div className="withai-page flex flex-col items-center">
      {/* 헤더 */}
      <div className="withai-header">
        <h2 className="withai-title">
          <span className="title-icon">✨</span>
          <span className="title-text">
            <span className="title-ai">AI 추천</span>
            <span className="title-timeline">TIME-LINE</span>
          </span>
        </h2>

        <button
          className="settings-btn"
          onClick={() => setShowSettingsModal(true)}
        >
          <Sparkles size={20} />
          AI 일정 생성
        </button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="withai-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* AI 추천 텍스트 */}
      {aiPlan && (
        <div className="ai-recommendation-box">
          <h3>🤖 오늘의 AI 추천</h3>
          <p className="whitespace-pre-line">{aiPlan}</p>
        </div>
      )}

      {/* 날짜 선택 드롭다운 */}
      <div className="date-selector">
        <button
          className="date-selector-btn"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {dayjs(selectedDate).format("M월 D일 (ddd)")}
        </button>
        {showDropdown && (
          <div className="date-dropdown">
            {dateList.map((d) => (
              <div
                key={d.date}
                onClick={() => {
                  setSelectedDate(d.date);
                  setShowDropdown(false);
                }}
                className={`date-dropdown-item ${
                  d.date === selectedDate ? "selected" : ""
                }`}
              >
                {d.day}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 타임라인 리스트 */}
      <div className="timeline-container">
        {combinedTimeline.length === 0 && (
          <div className="timeline-empty">
            <p>아직 등록된 일정이 없어요.</p>
            <p>아래의 [+ 일정 추가] 버튼 또는 AI 일정을 사용해보세요.</p>
          </div>
        )}

        {combinedTimeline.map((task, idx) => {
          const status = getTimeStatus(task.time, task.end);
          const gapAfter = suggestions.find((s) => s.after === task.id);

          return (
            <React.Fragment key={task.id}>
              <div className={`timeline-item ${status}`}>
                <div className="time-badge">
                  {safeTime(task.time)}
                  {task.end && ` ~ ${safeTime(task.end)}`}
                </div>
                <div className="task-content">
                  <div className="task-title">{task.title}</div>

                  {/* 출처 표시 */}
                  <div className="task-meta">
                    {task.aiGenerated && <span className="tag-ai">AI</span>}
                    {task.fromTimetable && (
                      <span className="tag-timetable">시간표</span>
                    )}
                    {task.fromEvent && (
                      <span className="tag-event">캘린더</span>
                    )}
                  </div>

                  {/* 편집/삭제 (타임라인 고유 데이터만 가능) */}
                  {!task.fromTimetable && !task.fromEvent && (
                    <div className="task-actions">
                      <button onClick={() => editTask(task)}>
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteTask(task.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* gap 안내 */}
              {gapAfter && (
                <div className="gap-suggestion">
                  <span>{gapAfter.text}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 일정 추가 버튼 */}
      <button className="add-task-btn" onClick={() => setShowModal(true)}>
        + 일정 추가
      </button>

      {/* 일정 추가/수정 모달 */}
      {showModal && (
        <div
          className="withai-modal-bg"
          onClick={() => {
            setShowModal(false);
            setIsEditing(false);
            setEditId(null);
            setNewTask({ title: "", time: "", end: "" });
          }}
        >
          <div className="withai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="withai-modal-header">
              <h3>{isEditing ? "일정 수정" : "일정 추가"}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                  setEditId(null);
                  setNewTask({ title: "", time: "", end: "" });
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="withai-modal-body">
              <label className="modal-label">
                제목
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="일정 제목을 입력하세요"
                />
              </label>

              <div className="modal-time-row">
                <label className="modal-label">
                  시작
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) =>
                      setNewTask({ ...newTask, time: e.target.value })
                    }
                  />
                </label>
                <label className="modal-label">
                  종료
                  <input
                    type="time"
                    value={newTask.end}
                    onChange={(e) =>
                      setNewTask({ ...newTask, end: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="withai-modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                  setEditId(null);
                  setNewTask({ title: "", time: "", end: "" });
                }}
              >
                취소
              </button>
              <button className="modal-btn primary" onClick={saveTask}>
                {isEditing ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 설정 모달 */}
      {showSettingsModal && (
        <div
          className="withai-modal-bg"
          onClick={() => {
            if (isGenerating) return;
            setShowSettingsModal(false);
          }}
        >
          <div className="withai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="withai-modal-header">
              <h3>AI 일정 생성 설정</h3>
              <button
                className="modal-close-btn"
                onClick={() => !isGenerating && setShowSettingsModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="withai-modal-body">
              <p className="modal-description">
                선택한 날짜의 Todo, 시간표, 캘린더 일정을 기반으로
                <br />
                하루 타임라인을 자동 생성합니다.
              </p>

              <div className="modal-time-row">
                <label className="modal-label">
                  하루 시작 시간
                  <input
                    type="time"
                    value={startTask.time}
                    onChange={(e) =>
                      setStartTask({ ...startTask, time: e.target.value })
                    }
                  />
                </label>
                <label className="modal-label">
                  하루 종료 시간
                  <input
                    type="time"
                    value={endTask.time}
                    onChange={(e) =>
                      setEndTask({ ...endTask, time: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="modal-summary">
                <div>
                  📌 Todo 개수: <strong>{todos.length}</strong>
                </div>
                <div>
                  📚 시간표: <strong>{timetable.length}</strong>개
                </div>
                <div>
                  📅 캘린더 이벤트: <strong>{events.length}</strong>개
                </div>
              </div>

              {isGenerating && (
                <div className="withai-generating">
                  <Loader2 className="spin" size={18} />
                  <span>AI가 일정을 생성 중입니다...</span>
                </div>
              )}
            </div>

            <div className="withai-modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => !isGenerating && setShowSettingsModal(false)}
                disabled={isGenerating}
              >
                닫기
              </button>
              <button
                className="modal-btn primary"
                onClick={generateAISchedule}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                <span>AI 일정 생성</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
