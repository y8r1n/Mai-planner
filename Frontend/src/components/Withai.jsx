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

/* ---------------------------------------
   🏷 카테고리 프리셋
---------------------------------------- */
const CATEGORY_PRESETS = [
  { key: "leisure", label: "여가", emoji: "🧸" },
  { key: "study", label: "공부", emoji: "📚" },
  { key: "workout", label: "운동", emoji: "💪" },
  { key: "meal", label: "식사", emoji: "🍽️" },
  { key: "selfdev", label: "자기계발", emoji: "✨" },
  { key: "etc", label: "기타", emoji: "🗂️" },
];

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
  const [timeline, setTimeline] = useState([]);      // 순수 타임라인 일정
  const [todos, setTodos] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [events, setEvents] = useState([]);          // fromEvent 등 외부/AI 일정

  const [suggestions, setSuggestions] = useState([]);
  const [aiPlan, setAiPlan] = useState(null);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [dateList, setDateList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    time: "",
    end: "",
    category: "",        // preset key 또는 "custom" 또는 ""
    customCategory: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [startTask, setStartTask] = useState({ title: "기상", time: "07:00" });
  const [endTask, setEndTask] = useState({
    title: "하루 마무리",
    time: "23:00",
  });

  const [currentTime, setCurrentTime] = useState(dayjs());
  const aiFetching = useRef(false);

  /* ----------------------------
      현재 시간 업데이트
  ----------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ----------------------------
      safeTime 변환
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
      날짜 목록 생성
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
      Todos 구독
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
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayStr = days[dayjs(selectedDate).day()];
        setTimetable(data.filter((t) => t.day === dayStr));
      }
    );
    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      CalendarEvents 구독
  ----------------------------- */
  useEffect(() => {
    const q = query(
      collection(db, "calendarEvents"),
      where("userId", "==", userId),
      where("date", "==", selectedDate)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 순수 타임라인 (직접 + AI 일정) : fromTimetable/fromEvent 없는 애들
      const pureTimeline = data.filter(
        (e) => !e.fromTimetable && !e.fromEvent
      );

      // 외부/연동/AI 전용 이벤트 (fromEvent === true 등)
      const externalEvents = data.filter((e) => e.fromEvent);

      setTimeline(pureTimeline);
      setEvents(externalEvents);
    });

    return () => unsub();
  }, [selectedDate, userId]);

  /* ----------------------------
      Combined Timeline
  ----------------------------- */
  const combinedTimeline = useMemo(() => {
    // 1) 순수 타임라인 복사
    const base = timeline.map((t) => ({ ...t }));

    // 2) 주간 시간표
    timetable.forEach((t) =>
      base.push({
        id: `tt-${t.id}`,
        title: `📚 ${t.title}`,
        time: t.start,
        end: t.end,
        fromTimetable: true,
      })
    );

    // 3) 외부/AI 이벤트 (fromEvent)
    events.forEach((e) =>
      base.push({
        ...e,
        id: `evt-${e.id}`,
        fromEvent: true,
      })
    );

    base.sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));
    return base;
  }, [timeline, timetable, events]);

  /* ----------------------------
      일정 간 공백 계산 → 추천 문구
  ----------------------------- */
  useEffect(() => {
    const tasks = [
      { id: "start", title: startTask.title, end: safeTime(startTask.time) },
      ...combinedTimeline,
      { id: "end", title: endTask.title, time: safeTime(endTask.time) },
    ];

    const newSug = [];

    for (let i = 0; i < tasks.length - 1; i++) {
      const current = tasks[i];
      const next = tasks[i + 1];

      const diff = dayjs(`${selectedDate} ${safeTime(next.time)}`).diff(
        dayjs(`${selectedDate} ${safeTime(current.end || current.time)}`),
        "minute"
      );

      if (diff < 10) continue;

      const gap =
        diff >= 60
          ? `${Math.floor(diff / 60)}시간 ${diff % 60}분`
          : `${diff}분`;

      newSug.push({
        id: `${current.id}-gap`,
        after: current.id,
        text: `💬 다음 일정까지 ${gap} 남았어요 ☕`,
      });
    }

    setSuggestions(newSug);
  }, [combinedTimeline, selectedDate, startTask, endTask]);

  /* ----------------------------
      일정 저장 / 수정 (+중복 방지 & 카테고리)
  ----------------------------- */
  const saveTask = async () => {
    if (!newTask.title.trim()) return;

    // 카테고리 해석
    const preset = CATEGORY_PRESETS.find(
      (c) => c.key === newTask.category
    );

    let categoryKey = "";
    let categoryLabel = "";
    let categoryEmoji = "";

    if (preset) {
      categoryKey = preset.key;
      categoryLabel = preset.label;
      categoryEmoji = preset.emoji;
    } else if (
      newTask.category === "custom" &&
      newTask.customCategory.trim()
    ) {
      categoryKey = "custom";
      categoryLabel = newTask.customCategory.trim();
      categoryEmoji = "";
    }

    const data = {
      userId,
      title: newTask.title.trim(),
      time: safeTime(newTask.time),
      end: safeTime(newTask.end),
      date: selectedDate,
      aiGenerated: false,
      categoryKey,
      categoryLabel,
      categoryEmoji,
      createdAt: new Date(),
    };

    try {
      if (isEditing && editId) {
        // 수정
        await updateDoc(fsDoc(db, "calendarEvents", editId), data);
      } else {
        // 추가 - 중복 방지 (같은 날짜 + 같은 시간 + 같은 제목)
        const dupQ = query(
          collection(db, "calendarEvents"),
          where("userId", "==", userId),
          where("date", "==", selectedDate),
          where("time", "==", data.time),
          where("title", "==", data.title)
        );
        const dupSnap = await getDocs(dupQ);
        if (!dupSnap.empty) {
          alert("같은 시간, 같은 제목의 일정이 이미 있어요.");
          return;
        }

        await addDoc(collection(db, "calendarEvents"), data);
      }
    } catch (e) {
      console.error(e);
      setError("일정 저장 실패");
    }

    setShowTaskModal(false);
    setNewTask({
      title: "",
      time: "",
      end: "",
      category: "",
      customCategory: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  /* ----------------------------
      일정 삭제
  ----------------------------- */
  const deleteTask = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      await deleteDoc(fsDoc(db, "calendarEvents", id));
    } catch (e) {
      console.error(e);
    }
  };

  /* ----------------------------
      AI 추천 문구 fetch
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
        } else setAiPlan("오늘은 가볍게 보내보세요 ☕");
      } catch (e) {
        console.error(e);
        setAiPlan("오늘은 가볍게 보내보세요 ☕");
      }

      setTimeout(() => {
        aiFetching.current = false;
      }, 600);
    };

    fetchPlan();
  }, [selectedDate, userId, todos]);

  /* ----------------------------
      AI 일정 생성
  ----------------------------- */
  const generateAISchedule = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const qOld = query(
        collection(db, "calendarEvents"),
        where("userId", "==", userId),
        where("date", "==", selectedDate),
        where("aiGenerated", "==", true)
      );

      const oldDocs = await getDocs(qOld);
      await Promise.all(oldDocs.docs.map((d) => deleteDoc(d.ref)));

      await withAI.post("/generate", {
        userId,
        selectedDate,
        startTime: startTask.time,
        endTime: endTask.time,
        todos,
        timetable,
        events,
      });

      alert("AI 일정 생성 완료!");
      setShowSettingsModal(false);
    } catch (e) {
      console.error(e);
      setError("AI 일정 생성 실패");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ----------------------------
      RENDER
  ----------------------------- */
  return (
    <div className="withai-page">
      {/* HEADER */}
      <div className="withai-header">
        <h2 className="withai-title">
          <span className="title-icon">✨</span>
          <span className="title-text">
            <span className="title-ai">AI 추천</span>
            <span className="title-timeline">TIME-LINE</span>
          </span>
        </h2>
      </div>

      {/* TOP BAR */}
      <div className="withai-topbar">
        {/* AI 설정 */}
        <button
          className="withai-playbtn"
          onClick={() => setShowSettingsModal(true)}
        >
          <Sparkles size={22} />
        </button>

        {/* 날짜 */}
        <button
          className="withai-date"
          onClick={() => setShowDropdown((p) => !p)}
        >
          {dayjs(selectedDate).format("M월 D일 (ddd)")}
        </button>

        {/* 일정추가 */}
        <button
          className="withai-addbtn"
          onClick={() => {
            setNewTask({
              title: "",
              time: "",
              end: "",
              category: "",
              customCategory: "",
            });
            setIsEditing(false);
            setShowTaskModal(true);
          }}
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

      {/* ERROR */}
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

      {/* TIMELINE */}
      <div className="withai-timeline">
        {/* =============== 기상 =============== */}
        {(() => {
          const start = dayjs(`${selectedDate} ${safeTime(startTask.time)}`);

          let status = "future";
          if (currentTime.isSame(dayjs(selectedDate), "day")) {
            if (currentTime.isAfter(start)) status = "completed";
            if (currentTime.isSame(start, "minute")) status = "current";
          }

          const cls = ["withai-circle", status].join(" ");

          return (
            <div className="withai-item">
              <button className={cls} disabled />
              <div className="withai-content">
                <h4>{startTask.title}</h4>
                <div className="withai-time">{safeTime(startTask.time)}</div>
              </div>
            </div>
          );
        })()}

        {/* =============== 일정 리스트 =============== */}
        {combinedTimeline.length === 0 ? (
          <div className="withai-empty">
            <p>등록된 일정이 없습니다.</p>
            <p>AI 버튼 또는 [+ 일정 추가]를 사용해보세요.</p>
          </div>
        ) : (
          combinedTimeline.map((task) => {
            // 시간 상태 계산
            const status = (() => {
              const s = dayjs(`${selectedDate} ${safeTime(task.time)}`);
              const e = dayjs(`${selectedDate} ${safeTime(task.end)}`);

              if (!currentTime.isSame(dayjs(selectedDate), "day"))
                return "future";
              if (currentTime.isBefore(s)) return "future";
              if (currentTime.isAfter(e)) return "completed";
              return "current";
            })();

            const cls = ["withai-circle", status].join(" ");

            // 갭 메시지
            const gap = suggestions.find((s) => s.after === task.id);

            const editable = !task.fromTimetable && !task.fromEvent;

            return (
              <React.Fragment key={task.id}>
                <div className="withai-item">
                  {/* 동그라미 */}
                  <button
                    className={cls}
                    disabled={!editable}
                    onClick={() => {
                      if (!editable) return;

                      const preset = CATEGORY_PRESETS.find(
                        (c) =>
                          c.key === task.categoryKey ||
                          c.label === task.categoryLabel
                      );

                      setIsEditing(true);
                      setEditId(task.id);
                      setNewTask({
                        title: task.title,
                        time: safeTime(task.time),
                        end: safeTime(task.end),
                        category: preset
                          ? preset.key
                          : task.categoryKey === "custom" ||
                            (!preset && task.categoryLabel)
                          ? "custom"
                          : "",
                        customCategory:
                          !preset && task.categoryLabel
                            ? task.categoryLabel
                            : "",
                      });
                      setShowTaskModal(true);
                    }}
                  />

                  {/* 내용 */}
                  <div className="withai-content">
                    <h4>{task.title}</h4>
                    <div className="withai-time">
                      {safeTime(task.time)} ~ {safeTime(task.end)}
                    </div>

                    {/* 태그/카테고리 영역 */}
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {task.fromTimetable && (
                        <span className="tag timetable">시간표</span>
                      )}

                      {(task.categoryLabel || task.categoryEmoji) && (
                        <span className="category-pill-view">
                          {task.categoryEmoji && (
                            <span className="category-emoji">
                              {task.categoryEmoji}
                            </span>
                          )}
                          <span>{task.categoryLabel}</span>
                        </span>
                      )}
                    </div>

                    {/* ✏️ 수정 / 🗑 삭제 버튼 — 호버시 나타남 */}
                    {editable && (
                      <div className="withai-editbtns">
                        <button
                          type="button"
                          onClick={() => {
                            const preset = CATEGORY_PRESETS.find(
                              (c) =>
                                c.key === task.categoryKey ||
                                c.label === task.categoryLabel
                            );

                            setIsEditing(true);
                            setEditId(task.id);
                            setNewTask({
                              title: task.title,
                              time: safeTime(task.time),
                              end: safeTime(task.end),
                              category: preset
                                ? preset.key
                                : task.categoryKey === "custom" ||
                                  (!preset && task.categoryLabel)
                                ? "custom"
                                : "",
                              customCategory:
                                !preset && task.categoryLabel
                                  ? task.categoryLabel
                                  : "",
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

                {/* 갭 메시지 */}
                {gap && (
                  <div
                    className="gap-suggestion"
                    style={{
                      marginLeft: 52,
                      marginBottom: 16,
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    {gap.text}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}

        {/* =============== 하루 마무리 =============== */}
        {(() => {
          const end = dayjs(`${selectedDate} ${safeTime(endTask.time)}`);

          let status = "future";
          if (currentTime.isSame(dayjs(selectedDate), "day")) {
            if (currentTime.isAfter(end)) status = "completed";
            if (currentTime.isSame(end, "minute")) status = "current";
          }

          const cls = ["withai-circle", status].join(" ");

          return (
            <div className="withai-item">
              <button className={cls} disabled />
              <div className="withai-content">
                <h4>{endTask.title}</h4>
                <div className="withai-time">{safeTime(endTask.time)}</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* =============== 일정 추가/수정 모달 =============== */}
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

              {/* 카테고리 */}
              <div className="withai-task-group">
                <label className="withai-task-label">카테고리</label>

                <div className="category-row">
                  {CATEGORY_PRESETS.map((cat) => (
                    <div
                      key={cat.key}
                      className={`category-pill ${
                        newTask.category === cat.key ? "active" : ""
                      }`}
                      onClick={() =>
                        setNewTask({
                          ...newTask,
                          category: cat.key,
                          customCategory: "",
                        })
                      }
                    >
                      <span className="emoji">{cat.emoji}</span>
                      {cat.label}
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  className="withai-task-input"
                  placeholder="직접 카테고리 입력 (선택)"
                  value={newTask.category === "custom"
                    ? newTask.customCategory
                    : ""}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      category: "custom",
                      customCategory: e.target.value,
                    })
                  }
                />
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

      {/* =============== AI 설정 모달 =============== */}
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
                  <span className="withai-data-value">{events.length}개</span>
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
                onClick={() => !isGenerating && setShowSettingsModal(false)}
              >
                닫기
              </button>

              <button
                type="button"
                className="withai-btn-generate"
                disabled={isGenerating}
                onClick={generateAISchedule}
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
