import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, auth } from "../services/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import "../styles/quizai.css";
import { quizAI } from "../services/api";

export default function QuizAI() {
  const navigate = useNavigate();
  const { subjectId, weekId } = useParams();

  const userId = auth.currentUser?.uid || "test-user"; // ⭐ user 구조 반영

  const [subjectName, setSubjectName] = useState("과목 이름");
  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [noteId, setNoteId] = useState(null);

  /* ------------------ NavBar 숨기기 ------------------ */
  useEffect(() => {
    const globalNav =
      document.querySelector("#global-nav") ||
      document.querySelector(".app-navbar") ||
      document.querySelector("body > nav");

    if (globalNav) globalNav.style.display = "none";
    return () => {
      if (globalNav) globalNav.style.display = "";
    };
  }, []);

  /* ------------------ 과목 이름 불러오기 (user 기반) ------------------ */
  useEffect(() => {
    if (!subjectId) return;

    const ref = doc(db, "users", userId, "subjects", subjectId);
    getDoc(ref).then((s) => {
      if (s.exists()) setSubjectName(s.data().name || "과목 이름");
    });
  }, [subjectId, userId]);

  /* ------------------ 점수 계산 ------------------ */
  const score = useMemo(() => {
    if (!questions.length) return 0;
    return answers.reduce(
      (acc, v, i) => (v === questions[i]?.answer ? acc + 1 : acc),
      0
    );
  }, [answers, questions]);

  /* ------------------ 오답노트 생성 (user 기반) ------------------ */
  const createWrongNote = async (wrongList) => {
    try {
      const notesRef = collection(
        db,
        "users",
        userId,
        "subjects",
        subjectId,
        "weeks",
        weekId,
        "notes"
      );

      const existing = await getDocs(notesRef);
      const nextIndex = existing.size + 1;

      const noteRef = await addDoc(notesRef, {
        quizTitle: `${String(nextIndex).padStart(2, "0")} 연습문제 오답노트`,
        subjectName,
        wrongList,
        createdAt: serverTimestamp(),
      });

      return noteRef.id;
    } catch (e) {
      console.error("🔥 오답노트 저장 실패:", e);
      return null;
    }
  };

  /* ------------------ 문제 생성 ------------------ */
  const startQuiz = async () => {
    setLoading(true);

    try {
      const res = await quizAI.post("/generate-quiz", {
        subjectName,
        subjectId,
        weekId,
        count: 5,
      });

      const raw = res.data?.questions;

      const qList =
        (Array.isArray(raw) && raw) ||
        (Array.isArray(raw?.questions) && raw.questions) ||
        (Array.isArray(raw?.data) && raw.data) ||
        (Array.isArray(res.data) && res.data) ||
        [];

      if (!res.data?.success || qList.length === 0) {
        alert("문제 생성에 실패했습니다. 😢");
        return;
      }

      // ---- 문제 포맷 통일 ----
      const formatted = qList.map((q, idx) => {
        const options =
          q.options ||
          q.choices ||
          q.보기 ||
          q.선택지 ||
          [];

        const rawAnswer =
          q.answer ??
          q.correct ??
          q.correctAnswer ??
          q.정답 ??
          null;

        let correctIndex = null;

        if (typeof rawAnswer === "number") {
          correctIndex = rawAnswer;
        } else if (typeof rawAnswer === "string") {
          correctIndex = options.indexOf(rawAnswer);
        }

        if (correctIndex === -1 || correctIndex === null) correctIndex = 0;

        return {
          id: q.id || idx,
          question: q.question || "",
          options,
          answer: correctIndex,
        };
      });

      setQuestions(formatted);
      setAnswers(Array(formatted.length).fill(null));
      setIdx(0);
      setPhase("quiz");
    } catch (e) {
      alert("문제 생성 중 오류 발생!");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ 선택 ------------------ */
  const choose = (optIdx) => {
    const next = [...answers];
    next[idx] = optIdx;
    setAnswers(next);
  };

  /* ------------------ 페이지 이동 ------------------ */
  const next = () => setIdx((p) => Math.min(p + 1, questions.length - 1));
  const prev = () => setIdx((p) => Math.max(p - 1, 0));

  /* ------------------ 퀴즈 종료 + 저장 ------------------ */
  const finish = async () => {
    const wrongList = questions
      .map((q, i) => ({
        question: q.question,
        myAnswer: answers[i],
        correctAnswer: q.answer,
      }))
      .filter((w) => w.myAnswer !== w.correctAnswer);

    try {
      // ⭐ 퀴즈 저장 (user 기반)
      await addDoc(
        collection(
          db,
          "users",
          userId,
          "subjects",
          subjectId,
          "weeks",
          weekId,
          "quizzes"
        ),
        {
          subjectName,
          score,
          total: questions.length,
          wrongList,
          createdAt: serverTimestamp(),
        }
      );

      if (wrongList.length > 0) {
        const noteRefId = await createWrongNote(wrongList);
        setNoteId(noteRefId);
      }
    } catch (e) {
      console.error("🔥 저장 실패:", e);
    }

    setPhase("result");
  };

  /* ------------------ 화면 렌더링 ------------------ */
  if (phase === "intro") {
    return (
      <div className="quiz-page">
        <button className="back" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="intro-card">
          <h2 className="subject">{subjectName}</h2>
          <h3 className="set-title">01 연습문제</h3>
          <p className="hint">AI가 문제를 생성합니다!</p>
          <button className="cta" disabled={loading} onClick={startQuiz}>
            {loading ? "문제 만드는 중..." : "시작"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = questions[idx];
    return (
      <div className="quiz-page">
        <button className="back" onClick={() => navigate(-1)}>
          ←
        </button>

        <div className="quiz-topbar">
          <button className="ghost" onClick={prev} disabled={idx === 0}>
            이전
          </button>
          <div className="set-badge">01 연습 문제</div>
          <button
            className="ghost"
            onClick={idx === questions.length - 1 ? finish : next}
          >
            {idx === questions.length - 1 ? "끝" : "다음"}
          </button>
        </div>

        <div className="dots">
          {questions.map((_, i) => (
            <span key={i} className={`dot ${i === idx ? "active" : ""}`} />
          ))}
        </div>

        <div className="question-wrap">
          <p className="qtext">
            {idx + 1}. {q.question}
          </p>
          {q.options.map((opt, i) => {
            const isSel = answers[idx] === i;
            return (
              <button
                key={i}
                className={`opt ${isSel ? "selected" : ""}`}
                onClick={() => choose(i)}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === "result" && questions.length > 0) {
    return (
      <div className="quiz-page">
        <button
          className="review-back-btn"
          onClick={() => navigate(`/Subject/${subjectId}?tab=복습`)}
        >
          ←
        </button>

        <div className="result-title">01 연습 문제</div>

        <div className="score-table">
          <div className="row header">
            <div className="cell">문항</div>
            {questions.map((_, i) => (
              <div key={i} className="cell">
                {String(i + 1).padStart(2, "0")}
              </div>
            ))}
          </div>

          <div className="row">
            <div className="cell">나의 답</div>
            {answers.map((a, i) => (
              <div key={i} className="cell">
                {a === null ? "-" : String.fromCharCode(65 + a)}
              </div>
            ))}
          </div>

          <div className="row">
            <div className="cell">정답</div>
            {questions.map((q, i) => (
              <div
                key={i}
                className={`cell ${answers[i] === q.answer ? "ok" : "bad"}`}
              >
                {answers[i] === q.answer ? "●" : "✕"}
              </div>
            ))}
          </div>
        </div>

        <p className="score-note">
          점수: {score} / {questions.length}
        </p>

        <div className="result-actions">
          <button
            className="cta"
            disabled={loading || !noteId}
            onClick={async () => {
              await quizAI.post("/generate-explanations", {
                subjectName,
                subjectId,
                weekId,
                questions,
                userAnswers: answers,
              });

              navigate(`/ReviewDetail/${subjectId}/${weekId}/${noteId}`);
            }}
          >
            {loading ? "해설 생성 중..." : "오답 풀이 해설 보기"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
