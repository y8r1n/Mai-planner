// src/components/Subject.jsx
import React, { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import "../styles/Subject.css";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { deleteWeekCompletely } from "../utils/deleteUtils";
import { mentorAI } from "../services/api";
import { useLocation } from "react-router-dom";

const storage = getStorage();

export default function Subject() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [subject, setSubject] = useState({});
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [activeTab, setActiveTab] = useState("학습");

  // 업로드 상태
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const CHUNK_SIZE = 2 * 1024 * 1024;

// 자동 위치 탐지 
  const location = useLocation();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const tabParam = params.get("tab");
  if (tabParam && ["학습", "MENTOR AI", "복습"].includes(tabParam)) {
    setActiveTab(tabParam);
  }
}, [location.search]);

  /* ================= 파일 영역 ================= */

  // 주차 파일 구독
  useEffect(() => {
    if (!id || !selectedWeek?.id) {
      setUploadedFiles([]);
      return;
    }
    const q = collection(db, "subjects", id, "weeks", selectedWeek.id, "files");
    const unsub = onSnapshot(q, (snap) => {
      const files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      files.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setUploadedFiles(files);
    });
    return () => unsub();
  }, [id, selectedWeek?.id]);

  // 파일 업로드
  const handleFileUpload = async (file) => {
    if (!selectedWeek?.id) return;
    try {
      setUploading(true);
      setUploadSuccess(false);
      setUploadProgress(0);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const key = `${uuidv4()}_${file.name}`;
      const path = `subjects/${id}/${selectedWeek.id}/${key}`;
      const fileRef = ref(storage, path);
      const metadata = { contentType: file.type || "application/octet-stream" };

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // 각 chunk를 순차 업로드
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(fileRef, chunk, metadata);
          task.on(
            "state_changed",
            (s) => {
              const chunkPct =
                (s.bytesTransferred / s.totalBytes) * (100 / totalChunks);
              setUploadProgress((prev) => Math.min(prev + chunkPct, 100));
            },
            reject,
            resolve
          );
        });
      }

      const url = await getDownloadURL(fileRef);
      await addDoc(
        collection(db, "subjects", id, "weeks", selectedWeek.id, "files"),
        {
          name: file.name,
          url,
          size: file.size,
          path,
          createdAt: new Date(),
        }
      );

      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 1200);
    } catch (e) {
      console.error("❌ 청크 업로드 실패:", e);
      alert("파일 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (fid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  const deleteOne = async (fileDoc) => {
    try {
      if (fileDoc.path) {
        await deleteObject(ref(storage, fileDoc.path)).catch(() => {});
      }
      await deleteDoc(
        doc(db, "subjects", id, "weeks", selectedWeek.id, "files", fileDoc.id)
      );
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제에 실패했어요.");
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm("선택한 항목을 삭제할까요?")) return;
    const targets = uploadedFiles.filter((f) => selectedIds.has(f.id));
    // eslint-disable-next-line no-restricted-syntax
    for (const f of targets) {
      // eslint-disable-next-line no-await-in-loop
      await deleteOne(f);
    }
    setSelectedIds(new Set());
  };

  /* ================= Mentor AI 요약 ================= */

  const generateAISummary = async (week) => {
    if (!id || !week?.id) return;
    try {
      await updateDoc(doc(db, "subjects", id, "weeks", week.id), {
        aiSummary: "AI가 개념 요약을 준비 중입니다...",
      });

      const res = await mentorAI.post("/generate-summary", {
        subjectName: subject.name || "과목 이름",
        weekTitle: week.weekTitle,
        userNotes: week.summary || week.memo || "",
      });

      if (res.data?.success) {
        await updateDoc(doc(db, "subjects", id, "weeks", week.id), {
          aiSummary: res.data.summary,
        });
      } else {
        await updateDoc(doc(db, "subjects", id, "weeks", week.id), {
          aiSummary: "요약 생성 실패 😢 다시 시도해주세요.",
        });
      }
    } catch (err) {
      console.error("AI 요약 생성 실패:", err);
      await updateDoc(doc(db, "subjects", id, "weeks", week.id), {
        aiSummary: "요약 요청 중 오류 발생 ⚠️",
      });
    }
  };

  // Mentor AI 탭 들어갔을 때 자동 요약
  useEffect(() => {
    if (activeTab !== "MENTOR AI" || !selectedWeek?.id) return;

    const summary = selectedWeek.aiSummary?.trim();
    const needGenerate =
      !summary ||
      summary === "AI가 개념 요약을 준비 중입니다..." ||
      summary.includes("실패") ||
      summary.includes("오류");

    if (needGenerate) {
      generateAISummary(selectedWeek);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedWeek]);

  /* ================= Mentor Chat ================= */

  const [recentChats, setRecentChats] = useState([]);

  // 주차별 채팅 목록 구독
  useEffect(() => {
    if (!id || !selectedWeek?.id) {
      setRecentChats([]);
      return;
    }
    const q = collection(db, "subjects", id, "weeks", selectedWeek.id, "chats");
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setRecentChats(data);
    });
    return () => unsub();
  }, [id, selectedWeek?.id]);

 // ✅ 새 채팅 생성 함수 (01번 대화, 02번 대화…)
