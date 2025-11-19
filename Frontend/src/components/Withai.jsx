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

dayjs.locale("ko");
import { useAuthState } from "react-firebase-hooks/auth";

export default function Withai() {
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

  const [user, loading] = useAuthState(auth);

  // ⏳ 1) 로딩 중일 때 빈 화면 or 스피너만 보여주기
  if (loading) {
    return (
      <div className="withai-page withai-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  // 🚫 2) 유저 없으면 로그인 안내
  if (!user) {
    return (
      <div className="withai-page withai-center">
        <p>로그인이 필요합니다.</p>
      </div>
    );
  }

  // 🔥 3) 여기서부터 user가 보장됨
  const userId = user.uid;

  const today = dayjs();

  /* ----------------------------
      ⏰ 현재 시간 1분마다 갱신
  ----------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ----------------------------
      🔧 안전한 시간 문자열
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
      ⏱ 일정 상태 (완료/진행/미래)
  ----------------------------- */
  const getTimeStatus = (time, endTime = null) => {
    const taskTime = dayjs(`${selectedDate} ${safeTime(time)}`);
    const taskEndTime = endTime
      ? dayjs(`${selectedDate} ${safeTime(endTime)}`)
      : taskTime.add(1, "hour");

    // 날짜 다르면 전부 future 처리
    if (!currentTime.isSame(dayjs(selectedDate), "day")) {
      return "future";
    }

    if (currentTime.isBefore(taskTime)) return "future";
    if (currentTime.isAfter(taskEndTime)) return "completed";
    return "current";
  };

  /* ----------------------------
      📅 날짜 리스트 (7일 전 ~ 7일 후)
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
      🔔 로그인 안 되어 있으면 안내
  ----------------------------- */
  if (!userId) {
    return (
      <div className="withai-page">
        <div className="withai-empty" style={{ paddingTop: "120px" }}>
          <p>With AI 타임라인을 사용하려면 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  /* ----------------------------
      Firebase 구독 - 날짜별 Todo
  ----------------------------- */
  useEffect(() => {
    const qTodos = query(
      collection(db, "users", userId, "todos", selectedDate, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qTodos, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // WithAI에서는 미완료 Todo만 사용
      setTodos(data.filter((t) => !t.completed));
    });

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      Firebase 구독 - 요일별 Timetable
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
      Firebase 구독 - 날짜별 Events
  ----------------------------- */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users", userId, "calendar", "events"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(data.filter((e) => e.date === selectedDate));
      }
    );

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      Firebase 구독 - 타임라인 (calendar root)
  ----------------------------- */
  useEffect(() => {
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

  /* ----------------------------
      🧠 combinedTimeline
      (타임라인 + 시간표 + 이벤트)
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
        aiGenerated: false,
      });
    });

    events.forEach((e) => {
      base.push({
        id: `evt-${e.id}`,
        title: `📅 ${e.title}`,
        time: e.time || "00:00",
        end: e.end || "",
        fromEvent: true,
        aiGenerated: false,
      });
    });

    base.sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));
    return base;
  }, [timeline, timetable, events]);

  /* ----------------------------
      💬 일정 사이 공백 분석 → suggestions
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
        dayjs(
          `${selectedDate} ${safeTime(current.end || current.time || "00:00")}`
        ),
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
      📝 일정 추가/수정 저장
  ----------------------------- */
  const saveTask = async () => {
    if (!newTask.title.trim()) return;

    const data = {
      userId,
      title: newTask.title.trim(),
      time: safeTime(newTask.time || "09:00"),
      end: safeTime(newTask.end || newTask.time || "10:00"),
      date: selectedDate,
      aiGenerated: false,
      createdAt: new Date(),
    };

    try {
      if (isEditing && editId) {
        await updateDoc(fsDoc(db, "calendar", editId), data);
      } else {
        await addDoc(collection(db, "calendar"), data);
      }
      setNewTask({ title: "", time: "", end: "" });
      setIsEditing(false);
      setEditId(null);
      setShowTaskModal(false);
    } catch (err) {
      console.error("일정 저장 실패:", err);
      setError("일정 저장에 실패했습니다.");
    }
  };

  const openAddModal = () => {
    setNewTask({ title: "", time: "", end: "" });
    setIsEditing(false);
    setEditId(null);
    setShowTaskModal(true);
  };

  const editTask = (task) => {
    if (task.fromTimetable || task.fromEvent) return; // 외부 데이터 수정 X
    setNewTask({
      title: task.title,
      time: safeTime(task.time),
      end: safeTime(task.end || task.time),
    });
    setIsEditing(true);
    setEditId(task.id);
    setShowTaskModal(true);
  };

  const deleteTask = async (id) => {
    if (!window.confirm("일정을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(fsDoc(db, "calendar", id));
    } catch (err) {
      console.error("삭제 실패:", err);
      setError("일정 삭제에 실패했습니다.");
    }
  };

  /* ----------------------------
      🤖 AI 타임라인 생성
  ----------------------------- */
  const generateAISchedule = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 기존 AI 일정 삭제
      const qOld = query(
        collection(db, "calendar"),
        where("userId", "==", userId),
        where("date", "==", selectedDate),
        where("aiGenerated", "==", true)
      );
      const snapOld = await getDocs(qOld);
      const delPromises = snapOld.docs.map((s) =>
        deleteDoc(fsDoc(db, "calendar", s.id))
      );
      await Promise.all(delPromises);

      // AI API 호출
      const res = await withAI.post("/generate", {
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

      if (res.data?.success) {
        // 알림 저장 (루트 notifications)
        await addDoc(collection(db, "notifications"), {
          type: "ai_schedule",
          title: "AI 일정 생성 완료",
          message:
            res.data.summary || "AI가 최적화된 일정을 생성했습니다.",
          details: [
            `총 ${res.data.totalTasks || 0}개의 일정이 생성되었습니다.`,
          ],
          tab: "WITH AI",
          read: false,
          createdAt: new Date(),
          userId,
        });

        alert(
          `✅ ${
            res.data.totalTasks || 0
          }개의 AI 일정이 생성되었습니다! (캘린더 탭과 함께 확인해보세요)`
        );
        setShowSettingsModal(false);
      } else {
        setError("AI 일정 생성에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch (err) {
      console.error("AI 일정 생성 오류:", err);
      const msg =
        err.response?.data?.error ||
        "AI 일정 생성 중 오류가 발생했습니다. 서버 로그를 확인하세요.";
      setError(msg);
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  /* ----------------------------
      🤖 상단 AI 추천 텍스트
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

    fetchPlan();
  }, [selectedDate, userId, todos]);

  /* ----------------------------
      렌더링
  ----------------------------- */
  return (
    <div className="withai-page">
      {/* 헤더 타이틀 */}
      <div className="withai-header">
        <h2 className="withai-title">
          <span className="title-icon">✨</span>
          <span className="title-text">
            <span className="title-ai">AI 추천</span>
            <span className="title-timeline">TIME-LINE</span>
          </span>
        </h2>
      </div>

      {/* 상단 바 (AI 버튼 / 날짜 / 일정 추가) */}
      <div className="withai-topbar">
        {/* 왼쪽 : AI 일정 생성 (플레이 버튼 스타일) */}
        <button
          className="withai-playbtn"
          type="button"
          onClick={() => setShowSettingsModal(true)}
          title="AI 일정 생성"
        >
          <Sparkles size={22} />
        </button>

        {/* 가운데 : 날짜 표시 + 드롭다운 */}
        <button
          type="button"
          className="withai-date"
          onClick={() => setShowDropdown((p) => !p)}
        >
          {dayjs(selectedDate).format("M월 D일 (ddd)")}
        </button>

        {/* 오른쪽 : 수동 일정 추가 */}
        <button
          type="button"
          className="withai-addbtn"
          onClick={openAddModal}
        >
          + 일정 추가
        </button>

        {/* 날짜 드롭다운 */}
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

      {/* 에러 표시 */}
      {error && (
        <div className="withai-error-message">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* AI 추천 카드 */}
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
            <p>아직 등록된 일정이 없어요.</p>
            <p>상단의 AI 버튼 또는 [+ 일정 추가]를 사용해보세요.</p>
          </div>
        ) : (
          combinedTimeline.map((task) => {
            const status = getTimeStatus(task.time, task.end);
            const circleClass = [
              "withai-circle",
              status === "completed" ? "completed" : "",
              status === "current" ? "current" : "",
              status === "future" ? "future" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const itemClass = [
              "withai-item",
              task.aiGenerated ? "ai" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const gapAfter = suggestions.find((s) => s.after === task.id);

            return (
              <React.Fragment key={task.id}>
                <div className={itemClass}>
                  {/* 타임라인 동그라미 */}
                  <button
                    type="button"
                    className={circleClass}
                    onClick={() => editTask(task)}
                    disabled={task.fromTimetable || task.fromEvent}
                  />

                  {/* 내용 카드 */}
                  <div className="withai-content">
                    <h4>{task.title}</h4>

                    <div className="withai-time">
                      {safeTime(task.time)}
                      {task.end && ` ~ ${safeTime(task.end)}`}
                    </div>

                    {/* 출처 태그 */}
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {task.aiGenerated && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#ffeaf0",
                            color: "#d81b60",
                            marginRight: 6,
                          }}
                        >
                          AI
                        </span>
                      )}
                      {task.fromTimetable && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#e3f2fd",
                            color: "#1565c0",
                            marginRight: 6,
                          }}
                        >
                          시간표
                        </span>
                      )}
                      {task.fromEvent && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#e8f5e9",
                            color: "#2e7d32",
                          }}
                        >
                          캘린더
                        </span>
                      )}
                    </div>

                    {/* 편집/삭제 버튼 (직접 만든 일정만) */}
                    {!task.fromTimetable && !task.fromEvent && (
                      <div className="withai-editbtns">
                        <button type="button" onClick={() => editTask(task)} />
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* gap 안내 */}
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

      {/* 📌 일정 추가/수정 모달 (withai-task-modal) */}
      {showTaskModal && (
        <div
          className="withai-task-modal"
          onClick={() => {
            setShowTaskModal(false);
            setIsEditing(false);
            setEditId(null);
            setNewTask({ title: "", time: "", end: "" });
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
                  setNewTask({ title: "", time: "", end: "" });
                }}
              >
                ✕
              </button>
            </div>

            <div className="withai-task-form">
              <div className="withai-task-group">
                <label className="withai-task-label">제목</label>
                <input
                  className="withai-task-input"
                  type="text"
                  placeholder="일정 제목을 입력하세요"
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
                    className="withai-task-input withai-time-input"
                    type="time"
                    value={newTask.time}
                    onChange={(e) =>
                      setNewTask({ ...newTask, time: e.target.value })
                    }
                  />
                  <span className="withai-time-separator">~</span>
                  <input
                    className="withai-task-input withai-time-input"
                    type="time"
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
                  setNewTask({ title: "", time: "", end: "" });
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

      {/* ⚙️ AI 설정 모달 (withai-settings-modal) */}
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
                  className="withai-form-input"
                  type="time"
                  value={startTask.time}
                  onChange={(e) =>
                    setStartTask({ ...startTask, time: e.target.value })
                  }
                />
              </div>

              <div className="withai-form-group">
                <label className="withai-form-label">하루 종료 시간</label>
                <input
                  className="withai-form-input"
                  type="time"
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
                  <span className="withai-data-value">{timetable.length}개</span>
                </div>
                <div className="withai-data-item">
                  <span className="withai-data-label">캘린더 이벤트</span>
                  <span className="withai-data-value">{events.length}개</span>
                </div>
              </div>

              <div className="withai-warning">
                <span>⚠️</span>
                <span>
                  같은 날짜에 이미 생성된 AI 일정이 있다면
                  <br />
                  새로 생성하기 전에 기존 AI 일정은 삭제됩니다.
                </span>
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
                onClick={() => !isGenerating && setShowSettingsModal(false)}
                disabled={isGenerating}
              >
                닫기
              </button>
              <button
                type="button"
                className="withai-btn-generate"
                onClick={generateAISchedule}
                disabled={isGenerating}
              >
                {isGenerating && <span className="withai-loading-spinner" />}
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
