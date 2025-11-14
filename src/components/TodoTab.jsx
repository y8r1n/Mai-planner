import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/todotab.css"; 

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  const todosCollection = collection(db, "todos");

  const fetchTodos = async () => {
    const snapshot = await getDocs(todosCollection);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addDoc(todosCollection, { title: newTodo.trim(), completed: false });
    setNewTodo("");
    setAdding(false);
    fetchTodos();
  };

  const toggleTodo = async (todo) => {
    const ref = doc(db, "todos", todo.id);
    await updateDoc(ref, { completed: !todo.completed });
    fetchTodos();
  };

  const deleteTodo = async (id) => {
    const ref = doc(db, "todos", id);
    await deleteDoc(ref);
    fetchTodos();
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "completed") return todo.completed;
    if (filter === "active") return !todo.completed;
    return true;
  });

  // 드래그 관련
  const [startX, setStartX] = useState(null);
  const [offsetX, setOffsetX] = useState({});
  const [openDelete, setOpenDelete] = useState({});

  const startDrag = (id, clientX) => setStartX(clientX);
  const moveDrag = (id, clientX) => {
    if (startX === null) return;
    const diff = clientX - startX;
    if (diff < 0) {
      setOffsetX((prev) => ({ ...prev, [id]: Math.max(diff, -80) }));
    } else {
      setOffsetX((prev) => ({ ...prev, [id]: Math.min(diff, 0) }));
    }
  };
  const endDrag = (id) => {
    if (offsetX[id] < -50) {
      setOpenDelete((p) => ({ ...p, [id]: true }));
      setOffsetX((p) => ({ ...p, [id]: -80 }));
    } else {
      setOpenDelete((p) => ({ ...p, [id]: false }));
      setOffsetX((p) => ({ ...p, [id]: 0 }));
    }
    setStartX(null);
  };

  return (
    <div id="todo-page">
      <div className="todo-header">
        <h2>ToDo</h2>
        <button
          onClick={() => setAdding(!adding)}
          className="todo-add-btn"
        >
          ＋
        </button>
      </div>

      {/* 필터 */}
      <div className="todo-filter">
        {[
          { key: "all", label: "전체" },
          { key: "active", label: "미완료" },
          { key: "completed", label: "완료" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`filter-btn ${filter === btn.key ? "active" : ""}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 추가 입력 */}
      {adding && (
        <form onSubmit={addTodo} className="todo-input-box">
          <span className="circle" />
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="할 일 입력..."
          />
        </form>
      )}

      {/* 리스트 */}
      <div className="todo-list">
        {filteredTodos.map((todo) => (
          <div
            key={todo.id}
            className="todo-item-wrapper"
            onMouseDown={(e) => startDrag(todo.id, e.clientX)}
            onMouseMove={(e) => moveDrag(todo.id, e.clientX)}
            onMouseUp={() => endDrag(todo.id)}
            onTouchStart={(e) => startDrag(todo.id, e.touches[0].clientX)}
            onTouchMove={(e) => moveDrag(todo.id, e.touches[0].clientX)}
            onTouchEnd={() => endDrag(todo.id)}
          >
            <button
              onClick={() => deleteTodo(todo.id)}
              className={`delete-btn ${openDelete[todo.id] ? "show" : ""}`}
            >
              삭제
            </button>

            <div
              className={`todo-item ${todo.completed ? "done" : ""}`}
              style={{
                transform: `translateX(${offsetX[todo.id] || 0}px)`,
              }}
            >
              <span
                className={`check-circle ${todo.completed ? "checked" : ""}`}
                onClick={() => toggleTodo(todo)}
              />
              <span className="todo-title">{todo.title}</span>
            </div>
          </div>
        ))}

        {filteredTodos.length === 0 && (
          <p className="todo-empty">등록된 할 일이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
