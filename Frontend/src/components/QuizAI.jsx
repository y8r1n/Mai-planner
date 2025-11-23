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

  const userId = auth.currentUser?.uid || "test-user";

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

  /* ------------------ 과목 이름 불러오기 ------------------ */
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

  /* ------------------ 오답노트 생성 ------------------ */
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
console.log("📡 FULL 요청 URL:", `${quizAI.defaults.baseURL}/api/quiz/generate`);

const startQuiz = async () => {
  setLoading(true);

  try {
    const weekRef = doc(db, "users", userId, "subjects", subjectId, "weeks", weekId);
    const wkSnap = await getDoc(weekRef);
    const wk = wkSnap.data();

    const filesRef = collection(db, "users", userId, "subjects", subjectId, "weeks", weekId, "files");
    const fileSnap = await getDocs(filesRef);
    const files = fileSnap.docs.map(d => ({ id: d.id, ...d.data() }));

   const pdfUrls = files.map(f => f.url);   // 모든 파일 URL 배열
console.log("📂 선택된 PDF들:", pdfUrls);

const res = await quizAI.post("/api/quiz/generate", {
  pdfUrls,                     
  summary: wk.summary || "",
  notes: wk.memo || "",
  count: 5,
});
    console.log("🔥 서버 응답:", res.data);



     // ==============================
    // ⭐ 단일 문제 / 배열 문제 대응
    // ==============================
 let rawQuiz = res.data?.quiz;
let qList = [];

if (Array.isArray(rawQuiz)) {
  qList = rawQuiz; // 여러 문제
} else if (rawQuiz && typeof rawQuiz === "object") {
  qList = [rawQuiz]; // 단일 문제
}

if (!res.data?.success || !qList.length) {
  alert("문제 생성 실패 😢");
  return;
}

const formatted = qList.map((q, idx) => {
  const options = Array.isArray(q.options)
    ? q.options
    : ["보기1", "보기2", "보기3", "보기4"];
  const answerIndex = options.indexOf(q.answer);

  return {
    id: idx,
    question: q.question || "질문이 없습니다.",
    options,
    answer: answerIndex >= 0 ? answerIndex : 0,
    explanation: q.explanation || "해설이 없습니다.",
  };
});
    setQuestions(formatted);
    setAnswers(Array(formatted.length).fill(null));
    setIdx(0);
    setPhase("quiz"); // ⭐ 화면 전환

  } catch (e) {
    console.error("🔥 Quiz 생성 오류:", e);
    alert("문제 생성 중 오류 발생!");
  } finally {
    setLoading(false);
  }
};
  /* ------------------ 선택 처리 ------------------ */
  const choose = (optIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = optIndex; // 현재 문제의 선택지 저장
      return next;
    });
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
      explanation: q.explanation,   // explanation 함께 저장
    }))
    .filter((w) => w.myAnswer !== w.correctAnswer);

  try {
    // 퀴즈 전체 결과 저장
    const quizRef = await addDoc(
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

    // 오답 노트 생성 (wrongList 있는 경우)
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
        <button className="quiz-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="intro-card">
          <div className="intro-icon">📝</div>
          <h2 className="intro-subject">{subjectName}</h2>
          <h3 className="intro-title">AI 연습문제</h3>
          <p className="intro-hint">AI가 맞춤 문제를 생성합니다!</p>
          <button 
            className="quiz-start-btn" 
            disabled={loading} 
            onClick={startQuiz}
          >
            {loading ? "문제 만드는 중..." : "시작하기"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = questions[idx];
    return (
      <div className="quiz-page">
        <button className="quiz-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>

        <div className="quiz-topbar">
          <button 
            className="quiz-nav-btn" 
            onClick={prev} 
            disabled={idx === 0}
          >
            ← 이전
          </button>
          <div className="quiz-badge">연습 문제</div>
          <button
            className="quiz-nav-btn"
            onClick={idx === questions.length - 1 ? finish : next}
          >
            {idx === questions.length - 1 ? "완료" : "다음 →"}
          </button>
        </div>

        <div className="quiz-progress">
          {questions.map((_, i) => (
            <span key={i} className={`progress-dot ${i === idx ? "active" : ""} ${answers[i] !== null ? "answered" : ""}`} />
          ))}
        </div>

        <div className="question-card">
          <p className="question-number">문제 {idx + 1}</p>
          <p className="question-text">{q.question}</p>
          
         <div className="options-list">
  {(q.options && Array.isArray(q.options) ? q.options : ["보기1", "보기2", "보기3", "보기4"]).map((opt, i) => {
    const isSel = answers[idx] === i;
    return (
      <button
        key={i}
        className={`option-btn ${isSel ? "selected" : ""}`}
        onClick={() => choose(i)}
      >
        <span className="option-label">{String.fromCharCode(65 + i)}</span>
        <span className="option-text">{opt}</span>
      </button>
    );
  })}
</div>
        </div>
      </div>
    );
  }

  if (phase === "result" && questions.length > 0) {
    return (
      <div className="quiz-page">
        <button
          className="quiz-back-btn"
          onClick={() => navigate(`/Subject/${subjectId}?tab=복습`)}
        >
          ←
        </button>

        <div className="result-card">
          <div className="result-icon">
            {score === questions.length ? "🎉" : score >= questions.length / 2 ? "👍" : "💪"}
          </div>
          <h2 className="result-title">연습 문제 완료!</h2>
          <p className="result-score">
            <span className="score-number">{score}</span> / {questions.length}
          </p>
        </div>

        <div className="result-table">
          <div className="result-row header">
            <div className="result-cell">문항</div>
            {questions.map((_, i) => (
              <div key={i} className="result-cell">
                {i + 1}
              </div>
            ))}
          </div>

          <div className="result-row">
            <div className="result-cell">나의 답</div>
            {answers.map((a, i) => (
              <div key={i} className="result-cell">
                {a === null ? "-" : String.fromCharCode(65 + a)}
              </div>
            ))}
          </div>

          <div className="result-row">
            <div className="result-cell">정답</div>
            {questions.map((q, i) => (
              <div
                key={i}
                className={`result-cell ${answers[i] === q.answer ? "correct" : "wrong"}`}
              >
                {answers[i] === q.answer ? "○" : "✕"}
              </div>
            ))}
          </div>
        </div>

        <div className="result-actions">
         <button
  className="result-btn primary"
  disabled={!noteId}
  onClick={() => navigate(`/ReviewDetail/${subjectId}/${weekId}/${noteId}`)}
>
  📖 오답 풀이 해설 보기
</button>

        </div>
      </div>
    );
  }

  return null;
}