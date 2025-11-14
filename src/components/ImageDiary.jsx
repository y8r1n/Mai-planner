// ImageDiary.jsx
import React, { useState, useEffect } from "react";
import { quizAI } from "../services/api";
import { db } from "../services/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "../styles/ImageDiary.css";

export default function ImageDiary() {
  const [emotion, setEmotion] = useState("평온 🌿");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);

  const [modalImg, setModalImg] = useState(null); // 확대 이미지팝업

  // 🔥 Firestore 실시간 구독
  useEffect(() => {
    const q = collection(db, "imageDiary");

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔥 imageUrl 있는 데이터만 표시
      const filtered = data.filter((item) => item.imageUrl);

      setEntries(
        filtered.sort(
          (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
        )
      );
    });

    return () => unsub();
  }, []);

  // 🔥 이미지 생성 요청
  const handleCreate = async () => {
    if (!text.trim()) return alert("일기를 입력하세요!");
    setLoading(true);

    try {
      const res = await quizAI.post("/generate-image-diary", {
        emotion,
        diaryText: text,
        userId: "test-user", // 실제로는 auth uid 사용
      });

      console.log("AI 이미지 생성:", res.data);
      setText(""); // 입력창 초기화
    } catch (e) {
      console.error("이미지 생성 실패:", e);
      alert("AI 이미지 생성 실패!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="diary-page">
      <h2 className="title">🌤 AI 이미지 다이어리</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘의 기분과 하루를 기록해보세요 🌸"
      />

      <div className="diary-controls">
        <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
          <option>기쁨 😊</option>
          <option>슬픔 😢</option>
          <option>분노 😡</option>
          <option>평온 🌿</option>
          <option>설렘 💖</option>
        </select>

        <button onClick={handleCreate} disabled={loading}>
          {loading ? "이미지 생성 중..." : "다이어리 생성"}
        </button>
      </div>

      {/* 🔥 Masonry layout */}
      <div className="diary-gallery">
        {entries.map((entry) => (
          <div key={entry.id} className="diary-card fade-in">
            <img
              src={entry.imageUrl}
              alt="AI diary"
              className="diary-img"
              onClick={() => setModalImg(entry.imageUrl)}
            />

            <div className="diary-info">
              <span className="emotion-tag">{entry.emotion}</span>

             <p className="diary-text">{entry.diaryText}</p>

              <p className="diary-tags">
                #{entry.emotion.split(" ")[0]} #AI다이어리
              </p>

              <p className="diary-date">
                {entry.createdAt?.seconds &&
                  new Date(
                    entry.createdAt.seconds * 1000
                  ).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 모달 */}
      {modalImg && (
        <div className="modal" onClick={() => setModalImg(null)}>
          <img src={modalImg} className="modal-img" alt="" />
        </div>
      )}
    </div>
  );
}