const createNewChat = async (messages = []) => {
  if (!id || !selectedWeek?.id) return null;

  try {
    // 🔹 기존 채팅 개수 기준으로 다음 번호 생성
    const chatRef = collection(db, "subjects", id, "weeks", selectedWeek.id, "chats");
    const existing = await getDocs(chatRef);
    const nextIndex = existing.size + 1;

    // 🔹 Firestore에 새 문서 추가
    const docRef = await addDoc(chatRef, {
      title: `${String(nextIndex).padStart(2, "0")}번 대화`,
      messages,
      createdAt: serverTimestamp(),
    });

    console.log(`✅ ${nextIndex}번 대화 생성 완료 (${docRef.id})`);
    return docRef.id;
  } catch (e) {
    console.error("❌ 채팅 생성 실패:", e);
    return null;
  }
};

  /* ================= 공통: 네비바 숨김 ================= */

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

  /* ================= 과목 / 주차 데이터 ================= */

  // 과목 데이터
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "subjects", id), (snap) => {
      if (snap.exists()) setSubject(snap.data());
    });
    return () => unsub();
  }, [id]);

  // 주차 목록
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(collection(db, "subjects", id, "weeks"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a, b) =>
        a.weekTitle.localeCompare(b.weekTitle)
      );
      setWeeks(sorted);

      // selectedWeek를 최신 데이터와 동기화
      setSelectedWeek((prev) =>
        prev ? sorted.find((w) => w.id === prev.id) || prev : null
      );
    });
    return () => unsub();
  }, [id]);

  const addWeek = async () => {
    const newWeek = {
      weekTitle: `${weeks.length + 1}주차`,
      content: "",
      summary: "",
      memo: "",
      createdAt: new Date(),
    };

    try {
      const refDoc = await addDoc(
        collection(db, "subjects", id, "weeks"),
        newWeek
      );
      const weekObj = { id: refDoc.id, ...newWeek };
      setWeeks((prev) => [...prev, weekObj]);
      setSelectedWeek(weekObj);
      document.activeElement.blur();
    } catch (err) {
      console.error("주차 추가 실패:", err);
    }
  };

  const handleUpdate = async (field, value) => {
    if (!selectedWeek) return;
    await updateDoc(doc(db, "subjects", id, "weeks", selectedWeek.id), {
      [field]: value,
    });
  };

  /* ================= 탭 underline ================= */

  const tabsRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!tabsRef.current) return;
    const parentRect = tabsRef.current.getBoundingClientRect();
    const activeEl = tabsRef.current.querySelector(".tab-item.active");
    if (!activeEl) return;
    const r = activeEl.getBoundingClientRect();
    setUnderline({
      left: r.left - parentRect.left,
      width: r.width,
    });
  }, [activeTab]);
/* ================= 복습 탭: 퀴즈 / 오답노트 ================= */

const [quizList, setQuizList] = useState([]);
const [wrongNotes, setWrongNotes] = useState([]);

