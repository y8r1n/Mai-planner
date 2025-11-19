// src/components/MentorChat.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../styles/mentorchat.css";
import { db, auth } from "../services/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { mentorChat } from "../services/api";

export default function MentorChat() {
  const { subjectId, weekId } = useParams();
  const location = useLocation();
  const chatIdParam = new URLSearchParams(location.search).get("chat");

  const userId = auth.currentUser?.uid || "test-user"; // ⭐ user 기반 구조 반영

  const [subjectName, setSubjectName] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatIdParam || null);

  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  /* -----------------------------------------
     🔥 NavBar 숨기기
  ------------------------------------------*/
  useEffect(() => {
    const nav = document.querySelector("#global-nav");
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  /* -----------------------------------------
     🔥 과목 이름 불러오기 (user 기반으로 수정)
  ------------------------------------------*/
  useEffect(() => {
    if (!subjectId) return;
    getDoc(doc(db, "users", userId, "subjects", subjectId)).then((snap) => {
      if (snap.exists()) setSubjectName(snap.data().name || "과목");
    });
  }, [subjectId, userId]);

  /* -----------------------------------------
     🔥 chats 컬렉션 경로
     users/{uid}/subjects/{id}/weeks/{weekId}/chats
  ------------------------------------------*/
  const chatsCol =
    userId && subjectId && weekId
      ? collection(
          db,
          "users",
          userId,
          "subjects",
          subjectId,
          "weeks",
          weekId,
          "chats"
        )
      : null;

  /* -----------------------------------------
     🔥 채팅 기록 불러오기
  ------------------------------------------*/
  useEffect(() => {
    if (!chatsCol) return;

    const unsub = onSnapshot(chatsCol, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      data.sort((a, b) => {
        const aT = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : a.createdAt || 0;
        const bT = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : b.createdAt || 0;
        return bT - aT;
      });

      setChatHistory(data);
    });

    return () => unsub();
  }, [chatsCol]);

  /* -----------------------------------------
     🔥 현재 채팅 메시지
  ------------------------------------------*/
  useEffect(() => {
    if (!activeChatId || !chatsCol) return;

    const chatRef = doc(
      db,
      "users",
      userId,
      "subjects",
      subjectId,
      "weeks",
      weekId,
      "chats",
      activeChatId
    );

    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        setMessages(snap.data().messages || []);
      }
    });

    return () => unsub();
  }, [activeChatId, userId, subjectId, weekId]);

  /* -----------------------------------------
     🔥 메시지 전송
  ------------------------------------------*/
  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!chatsCol) return alert("주차 정보가 없습니다!");

    const newMsg = { role: "user", content: input.trim() };
    const updated = [...messages, newMsg];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await mentorChat.post("/message", {
        messages: updated,
        subjectId,
        weekId,
        subjectName,
      });

      if (!res.data?.success) throw new Error("AI 응답 실패");

      const reply = { role: "assistant", content: res.data.reply };
      const newMsgs = [...updated, reply];
      setMessages(newMsgs);

      if (activeChatId) {
        await updateDoc(
          doc(
            db,
            "users",
            userId,
            "subjects",
            subjectId,
            "weeks",
            weekId,
            "chats",
            activeChatId
          ),
          { messages: newMsgs, updatedAt: serverTimestamp() }
        );
      } else {
        const ref = await addDoc(chatsCol, {
          title: `${String(chatHistory.length + 1).padStart(2, "0")}번 대화`,
          messages: newMsgs,
          createdAt: serverTimestamp(),
        });
        setActiveChatId(ref.id);
      }
    } catch (err) {
      console.error("MentorChat AI Error:", err);
      alert("AI 서버 연결 실패!");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------
     🔥 대화 저장
  ------------------------------------------*/
  const saveChat = async () => {
    if (messages.length === 0) return alert("저장할 대화가 없습니다!");
    if (!chatsCol) return alert("주차 정보가 없습니다!");

    if (!activeChatId) {
      const ref = await addDoc(chatsCol, {
        title: `${String(chatHistory.length + 1).padStart(2, "0")}번 대화`,
        messages,
        createdAt: serverTimestamp(),
      });
      setActiveChatId(ref.id);
      alert("새 대화로 저장되었습니다!");
    } else {
      await updateDoc(
        doc(
          db,
          "users",
          userId,
          "subjects",
          subjectId,
          "weeks",
          weekId,
          "chats",
          activeChatId
        ),
        { messages, updatedAt: serverTimestamp() }
      );
      alert("대화가 업데이트되었습니다!");
    }
  };

  /* -----------------------------------------
     🔥 기존 대화 불러오기
  ------------------------------------------*/
  const loadChat = async (chatId) => {
    const ref = doc(
      db,
      "users",
      userId,
      "subjects",
      subjectId,
      "weeks",
      weekId,
      "chats",
      chatId
    );
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setMessages(snap.data().messages || []);
      setActiveChatId(chatId);
      setShowHistory(false);
    }
  };

  /* -----------------------------------------
     🔥 대화 삭제
  ------------------------------------------*/
  const deleteChat = async (chatId) => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    await deleteDoc(
      doc(
        db,
        "users",
        userId,
        "subjects",
        subjectId,
        "weeks",
        weekId,
        "chats",
        chatId
      )
    );

    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  /* -----------------------------------------
     🔥 새로운 대화 시작
  ------------------------------------------*/
  const startNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setShowHistory(false);
  };

  /* -----------------------------------------
     🔥 모달 외부 클릭 시 닫기
  ------------------------------------------*/
  useEffect(() => {
    if (!showHistory) return;

    const handleClick = (e) => {
      const modal = document.querySelector(".chat-history-modal");
      if (modal && !modal.contains(e.target)) setShowHistory(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showHistory]);

  /* -----------------------------------------
     🔥 자동 스크롤
  ------------------------------------------*/
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mentorchat-page">
      {/* 헤더 */}
      <header className="mentorchat-header">
        <button className="mentorchat-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>

        <div className="mentorchat-subject-header">
          <button className="menu-btn" onClick={() => setShowHistory((p) => !p)}>
            ≡
          </button>
          <span className="subject-name">{subjectName}</span>
          <button className="save-btn" onClick={saveChat}>
            저장
          </button>
        </div>
      </header>

      {/* 기록 모달 */}
      {showHistory && (
        <div className="chat-history-modal">
          <h4>채팅 기록</h4>

          {chatHistory.length === 0 ? (
            <p className="no-history">기록 없음</p>
          ) : (
            <div className="chat-history-list">
              {chatHistory.map((h) => (
                <div key={h.id} className="history-item-wrap">
                  <button className="history-item" onClick={() => loadChat(h.id)}>
                    {h.title}
                  </button>
                  <button className="delete-chat-btn" onClick={() => deleteChat(h.id)}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          <button className="new-chat-btn" onClick={startNewChat}>
            새 채팅 시작
          </button>
        </div>
      )}

      {/* 메시지 */}
      <div className="chat-container">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const text = msg.content ?? msg.text ?? "";

          return (
            <div key={i} className={`chat-bubble ${isUser ? "user" : "ai"}`}>
              {text}
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>

      {/* 입력창 */}
      <div className="chat-input-box">
        <input
          type="text"
          placeholder="여기를 눌러 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="send-btn" onClick={sendMessage}>
          {loading ? "..." : "↑"}
        </button>
      </div>
    </div>
  );
}
