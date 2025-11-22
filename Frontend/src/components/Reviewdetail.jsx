import React, { useEffect, useState } from "react";
import { db, auth } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/reviewdetail.css";

export default function ReviewDetail() {
  const { subjectId, weekId, noteId } = useParams();
  const userId = auth.currentUser?.uid || "test-user";

  const [note, setNote] = useState(null);
  const [flippedIndex, setFlippedIndex] = useState(null);
  const navigate = useNavigate();

  /* 🔹 Navbar 숨기기 */
  useEffect(() => {
    const nav =
      document.querySelector("#global-nav") ||
      document.querySelector(".app-navbar") ||
      document.querySelector("body > nav");

    if (nav) nav.style.display = "none";
    return () => { if (nav) nav.style.display = ""; };
  }, []);

  /* 🔹 오답노트 불러오기 */
  useEffect(() => {
    const fetchNote = async () => {
      const ref = doc(
        db,
        "users", userId,
        "subjects", subjectId,
        "weeks", weekId,
        "notes", noteId
      );

      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();

      const safeList = (data.wrongList || []).map((w) => ({
        ...w,
        explanation:
          typeof w.explanation === "string" && w.explanation.trim() !== ""
            ? w.explanation
            : "해설이 없습니다.",
      }));

      setNote({ ...data, wrongList: safeList });
    };

    fetchNote();
  }, [subjectId, weekId, noteId, userId]);

  const handleRetry = () => navigate(`/QuizAI/${subjectId}/${weekId}`);

  if (!note) return <div className="loading-state">불러오는 중...</div>;

  return (
    <div className="review-detail-page">
      <header className="review-header">
        <button className="review-back-btn" onClick={() => navigate(-1)}>←</button>
        <h2 className="review-title">{note.quizTitle}</h2>
      </header>

      <div className="review-actions">
        <button className="btn-secondary" onClick={handleRetry}>
          🔄 비슷한 문제 다시 풀기
        </button>
      </div>

      <div className="wrongnote-container">
        {note.wrongList.map((item, idx) => {
          const flipped = flippedIndex === idx;
          return (
            <div
              key={idx}
              className={`flip-card ${flipped ? "flipped" : ""}`}
              onClick={() => setFlippedIndex(flipped ? null : idx)}
            >
              <div className="flip-card-inner">

                <div className="flip-card-front">
                  <span className="wrong-index">{String(idx + 1).padStart(2, "0")}</span>
                  <p className="wrong-question">{item.question}</p>

                 <p className="answer-row">
  <strong>내 답:</strong>
  <span className="my-answer">
    {String.fromCharCode(65 + item.myAnswer)}
  </span>
</p>

<p className="answer-row">
  <strong>정답:</strong>
  <span className="correct-answer">
    {String.fromCharCode(65 + item.correctAnswer)}
  </span>
</p>

                  <span className="hint">탭하면 뒤집힙니다</span>
                </div>

                <div className="flip-card-back">
                  <h4 className="explanation-title">📖 문제 해설</h4>
                  <p className="explanation-text">{item.explanation}</p>
                  <span className="hint">탭하면 돌아갑니다</span>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
