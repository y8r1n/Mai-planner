// src/components/TodoTab.jsx
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../services/firebase";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import "../styles/todotab.css";

dayjs.locale("ko");

export default function TodoTab() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dateTodos, setDateTodos] = useState([]);
  const [generalTodos, setGeneralTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("date");

  // 로그인된 유저 ID
  const userId = auth.currentUser?.uid;

  if (!userId) {
    return (
      <div style={{ padding: "80px 20px" }}>
        <h3>로그인이 필요합니다.</h3>
      </div>
    );
  }

  /* 📌 날짜별 Todo 실시간 구독 */
  useEffect(() => {
    if (viewMode !== "date") return;

    const dateStr = selectedDate.format("YYYY-MM-DD");

    const q = query(
      collection(db, "users", userId, "todos", dateStr, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDateTodos(data);
    });

    return () => unsub();
  }, [userId, selectedDate, viewMode]);

  /* 📌 일반 Todo 실시간 구독 */
  useEffect(() => {
    if (viewMode !== "general") return;

    const q = query(
      collection(db, "users", userId, "todos", "general", "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGeneralTodos(data);
    });

    return () => unsub();
  }, [userId, viewMode]);

  /* ➕ Todo 추가 */
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todo = {
      title: newTodo.trim(),
      completed: false,
      createdAt: new Date(),
    };

    const dateStr = selectedDate.format("YYYY-MM-DD");

    try {
      const path =
        viewMode === "date"
          ? collection(db, "users", userId, "todos", dateStr, "tasks")
          : collection(db, "users", userId, "todos", "general", "tasks");

      await addDoc(path, todo);
      setNewTodo("");
      setAdding(false);
    } catch (err) {
      console.error("Todo 추가 실패:", err);
    }
  };

  /* ✔ 완료 토글 */
  const toggleTodo = async (todo) => {
    const base =
      viewMode === "date"
        ? `users/${userId}/todos/${selectedDate.format("YYYY-MM-DD")}/tasks`
        : `users/${userId}/todos/general/tasks`;

    await updateDoc(doc(db, base, todo.id), {
      completed: !todo.completed,
    });
  };

  /* 🗑 삭제 */
  const deleteTodo = async (todo) => {
    const base =
      viewMode === "date"
        ? `users/${userId}/todos/${selectedDate.format("YYYY-MM-DD")}/tasks`
        : `users/${userId}/todos/general/tasks`;

    await deleteDoc(doc(db, base, todo.id));
  };

  /* 📌 필터 적용 */
  const currentTodos = viewMode === "date" ? dateTodos : generalTodos;
  const filteredTodos = currentTodos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  return (
    <div id="todo-page">
      {/* 헤더 */}
      <div className="todo-header">
        <h2>ToDo</h2>
        <button onClick={() => setAdding(!adding)} className="todo-add-btn">
          <Plus size={20} />
        </button>
      </div>

      {/* 날짜/일반 모드 */}
      <div className="view-mode-switch">
        <button
          className={`mode-btn ${viewMode === "date" ? "active" : ""}`}
          onClick={() => setViewMode("date")}
        >
          <Calendar size={16} /> 날짜별
        </button>
        <button
          className={`mode-btn ${viewMode === "general" ? "active" : ""}`}
          onClick={() => setViewMode("general")}
        >
          일반 목록
        </button>
      </div>

      {/* 날짜 선택 */}
      {viewMode === "date" && (
        <div className="date-selector">
          <button onClick={() => setSelectedDate((p) => p.subtract(1, "day"))}>
            <ChevronLeft size={20} />
          </button>

          <div>
            <div className="date-main">{selectedDate.format("M월 D일")}</div>
            <div className="date-sub">{selectedDate.format("dddd")}</div>
          </div>

          <button onClick={() => setSelectedDate((p) => p.add(1, "day"))}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* 필터 */}
      <div className="todo-filter">
        {["all", "active", "completed"].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`filter-btn ${filter === key ? "active" : ""}`}
          >
            {key === "all" ? "전체" : key === "active" ? "미완료" : "완료"}
          </button>
        ))}
      </div>

      {/* 입력창 */}
      {adding && (
        <form onSubmit={addTodo} className="todo-input-box">
          <span className="circle" />
          <input
            autoFocus
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="할 일 입력..."
          />
          <button type="submit" className="submit-btn">
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="cancel-btn"
          >
            <X size={18} />
          </button>
        </form>
      )}

      {/* 리스트 */}
      <div className="todo-list">
        {filteredTodos.length === 0 && <p className="todo-empty">등록된 할 일이 없습니다.</p>}

        {filteredTodos.map((todo) => (
          <div key={todo.id} className="todo-item-wrapper">
            <button className="delete-btn" onClick={() => deleteTodo(todo)}>
              삭제
            </button>

            <div
              className={`todo-item ${todo.completed ? "done" : ""}`}
              onClick={() => toggleTodo(todo)}
            >
              <span className="check-circle" />
              <span className="todo-title">{todo.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