useEffect(() => {
  if (!id || !selectedWeek?.id) return;

  const fetchData = async () => {
    // 🔹 Firestore에서 quiz와 note 가져오기
    const quizSnap = await getDocs(
      collection(db, "subjects", id, "weeks", selectedWeek.id, "quizzes")
    );
    const noteSnap = await getDocs(
      collection(db, "subjects", id, "weeks", selectedWeek.id, "notes")
    );

    // 🔹 데이터 정렬
    const quizData = quizSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const noteData = noteSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const sortedQuiz = quizData.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );
    const sortedNotes = noteData.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

    // 🔹 번호 붙이기 (렌더링용)
    const indexedNotes = sortedNotes.map((note, idx) => ({
      ...note,
      displayTitle:
        `${String(idx + 1).padStart(2, "0")} ` +
        (note.quizTitle?.replace(/^(\d+\s)?/, "") || "오답노트"),
    }));

    setQuizList(sortedQuiz);
    setWrongNotes(indexedNotes);
  };

  fetchData();
}, [id, selectedWeek?.id]);


  /* ================= 렌더 ================= */

  return (
    <div className="subject-page">
      <div className="subject-container">
        <header className="subject-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>
          <h2 className="subject-title">{subject.name || "과목 이름"}</h2>
        </header>

        {/* 탭 메뉴 */}
        <nav ref={tabsRef} className="subject-tabs">
          {["학습", "MENTOR AI", "복습"].map((tab) => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
          <span
            className="tab-underline"
            style={{
              width: `${underline.width || 0}px`,
              left: `${underline.left || 0}px`,
            }}
          />
        </nav>

        <hr className="subject-line" />

        <div className="content-area">
          {/* 주차 리스트 */}
          <div className="week-list">
            <h4>주차</h4>
            {weeks.map((w) => (
              <div
                key={w.id}
                className={`week-item ${
                  selectedWeek?.id === w.id ? "active" : ""
                }`}
              >
                <span onClick={() => setSelectedWeek(w)}>{w.weekTitle}</span>
                <button
                  className="delete-week"
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `${w.weekTitle}을(를) 완전히 삭제하시겠습니까?`
                      )
                    ) {
                      deleteWeekCompletely(id, w.id)
                        .then(() => alert("✅ 주차 삭제 완료"))
                        .catch(() => alert("삭제 중 오류 발생"));
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="add-week-btn" type="button" onClick={addWeek}>
              ＋ 주차를 생성하세요
            </button>
          </div>

          {/* 오른쪽 영역: 선택된 주차가 있을 때만 */}
          {selectedWeek && (
            <div className="week-content">
              {/* ========== 학습 탭 ========== */}
              {activeTab === "학습" && (
                <>
                  <h4>학습 컨텐츠</h4>
                  {uploadedFiles.length === 0 && (
                    <div
                      className={`content-box upload-box ${
                        uploading ? "disabled" : ""
                      }`}
                      onClick={() =>
                        !uploading &&
                        document.getElementById("fileInput").click()
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (uploading) return;
                        const f = e.dataTransfer.files?.[0];
                        if (f) await handleFileUpload(f);
                      }}
                    >
                      {uploading ? (
                        <div className="upload-progress-wrapper">
                          <div className="upload-progress-bar">
                            <div
                              className="upload-progress-fill"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="upload-progress-text">
                            업로드 중... {uploadProgress}%
                          </span>
                        </div>
                      ) : (
                        <p className="file-placeholder">
                          📂 파일을 드래그하거나 클릭하여 업로드하세요
                        </p>
                      )}
                    </div>
                  )}

                  <input
                    id="fileInput"
                    type="file"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleFileUpload(f);
                      e.target.value = "";
                    }}
                    disabled={uploading}
                  />

                  {uploadedFiles.length > 0 && (
                    <div className="content-box file-list-box">
                      {uploadedFiles.map((f) => (
                        <div key={f.id} className="file-row">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(f.id)}
                            onChange={() => toggleSelect(f.id)}
                            className="file-toggle"
                          />
                          <span className="file-name" title={f.name}>
                            {f.name}
                          </span>
                          <div className="file-actions">
                            <button
                              type="button"
                              onClick={() => window.open(f.url, "_blank")}
                            >
                              미리보기
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="file-list-footer">
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById("fileInput").click()
                          }
                        >
                          ＋ 추가하기
                        </button>
                        <button
                          type="button"
                          onClick={deleteSelected}
                          disabled={selectedIds.size === 0}
                          className="danger"
                        >
                          선택 삭제
                        </button>
                      </div>
                    </div>
                  )}

                  <h4>수업자료 요약 및 정리</h4>
                  <div
                    className="content-box editable"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdate("summary", e.target.textContent)
                    }
                  >
                    {selectedWeek.summary || ""}
                  </div>

                  <h4>학습 메모</h4>
                  <div
                    className="content-box editable"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdate("memo", e.target.textContent)
                    }
                  >
                    {selectedWeek.memo || ""}
                  </div>
                </>
              )}

              {/* ========== MENTOR AI 탭 ========== */}
              {activeTab === "MENTOR AI" && (
                <>
                  <h4>개념 요약</h4>
<div className="content-box ai-summary-box">
  {selectedWeek.aiSummary ? (
    <div
      className="ai-text"
      dangerouslySetInnerHTML={{
        __html: selectedWeek.aiSummary.replace(/\n/g, "<br />"),
      }}
    />
  ) : (
    <p className="ai-placeholder">AI 생성 요약</p>
  )}
</div>


                  <h4>AI에게 질문하기</h4>
                  <div className="ai-chat-preview">
                    {recentChats.length > 0 ? (
                      recentChats.map((chat, i) => (
                        <div
                          key={chat.id}
                          className="chat-preview-item"
                          onClick={() =>
                            navigate(
                              `/Mentorchat/${id}/${selectedWeek.id}?chat=${chat.id}`
                            )
                          }
                        >
                          <p className="chat-preview-title">
                            {chat.title ||
                              `${String(i + 1).padStart(2, "0")}번 대화`}
                          </p>
                          <p className="chat-preview-snippet">
                              {chat.summary
    ? chat.summary
    : chat.messages?.length
    ? chat.messages.at(-1)?.text?.slice(0, 40)
    : "요약 생성 중..."}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="no-chat-preview">
                        <br />
                        학습 중 어려운 내용이나 <br />
                        궁금한 것을 물어보세요!
                      </p>
                    )}
                  </div>

                  <button
                    className="ai-chat-btn"
                    type="button"
                    onClick={async () => {
                      const newChatId = await createNewChat();
                      // 새 채팅 id를 쿼리로 넘겨서 바로 이어서 볼 수 있게
                      if (newChatId) {
                        navigate(
                          `/Mentorchat/${id}/${selectedWeek.id}?chat=${newChatId}`
                        );
                      } else {
                        navigate(`/Mentorchat/${id}/${selectedWeek.id}`);
                      }
                    }}
                  >
                    채팅 시작!
                  </button>

                  <h4>학습 메모</h4>
                  <div
                    className="content-box editable"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdate("memo", e.target.textContent)
                    }
                  >
                    {selectedWeek.memo || ""}
                  </div>
                </>
              )}

              {/* ========== 복습 탭 ========== */}
              {activeTab === "복습" && (
                <>
                  <h4>AI 연습문제 풀어보기</h4>
                  <div className="ai-quiz-box">
                    <div className="quiz-list-wrapper">
                      {quizList.length === 0 ? (
                        <p className="no-quiz">
                          아직 생성된 연습문제가 없습니다.
                        </p>
                      ) : (
                        <div className="quiz-list">
                          {quizList.map((quiz, idx) => (
                            <button
                              key={quiz.id}
                              className="quiz-item"
                              onClick={() =>
                                navigate(
                                  `/ReviewDetail/${id}/${selectedWeek.id}/${quiz.id}`
                                )
                              }
                            >
                              {String(idx + 1).padStart(2, "0")} 연습문제
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        className="quiz-add-btn"
                        type="button"
                        onClick={() =>
                          navigate(`/QuizAI/${id}/${selectedWeek.id}`)
                        }
                      >
                        ＋ 풀어보기
                      </button>
                    </div>
                  </div>

                  <h4>오답 노트</h4>
                  <div className="wrong-note-list-wrapper">
                    {wrongNotes.length === 0 ? (
                      <p className="no-wrong-note">
                        <br />
                        아직 오답 노트가 없습니다.
                      </p>
                    ) : (
                      <div className="wrong-note-list">
                        {wrongNotes.map((note, idx) => (
                          <button
                            key={note.id}
                            className="wrong-note-item"
                            onClick={() =>
                              navigate(
                                `/ReviewDetail/${id}/${selectedWeek.id}/${note.id}`
                              )
                            }
                          >
                            {note.displayTitle ||
                              note.quizTitle ||
                              `${String(idx + 1).padStart(
                                2,
                                "0"
                              )} 오답노트`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <h4>학습 메모</h4>
                  <div
                    className="content-box editable"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdate("reviewMemo", e.target.textContent)
                    }
                  >
                    {selectedWeek.reviewMemo || ""}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
