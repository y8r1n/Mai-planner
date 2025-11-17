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
} from "firebase/firestore";
import { db } from "../services/firebase";
import { withAI } from "../services/api";
import { Edit3, Trash2 } from "lucide-react";

export default function WithAi() {
  const [timeline, setTimeline] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [aiPlan, setAiPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
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
  const [endTask, setEndTask] = useState({ title: "하루 마무리", time: "24:00" });

  // ✅ 안전한 시간 문자열
  const safeTime = (t) => {
    if (!t) return "00:00";
    if (t === "24:00") return "23:59";
    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return "00:00";
    const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
    const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // ✅ Firestore 데이터
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

  // ✅ 날짜 리스트 (드롭다운)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "calendar"), (snap) => {
      const dates = snap.docs.map((d) => d.data()?.date).filter(Boolean);
      setDateList([...new Set(dates)].sort().reverse());
    });
    return () => unsub();
  }, []);

  // ✅ 타임라인 통합
  const combinedTimeline = [
    ...timeline.map((t) => ({ ...t, type: "calendar", time: safeTime(t.time) })),
    ...timetable.map((t) => ({
      ...t,
      type: "timetable",
      time: safeTime(t.start),
      end: safeTime(t.end),
    })),
    ...events.map((e) => ({ ...e, type: "event", time: safeTime(e.time) })),
    ...todos.map((t) => ({ ...t, type: "todo", time: "00:00" })),
  ].sort((a, b) => safeTime(a.time).localeCompare(safeTime(b.time)));

  // ✅ 일정 저장/수정
  // ✅ 일정 저장/수정
const saveTask = async () => {
  if (!newTask.time) return;

  try {
    // 🔸 기상 / 마무리 편집
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

    // 🔸 컬렉션 맵핑
    const collectionMap = {
      calendar: "calendar",
      todo: "todos",
      event: "events",
      timetable: "timetable",
    };
    const targetCol = collectionMap[newTask.type] || "calendar";

    // 🔸 Firestore 수정/추가
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

  // ✅ 타입별 삭제
const handleDelete = async (item) => {
  try {
    const collectionMap = {
      calendar: "calendar",
      todo: "todos",
      event: "events",
      timetable: "timetable",
    };
    const targetCol = collectionMap[item.type] || "calendar";
    await deleteDoc(doc(db, targetCol, item.id));
  } catch (err) {
    console.error("삭제 실패:", err);
  }
};


  // ✅ Gap 계산
  
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
      diff >= 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;
    newSuggestions.push({
      id: `${current.id}-gap`,
      type: "gap",
      after: current.id,
      text: `💬 다음 일정까지 ${gapText} 남았어요 ☕`,
    });
  }
  setSuggestions(newSuggestions);
}, [selectedDate]);


 // 🔥 중복 호출 방지용 Ref
const aiFetching = useRef(false);

