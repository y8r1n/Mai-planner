// src/components/MentorChat.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../styles/mentorchat.css";
import { db } from "../services/firebase";
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
import { mentorChat } from "../services/api"; // ✅ 추가

export default function MentorChat() {
  const { subjectId, weekId } = useParams();
  const location = useLocation();
  const chatIdParam = new URLSearchParams(location.search).get("chat");
  const [subjectName, setSubjectName] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // ✅ 추가
  const [activeChatId, setActiveChatId] = useState(chatIdParam || null);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  

  // 🔹 NavBar 숨기기
  useEffect(() => {
    const nav =
      document.querySelector("#global-nav") ||
      document.querySelector(".app-navbar") ||
      document.querySelector("body > nav");
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  // 🔹 과목 이름 불러오기
  useEffect(() => {
    if (!subjectId) return;
    getDoc(doc(db, "subjects", subjectId)).then((snap) => {
      if (snap.exists()) setSubjectName(snap.data().name || "과목 이름");
    });
  }, [subjectId]);

  // 🔹 Firestore 주차별 경로
  const chatsCol = weekId
    ? collection(db, "subjects", subjectId, "weeks", weekId, "chats")
    : null;

  // 🔹 채팅 목록 실시간 반영
  useEffect(() => {
    if (!chatsCol) return;
    const unsub = onSnapshot(chatsCol, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setChatHistory(data);
    });
    return () => unsub();
  }, [chatsCol]);

  // 🔹 현재 채팅 실시간 반영
  useEffect(() => {
    if (!activeChatId) return;
    const chatRef = doc(db, "subjects", subjectId, "weeks", weekId, "chats", activeChatId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) setMessages(snap.data().messages || []);
    });
    return () => unsub();
  }, [subjectId, weekId, activeChatId]);

  // ✅ 새 메시지 전송 (OpenAI 연동)
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await mentorChat.post("/message", {
        messages: updatedMessages,
        subjectId, weekId, subjectName,
      });

      if (res.data?.success) {
        const reply = { role: "assistant", content: res.data.reply };
        const newMsgs = [...updatedMessages, reply];
        setMessages(newMsgs);

        // ✅ Firestore에 저장
        if (activeChatId) {
          await updateDoc(
            doc(db, "subjects", subjectId, "weeks", weekId, "chats", activeChatId),
            { messages: newMsgs, updatedAt: serverTimestamp() }
          );
        } else {
          const ref = await addDoc(chatsCol, {
            title: `멘토와의 대화`,
            messages: newMsgs,
            createdAt: serverTimestamp(),
          });
          setActiveChatId(ref.id);
        }
      } else {
        alert("응답을 받을 수 없어요. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("❌ MentorChat Error:", err);
      alert("서버 연결 실패!");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 대화 저장 (수동)
  const saveChat = async () => {
    if (messages.length === 0) return alert("저장할 대화가 없습니다!");
    if (!subjectId || !weekId) return alert("주차 정보가 없습니다.");
    if (!activeChatId) {
      const ref = await addDoc(chatsCol, {
        title: `${String(chatHistory.length + 1).padStart(2, "0")}번 대화`,
        messages,
        createdAt: serverTimestamp(),
      });
      setActiveChatId(ref.id);
      alert("✅ 새 대화로 저장되었습니다!");
    } else {
      await updateDoc(
        doc(db, "subjects", subjectId, "weeks", weekId, "chats", activeChatId),
        { messages, updatedAt: serverTimestamp() }
      );
      alert("✅ 대화가 업데이트되었습니다!");
    }
  };

  // 🔹 기존 대화 불러오기
  const loadChat = async (chatId) => {
    const ref = doc(db, "subjects", subjectId, "weeks", weekId, "chats", chatId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setMessages(snap.data().messages || []);
      setActiveChatId(chatId);
      setShowHistory(false);
    }
  };

  // 🔹 대화 삭제
  const deleteChat = async (chatId) => {
    if (!window.confirm("이 대화를 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "subjects", subjectId, "weeks", weekId, "chats", chatId));
    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  // 🔹 새 채팅 시작
  const startNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setShowHistory(false);
  };

  // 🔹 모달 외부 클릭 시 닫기
  useEffect(() => {
    if (!showHistory) return;
    const handleClickOutside = (e) => {
      const modal = document.querySelector(".chat-history-modal");
      if (modal && !modal.contains(e.target)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHistory]);

  // 🔹 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return (
    <div className="mentorchat-page">
      {/* 상단 헤더 */}
      <header className="mentorchat-header">
        <button className="mentorchat-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="mentorchat-subject-header">
          <button
            className="menu-btn"
            onClick={() => setShowHistory((p) => !p)}
          >
            ≡
          </button>
          <span className="subject-name">
            {subjectName}
          </span>
          <button className="save-btn" onClick={saveChat}>
            저장
          </button>
        </div>
      </header>

      {/* 대화 기록 모달 */}
      {showHistory && (
        <div className="chat-history-modal">
          <h4>채팅 기록</h4>
          {chatHistory.length === 0 ? (
            <p className="no-history">아직 대화 기록이 없습니다.</p>
          ) : (
            <div className="chat-history-list">
              {chatHistory.map((h) => (
                <div key={h.id} className="history-item-wrap">
                  <button className="history-item" onClick={() => loadChat(h.id)}>
                    {h.title}
                  </button>
                  <button
                    className="delete-chat-btn"
                    onClick={() => deleteChat(h.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="new-chat-btn" onClick={startNewChat}>
            현재 채팅에서 새 채팅
          </button>
        </div>
      )}

     {/* 채팅 영역 */}
<div className="chat-container">
  {messages.map((msg, index) => {
    // 새 구조(role/content) + 예전 구조(sender/text) 둘 다 지원
    const isUser = msg.role === "user" || msg.sender === "user";
    const text = msg.content ?? msg.text ?? "";

    return (
      <div
        key={index}
        className={`chat-bubble ${isUser ? "user" : "ai"}`}
      >
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
          placeholder="여기를 눌러 대화를 시작해 보세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="send-btn" onClick={sendMessage}>
          ↑
        </button>
      </div>
    </div>
  );
}
