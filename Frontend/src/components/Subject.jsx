import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useRef,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

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

import { auth, db } from "../services/firebase";
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

const storage = getStorage();

export default function Subject() {
  const navigate = useNavigate();
  const { id } = useParams(); // subjectId
  const location = useLocation();

  const userId = auth.currentUser?.uid;
  const subjectPath = ["users", userId, "subjects", id];

  const [subject, setSubject] = useState({});
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [activeTab, setActiveTab] = useState("학습");

  /* ============================
     🔥 URL/tab 자동 감지
  ============================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam && ["학습", "MENTOR AI", "복습"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  /* ============================
     🔥 NavBar 숨기기
  ============================= */
  useEffect(() => {
    const globalNav = document.querySelector("#global-nav");
    if (globalNav) globalNav.style.display = "none";
    return () => {
      if (globalNav) globalNav.style.display = "";
    };
  }, []);

  /* ============================
     📌 과목 데이터 실시간
  ============================= */
  useEffect(() => {
    if (!userId || !id) return;

    const unsub = onSnapshot(doc(db, ...subjectPath), (snap) => {
      if (snap.exists()) setSubject(snap.data());
    });

    return () => unsub();
  }, [userId, id]);

  /* ============================
     📌 주차 리스트
  ============================= */
  useEffect(() => {
    if (!userId || !id) return;

    const weeksRef = collection(db, ...subjectPath, "weeks");

    const unsub = onSnapshot(weeksRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.weekTitle.localeCompare(b.weekTitle));
      setWeeks(list);

      setSelectedWeek((prev) =>
        prev ? list.find((w) => w.id === prev.id) || prev : null
      );
    });

    return () => unsub();
  }, [userId, id]);

  /* ============================
     📌 주차 추가
  ============================= */
  const addWeek = async () => {
    const newWeek = {
      weekTitle: `${weeks.length + 1}주차`,
      content: "",
      summary: "",
      memo: "",
      reviewMemo: "",
      aiSummary: "",
      createdAt: new Date(),
    };

    try {
      const refDoc = await addDoc(
        collection(db, ...subjectPath, "weeks"),
        newWeek
      );
      setSelectedWeek({ id: refDoc.id, ...newWeek });
    } catch (err) {
      console.error("주차 추가 실패:", err);
    }
  };

  const handleUpdate = async (field, value) => {
    if (!selectedWeek) return;

    await updateDoc(
      doc(db, ...subjectPath, "weeks", selectedWeek.id),
      { [field]: value }
    );
  };

  /* ============================
     📌 탭 underline
  ============================= */
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

  /* ============================
     📂 파일 업로드
  ============================= */
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 주차 파일 실시간 구독
  useEffect(() => {
    if (!selectedWeek?.id) return;

    const filesRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "files"
    );

    const unsub = onSnapshot(filesRef, (snap) => {
      const files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      files.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUploadedFiles(files);
    });

    return () => unsub();
  }, [selectedWeek?.id]);

  // 파일 업로드
  const handleFileUpload = async (file) => {
    if (!selectedWeek?.id) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const key = `${uuidv4()}_${file.name}`;
      const path = `users/${userId}/subjects/${id}/weeks/${selectedWeek.id}/files/${key}`;
      const fileRef = ref(storage, path);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(fileRef, chunk);
          task.on(
            "state_changed",
            (s) => {
              const pct =
                (s.bytesTransferred / s.totalBytes) * (100 / totalChunks);
              setUploadProgress((p) => Math.min(p + pct, 100));
            },
            reject,
            resolve
          );
        });
      }

      const url = await getDownloadURL(fileRef);

      await addDoc(
        collection(
          db,
          ...subjectPath,
          "weeks",
          selectedWeek.id,
          "files"
        ),
        {
          name: file.name,
          url,
          size: file.size,
          path,
          createdAt: new Date(),
        }
      );

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 1200);
    } catch (e) {
      alert("파일 업로드 실패");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  // 드래그 앤 드롭
  const handleDrop = (e) => {
    e.preventDefault();
    if (uploading || !selectedWeek) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // 파일 선택 토글
  const toggleSelect = (fid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  // 선택 삭제
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    for (const fid of selectedIds) {
      const item = uploadedFiles.find((f) => f.id === fid);
      if (!item?.path) continue;

      try {
        await deleteObject(ref(storage, item.path));
      } catch (e) {
        console.error("스토리지 삭제 실패:", e);
      }

      await deleteDoc(
        doc(
          db,
          ...subjectPath,
          "weeks",
          selectedWeek.id,
          "files",
          fid
        )
      );
    }

    setSelectedIds(new Set());
  };

  /* ============================
     🤖 AI 요약
  ============================= */
  const [summaryLoading, setSummaryLoading] = useState(false);

  const requestSummary = async () => {
    if (!selectedWeek?.summary?.trim()) {
      alert("요약할 내용이 없습니다!");
      return;
    }

    setSummaryLoading(true);

    try {
      const res = await mentorAI.post("/summary", {
        content: selectedWeek.summary,
      });

      await updateDoc(
        doc(db, ...subjectPath, "weeks", selectedWeek.id),
        { aiSummary: res.data.result }
      );
    } catch (e) {
      console.error("AI 요약 실패:", e);
      alert("AI 요약 실패!");
    } finally {
      setSummaryLoading(false);
    }
  };

  /* ============================
     💬 Mentor Chat 미리보기
  ============================= */
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    if (!selectedWeek?.id) return;

    const chatsRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "chats"
    );

    const unsub = onSnapshot(chatsRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });
      setRecentChats(list.slice(0, 3));
    });

    return () => unsub();
  }, [selectedWeek?.id]);

  // 새 채팅 생성
  const createNewChat = async () => {
    if (!selectedWeek) return;

    const chatsCol = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "chats"
    );

    const snap = await getDocs(chatsCol);
    const nextIndex = snap.size + 1;

    const ref = await addDoc(chatsCol, {
      title: `${String(nextIndex).padStart(2, "0")}번 대화`,
      messages: [],
      createdAt: serverTimestamp(),
    });

    return ref.id;
  };

  /* ============================
     📝 퀴즈 & 오답노트
  ============================= */
  const [quizList, setQuizList] = useState([]);
  const [wrongNotes, setWrongNotes] = useState([]);

  // 퀴즈 구독
  useEffect(() => {
    if (!selectedWeek?.id) return;

    const qRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "quizzes"
    );

    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuizList(list);
    });

    return () => unsub();
  }, [selectedWeek?.id]);

  // 오답노트 구독
  useEffect(() => {
    if (!selectedWeek?.id) return;

    const noteRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "notes"
    );

    const unsub = onSnapshot(noteRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });

      const withTitle = list.map((n) => ({
        ...n,
        displayTitle: n.quizTitle || `오답노트 ${n.id.slice(0, 4)}`,
      }));

      setWrongNotes(withTitle);
    });

    return () => unsub();
  }, [selectedWeek?.id]);

  return (
    <div className="subject-page">
      {/* 헤더 */}
      <div className="subject-header">
        <button className="back-btn" onClick={() => navigate("/study")}>
          ←
        </button>
        <h2 className="subject-title">{subject.name}</h2>
      </div>

      {/* 탭 */}
      <div className="subject-tabs" ref={tabsRef}>
        {["학습", "MENTOR AI", "복습"].map((tab) => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <div
          className="tab-underline"
          style={{ left: underline.left, width: underline.width }}
        />
      </div>

      {/* 콘텐츠 영역 */}
      <div className="content-area">
        {/* 주차 리스트 */}
        <div className="week-list">
          <h4>주차 선택</h4>

          {weeks.map((w) => (
            <div
              key={w.id}
              className={`week-item ${
                selectedWeek?.id === w.id ? "active" : ""
              }`}
              onClick={() => setSelectedWeek(w)}
            >
              {w.weekTitle}
              <button
                className="delete-week"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("주차 전체 삭제하시겠습니까?")) {
                    deleteWeekCompletely(userId, id, w.id);
                  }
                }}
              >
                🗑️
              </button>
            </div>
          ))}

          <button className="add-week-btn" onClick={addWeek}>
            ＋ 주차 추가
          </button>
        </div>

        {/* 주차별 콘텐츠 */}
        <div className="week-content">
          {!selectedWeek ? (
            <div className="no-week-selected">
              <p>주차를 선택하거나 추가해주세요</p>
            </div>
          ) : (
            <div className="week-content-inner">
              {/* 📚 학습 탭 */}
              {activeTab === "학습" && (
                <>
                  <h4>강의 교안 등록</h4>

                  {uploadedFiles.length === 0 ? (
                    <div
                      className="file-dropzone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => {
                        if (!uploading && selectedWeek)
                          document.getElementById("fileInput").click();
                      }}
                    >
                      {uploading ? (
                        <div className="upload-progress-container">
                          <div className="upload-progress-bar">
                            <div
                              className="upload-progress-fill"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="upload-progress-text">
                            업로드 중... {Math.round(uploadProgress)}%
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="dropzone-icon">📎</span>
                          <p className="dropzone-text">
                            📂 파일 업로드 (클릭 또는 드래그)
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="file-list-box">
                      {uploadedFiles.map((f) => (
                        <div key={f.id} className="file-row">
                          <input
                            type="checkbox"
                            className="file-checkbox"
                            checked={selectedIds.has(f.id)}
                            onChange={() => toggleSelect(f.id)}
                          />
                          <span className="file-name">{f.name}</span>

                          <button
                            className="file-preview-btn"
                            onClick={() => window.open(f.url, "_blank")}
                          >
                            미리보기
                          </button>
                        </div>
                      ))}

                      <div className="file-list-footer">
                        <button
                          className="file-add-btn"
                          onClick={() =>
                            document.getElementById("fileInput").click()
                          }
                        >
                          ＋ 추가
                        </button>

                        <button
                          className="file-delete-btn"
                          onClick={deleteSelected}
                          disabled={selectedIds.size === 0}
                        >
                          선택 삭제
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    id="fileInput"
                    type="file"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleFileUpload(f);
                      e.target.value = "";
                    }}
                  />

                  <h4>수업자료 요약</h4>
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

              {/* 💛 Mentor AI 탭 */}
              {activeTab === "MENTOR AI" && (
                <>
                  <h4>AI 요약</h4>
                  <div className="ai-summary-box">
                    {selectedWeek.aiSummary ? (
                      <div
                        className="ai-text"
                        dangerouslySetInnerHTML={{
                          __html: selectedWeek.aiSummary.replace(/\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <div className="ai-empty-state">
                        <p className="ai-placeholder">AI가 요약을 준비 중...</p>
                        <button
                          className="ai-summary-btn"
                          onClick={requestSummary}
                          disabled={summaryLoading}
                        >
                          {summaryLoading ? "요약 생성 중..." : "AI 요약 생성"}
                        </button>
                      </div>
                    )}
                  </div>

                  <h4>AI에게 질문하기</h4>
                  <div className="ai-chat-preview">
                    {recentChats.length === 0 ? (
                      <p className="no-chat-preview">
                        학습 중 궁금한 내용을
                        <br /> AI에게 질문해보세요!
                      </p>
                    ) : (
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
                            {chat.summary ||
                              chat.messages?.at(-1)?.text?.slice(0, 40) ||
                              "대화 없음"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    className="ai-chat-btn"
                    onClick={async () => {
                      const newChatId = await createNewChat();
                      navigate(
                        `/Mentorchat/${id}/${selectedWeek.id}?chat=${newChatId}`
                      );
                    }}
                  >
                    💬 채팅 시작!
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

              {/* 🔁 복습 탭 */}
              {activeTab === "복습" && (
                <>
                  <h4>AI 연습문제</h4>

                  <div className="quiz-list-wrapper">
                    {quizList.length === 0 ? (
                      <p className="no-quiz">아직 생성된 문제가 없습니다.</p>
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
                            {String(idx + 1).padStart(2, "0")}번 문제
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      className="quiz-add-btn"
                      onClick={() =>
                        navigate(`/QuizAI/${id}/${selectedWeek.id}`)
                      }
                    >
                      ＋ 문제 풀기
                    </button>
                  </div>

                  <h4>오답노트</h4>

                  <div className="wrong-note-list-wrapper">
                    {wrongNotes.length === 0 ? (
                      <p className="no-wrong-note">
                        아직 오답 노트가 없습니다.
                      </p>
                    ) : (
                      <div className="wrong-note-list">
                        {wrongNotes.map((note) => (
                          <button
                            key={note.id}
                            className="wrong-note-item"
                            onClick={() =>
                              navigate(
                                `/ReviewDetail/${id}/${selectedWeek.id}/${note.id}`
                              )
                            }
                          >
                            {note.displayTitle}
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