useEffect(() => {
  const fetchAIPlan = async () => {
    // ⛔ 이미 API 요청 중이면 또 호출 금지 (무한 루프 방지)
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
    } catch (err) {
      console.error("AI 추천 오류:", err);
      setAiPlan("오늘은 여유롭게 하루를 시작해보세요 ☕");
    } finally {
      // 0.3초 후 다시 요청 가능 — snapshot으로 인해 연속 호출되는 걸 차단
      setTimeout(() => {
        aiFetching.current = false;
      }, 300);
    }
  };

  fetchAIPlan();
}, [selectedDate]);


  // ✅ 렌더링
 return (
  <div className="withai-page flex flex-col items-center">
    <h2 className="withai-title text-gray-700 font-semibold mb-4 text-center">
      AI 추천 TIME-LINE
    </h2>

    {/* 상단 날짜/추가 */}
    <div className="withai-topbar flex items-center justify-between w-full max-w-md bg-white border border-pink-200 rounded-2xl p-3 mb-4 shadow-sm relative">
      <button className="withai-playbtn text-pink-300 text-base">▶</button>
      <span
        onClick={() => setShowDropdown((p) => !p)}
        className="withai-date cursor-pointer text-sm text-gray-600"
      >
        {dayjs(selectedDate).format("YYYY년 MM월 DD일 일정")}
      </span>
      <button
        className="withai-addbtn text-pink-400 text-sm font-medium hover:text-pink-500"
        onClick={() => {
          setShowModal(true);
          setIsEditing(false);
        }}
      >
        ✏️ 추가하기
      </button>

      {/* 날짜 드롭다운 */}
      <div
        className={
          "withai-dropdown absolute top-12 left-1/2 -translate-x-1/2 w-56 bg-white border border-pink-200 rounded-xl shadow-md z-20 " +
          (showDropdown ? "open" : "")
        }
      >
        <p
          onClick={() => {
            setSelectedDate(dayjs().format("YYYY-MM-DD"));
            setShowDropdown(false);
          }}
          className="text-center py-2 text-pink-500 font-semibold border-b border-pink-100 cursor-pointer hover:bg-pink-50"
        >
          📅 오늘로 돌아가기
        </p>
        {dateList.length > 0 ? (
          dateList.map((d) => (
            <p
              key={d}
              className="withai-dateitem text-center py-2 text-sm hover:bg-pink-50 cursor-pointer"
              onClick={() => {
                setSelectedDate(d);
                setShowDropdown(false);
              }}
            >
              {d}
            </p>
          ))
        ) : (
          <p className="text-center py-2 text-gray-400 text-sm">저장된 일정 없음</p>
        )}
      </div>
    </div>

    {/* AI 루틴 */}
    {aiPlan && (
      <div className="withai-aiplan-card w-full max-w-md mb-5">
        <h3>🌤️ AI가 제안하는 오늘의 루틴</h3>
        <p>{aiPlan}</p>
      </div>
    )}

    {/* 타임라인 */}
    <div className="withai-timeline">
      {/* 기상 */}
      <div className="withai-item">
        <div className="withai-circle"></div>
        <div className="withai-content">
          <h4>{startTask.title}</h4>
          <p className="withai-time">{startTask.time}</p>
        </div>
        <div className="withai-editbtns">
          <button
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
      </div>

      {/* 🔥 통합 일정 */}
{combinedTimeline.length ? (
  combinedTimeline.map((item) => (
    <React.Fragment key={item.id}>
      <div className="withai-item editable">
        <div className="withai-circle"></div>
        <div className="withai-content">
          <h4>{item.title}</h4>
          <p className="withai-time">
            {item.time}
            {item.end ? ` ~ ${item.end}` : ""}
          </p>
        </div>

        {/* ✏️🗑️ hover 시 표시 */}
        <div className="withai-editbtns">
          <button
            onClick={() => {
              setIsEditing(true);
              setEditId(item.id);
              setNewTask({
                title: item.title || "",
                time: item.time || "",
                end: item.end || "",
                type: item.type, // 타입 저장!
              });
              setShowModal(true);
            }}
          >
            <Edit3 size={15} strokeWidth={2} color="#e85a8c" />
          </button>
          <button onClick={() => handleDelete(item)}>
            <Trash2 size={15} strokeWidth={2} color="#e85a8c" />
          </button>
        </div>
      </div>

      {/* 🩷 gap 멘트 */}
      {suggestions
        .filter((s) => s.after === item.id)
        .map((s) => (
          <div key={s.id} className="withai-item ai">
            <div className="withai-circle ai"></div>
            <div className="withai-content bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-gray-500">{s.text}</p>
            </div>
          </div>
        ))}
    </React.Fragment>
  ))
) : (
  <p className="text-center text-gray-400 py-4">
    등록된 일정이 없습니다.
  </p>
)}


      {/* 하루 마무리 */}
      <div className="withai-item end">
        <div className="withai-circle"></div>
        <div className="withai-content">
          <h4>{endTask.title}</h4>
          <p className="withai-time">{endTask.time}</p>
        </div>
        <div className="withai-editbtns">
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
    </div>

    {/* 모달 */}
    {showModal && (
      <div className="withai-modal fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
        <div className="withai-modalbox bg-white p-6 rounded-2xl w-80 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transform transition-all scale-100">
          <h3 className="text-center mb-4 font-semibold text-pink-500 text-lg">
            {isEditing ? "✏️ 일정 수정" : "🗓️ 일정 추가"}
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
              className="w-full border border-pink-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-pink-300 outline-none"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={newTask.time}
                onChange={(e) =>
                  setNewTask({ ...newTask, time: e.target.value })
                }
                className="flex-1 border border-pink-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-pink-300 outline-none"
              />
              <input
                type="time"
                value={newTask.end}
                onChange={(e) =>
                  setNewTask({ ...newTask, end: e.target.value })
                }
                className="flex-1 border border-pink-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-pink-300 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition"
            >
              취소
            </button>
            <button
              onClick={saveTask}
              className="px-4 py-1.5 bg-pink-400 hover:bg-pink-500 text-white rounded-lg text-sm transition"
            >
              {isEditing ? "수정" : "추가"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}