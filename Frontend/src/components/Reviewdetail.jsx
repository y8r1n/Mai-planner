import React, { useEffect, useState } from "react";
import { db, auth } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/reviewdetail.css";
import { quizAI } from "../services/api";

export default function ReviewDetail() {
  const { subjectId, weekId, noteId } = useParams();
  
  const userId = auth.currentUser?.uid || "test-user";

  const [note, setNote] = useState(null);
  const [flippedIndex, setFlippedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /* 🔹 Navbar 숨기기 */
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

  /* 🔹 오답노트 불러오기 */
  useEffect(() => {
    if (!subjectId || !weekId || !noteId) return;

    const fetchNote = async () => {
      try {
        const ref = doc(
          db,
          "users",
          userId,
          "subjects",
          subjectId,
          "weeks",
          weekId,
          "notes",
          noteId
        );

        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          // explanation 필드 안전 처리
          const safeWrongList = (data.wrongList || []).map((w) => ({
            ...w,
            explanation:
              typeof w.explanation === "string"
                ? w.explanation
                : "해설이 없습니다.",
          }));

          setNote({ ...data, wrongList: safeWrongList });
        }
      } catch (e) {
        console.error("🔥 오답노트 불러오기 실패:", e);
      }
    };

    fetchNote();
  }, [subjectId, weekId, noteId, userId]);

  /* 🔹 AI 해설 생성 */
  const generateExplanations = async () => {
    if (!note?.wrongList?.length) {
      alert("오답이 없습니다.");
      return;
    }

    setLoading(true);

    try {
      const res = await quizAI.post("/generate-explanations", {
        subjectName: note.subjectName,
        subjectId,
        weekId,
        questions: note.wrongList.map((w) => ({
          question: w.question,
          correctAnswer: w.correctAnswer,
          myAnswer: w.myAnswer,
        })),
        userAnswers: note.wrongList.map((w) => w.myAnswer),
      });

      if (!res.data?.success) {
        alert("해설 생성 실패 😢");
        return;
      }

      const expList = Array.isArray(res.data.explanations)
        ? res.data.explanations
        : [];

      const updated = note.wrongList.map((item, i) => ({
        ...item,
        explanation: expList[i]?.explanation || "해설이 없습니다.",
      }));

      // Firebase 업데이트
      await updateDoc(
        doc(
          db,
          "users",
          userId,
          "subjects",
          subjectId,
          "weeks",
          weekId,
          "notes",
          noteId
        ),
        { wrongList: updated }
      );

      setNote((prev) => ({
        ...prev,
        wrongList: updated,
      }));

      alert("해설 생성 완료!");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error("⌛ 해설 생성 오류:", err);
      alert("서버 오류 발생!");
    } finally {
      setLoading(false);
    }
  };

  /* 🔹 유사 문제 다시 풀기 */
  const handleRetry = () => {
    if (!note?.wrongList?.length)
      return alert("오답이 없습니다!");

    navigate(`/QuizAI/${subjectId}/${weekId}`);
  };

  if (!note) return <div className="loading-state">불러오는 중...</div>;

  return (
    <div className="review-detail-page">
      <header className="review-header">
        <button className="review-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="review-title">{note.quizTitle || "오답노트"}</h2>
      </header>

      <div className="review-actions">
        <button className="btn-primary" disabled={loading} onClick={generateExplanations}>
          {loading ? "해설 생성 중..." : "🤖 AI 해설 생성"}
        </button>
        <button className="btn-secondary" onClick={handleRetry}>
          🔄 비슷한 문제 다시 풀기
        </button>
      </div>

      <div className="wrongnote-container">
        {note.wrongList?.length > 0 ? (
          note.wrongList.map((item, idx) => {
            const flipped = flippedIndex === idx;
            return (
              <div
                key={idx}
                className={`flip-card ${flipped ? "flipped" : ""}`}
                onClick={() => setFlippedIndex(flipped ? null : idx)}
              >
                <div className="flip-card-inner">
                  
                  {/* 앞면 */}
                  <div className="flip-card-front">
                    <div className="wrong-header">
                      <span className="wrong-index">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="wrong-question">{item.question}</p>
                    </div>
                    <div className="wrong-content">
                      <p className="answer-row">
                        <strong>내 답:</strong>{" "}
                        <span className="my-answer">
                          {item.myAnswer !== null
                            ? String.fromCharCode(65 + item.myAnswer)
                            : "-"}
                        </span>
                      </p>
                      <p className="answer-row">
                        <strong>정답:</strong>{" "}
                        <span className="correct-answer">
                          {String.fromCharCode(65 + item.correctAnswer)}
                        </span>
                      </p>
                    </div>
                    <span className="hint">탭하면 뒤집힙니다</span>
                  </div>

                  {/* 뒷면 */}
                  <div className="flip-card-back">
                    <h4 className="explanation-title">📖 문제 해설</h4>
                    <p className="explanation-text">{item.explanation}</p>
                    <span className="hint">탭하면 돌아갑니다</span>
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <p className="no-wrong-data">저장된 오답이 없습니다.</p>
        )}
      </div>
    </div>
  );
}