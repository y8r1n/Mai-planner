import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/reviewdetail.css";
import { quizAI } from "../services/api";

export default function ReviewDetail() {
  const { subjectId, weekId, noteId } = useParams();
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
        const snap = await getDoc(
          doc(db, "subjects", subjectId, "weeks", weekId, "notes", noteId)
        );

        if (snap.exists()) {
          const data = snap.data();

          // 🎯 explanation이 없는 경우도 대비해 필드 생성
          const safeWrongList = (data.wrongList || []).map((w) => ({
            ...w,
            explanation:
              typeof w.explanation === "string"
                ? w.explanation
                : "해설이 없습니다.",
          }));

          setNote({ ...data, wrongList: safeWrongList });
          console.log("📘 불러온 노트:", safeWrongList);
        }
      } catch (e) {
        console.error("🔥 오답노트 불러오기 실패:", e);
      }
    };

    fetchNote();
  }, [subjectId, weekId, noteId]);

  /* 🔹 AI 해설 생성 */
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

    console.log("📦 API 응답:", res.data);

    if (!res.data?.success) {
      alert("해설 생성 실패 😢");
      return;
    }

    // 서버가 반환하는 [{ explanation: "..." }] 배열
    const expList = Array.isArray(res.data.explanations)
      ? res.data.explanations
      : [];

    // wrongList 에 explanation 붙이기
    const updated = note.wrongList.map((item, i) => ({
      ...item,
      explanation: expList[i]?.explanation || "해설이 없습니다.",
    }));

    // Firebase 저장
    await updateDoc(
      doc(db, "subjects", subjectId, "weeks", weekId, "notes", noteId),
      { wrongList: updated }
    );

    // 화면 즉시 갱신
    setNote((prev) => ({
      ...prev,
      wrongList: updated,
    }));

    alert("해설 생성 완료!");
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (err) {
    console.error("❌ 해설 생성 오류:", err);
    alert("서버 오류 발생!");
  } finally {
    setLoading(false);
  }
};
  /* 🔹 유사 문제 다시 풀기 */
  const handleRetry = () => {
    if (!note?.wrongList?.length) return alert("오답이 없습니다!");
    navigate(`/QuizAI/${subjectId}/${weekId}`);
  };

  if (!note) return <p className="loading">불러오는 중...</p>;

  return (
    <div className="review-detail-page">
      <header className="review-header">
        <button className="review-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="review-title">{note.quizTitle || "오답노트"}</h2>
      </header>

      <div className="wrongnote-actions">
        <button className="cta" disabled={loading} onClick={generateExplanations}>
          {loading ? "해설 생성 중..." : "AI 해설 생성"}
        </button>
        <button className="ghost" onClick={handleRetry}>
          비슷한 문제 다시 풀기
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
                      <p>
                        <strong>내 답:</strong>{" "}
                        {item.myAnswer !== null
                          ? String.fromCharCode(65 + item.myAnswer)
                          : "-"}
                      </p>
                      <p>
                        <strong>정답:</strong>{" "}
                        {String.fromCharCode(65 + item.correctAnswer)}
                      </p>
                    </div>
                    <span className="hint">(탭하면 돌아갑니다)</span>
                  </div>

                  {/* 뒷면 */}
                  <div className="flip-card-back">
                    <h4>문제 해설</h4>
                    <p>{item.explanation}</p>
                    <span className="hint">(탭하면 돌아갑니다)</span>
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
