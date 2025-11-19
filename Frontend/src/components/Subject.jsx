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

  const toggleSelect = (fid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(fid) ? next.delete(fid) : next.add(fid);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!window.confirm("선택한 파일을 삭제할까요?")) return;

    const targets = uploadedFiles.filter((f) => selectedIds.has(f.id));
    for (const f of targets) {
      if (f.path) await deleteObject(ref(storage, f.path));

      await deleteDoc(
        doc(
          db,
          ...subjectPath,
          "weeks",
          selectedWeek.id,
          "files",
          f.id
        )
      );
    }

    setSelectedIds(new Set());
  };

  /* ============================
     🤖 Mentor AI 요약
  ============================= */
  const generateAISummary = async (week) => {
    if (!week?.id) return;

    await updateDoc(
      doc(db, ...subjectPath, "weeks", week.id),
      {
        aiSummary: "AI가 개념 요약을 준비 중입니다..."
      }
    );

    try {
      const res = await mentorAI.post("/generate-summary", {
        subjectName: subject.name,
        weekTitle: week.weekTitle,
        userNotes: week.summary || week.memo || "",
      });

      if (res.data?.success) {
        await updateDoc(
          doc(db, ...subjectPath, "weeks", week.id),
          { aiSummary: res.data.summary }
        );
      } else {
        await updateDoc(
          doc(db, ...subjectPath, "weeks", week.id),
          { aiSummary: "요약 실패. 다시 시도해주세요." }
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab !== "MENTOR AI" || !selectedWeek) return;

    const summary = selectedWeek.aiSummary?.trim();
    const needGenerate =
      !summary ||
      summary.includes("준비 중") ||
      summary.includes("실패") ||
      summary.includes("오류");

    if (needGenerate) generateAISummary(selectedWeek);
  }, [activeTab, selectedWeek]);

  /* ============================
     🤖 Mentor Chat 최근 대화
  ============================= */
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    if (!selectedWeek?.id) return;

    const chatRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "chats"
    );

    const unsub = onSnapshot(chatRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecentChats(list);
    });

    return () => unsub();
  }, [selectedWeek?.id]);

  const createNewChat = async () => {
    const chatRef = collection(
      db,
      ...subjectPath,
      "weeks",
      selectedWeek.id,
      "chats"
    );

    const existing = await getDocs(chatRef);
    const nextIndex = existing.size + 1;

    const refDoc = await addDoc(chatRef, {
      title: `${String(nextIndex).padStart(2, "0")}번 대화`,
      messages: [],
      createdAt: serverTimestamp(),
    });

    return refDoc.id;
  };

  /* ============================
     🔁 복습 (퀴즈 + 오답노트)
  ============================= */
  const [quizList, setQuizList] = useState([]);
  const [wrongNotes, setWrongNotes] = useState([]);

  useEffect(() => {
    if (!selectedWeek?.id) return;

    (async () => {
      const quizSnap = await getDocs(
        collection(
          db,
          ...subjectPath,
          "weeks",
          selectedWeek.id,
          "quizzes"
        )
      );

      const noteSnap = await getDocs(
        collection(
          db,
          ...subjectPath,
          "weeks",
          selectedWeek.id,
          "notes"
        )
      );

      const quizData = quizSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const noteData = noteSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      quizData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      noteData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      const indexedNotes = noteData.map((note, idx) => ({
        ...note,
        displayTitle:
          `${String(idx + 1).padStart(2, "0")} ` +
          (note.quizTitle?.replace(/^(\d+\s)?/, "") || "오답노트"),
      }));

      setQuizList(quizData);
      setWrongNotes(indexedNotes);
    })();
  }, [selectedWeek?.id]);

  /* ============================
     🎨 렌더링
  ============================= */
  return (
    <div className="subject-page">
      <div className="subject-container">
        <header className="subject-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h2 className="subject-title">{subject.name || "과목 이름"}</h2>
        </header>

        {/* 탭 */}
        <nav ref={tabsRef} className="subject-tabs">
          {["학습", "MENTOR AI", "복습"].map((tab) => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <span
            className="tab-underline"
            style={{ width: underline.width, left: underline.left }}
          />
        </nav>

        <hr className="subject-line" />

        <div className="content-area">
          {/* 왼쪽 주차 리스트 */}
          <div className="week-list">
            <h4>주차</h4>

            {weeks.map((w) => (
              <div
                key={w.id}
                className={`week-item ${selectedWeek?.id === w.id ? "active" : ""}`}
              >
                <span onClick={() => setSelectedWeek(w)}>
                  {w.weekTitle}
                </span>

                <button
                  className="delete-week"
                  onClick={() => {
                    if (window.confirm(`${w.weekTitle} 삭제?`)) {
                      deleteWeekCompletely(userId, id, w.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            <button className="add-week-btn" onClick={addWeek}>
              ＋ 주차 생성
            </button>
          </div>

          {/* 오른쪽 컨텐츠 */}
          {selectedWeek && (
            <div className="week-content">
              {/* ❤️ 학습 탭 */}
              {activeTab === "학습" && (
                <>
                  <h4>파일 업로드</h4>

                  {/* 파일 업로드 영역 */}
                  {uploadedFiles.length === 0 ? (
                    <div
                      className={`content-box upload-box ${uploading ? "disabled" : ""}`}
                      onClick={() =>
                        !uploading &&
                        document.getElementById("fileInput").click()
                      }
                      onDrop={async (e) => {
                        e.preventDefault();
                        if (uploading) return;
                        const f = e.dataTransfer.files?.[0];
                        if (f) await handleFileUpload(f);
                      }}
                      onDragOver={(e) => e.preventDefault()}
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
                          📂 파일 업로드 (클릭 또는 드래그)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="content-box file-list-box">
                      {uploadedFiles.map((f) => (
                        <div key={f.id} className="file-row">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(f.id)}
                            onChange={() => toggleSelect(f.id)}
                          />
                          <span className="file-name">{f.name}</span>

                          <button onClick={() => window.open(f.url, "_blank")}>
                            미리보기
                          </button>
                        </div>
                      ))}

                      <div className="file-list-footer">
                        <button
                          onClick={() =>
                            document.getElementById("fileInput").click()
                          }
                        >
                          ＋ 추가
                        </button>

                        <button
                          className="danger"
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
                  <div className="content-box ai-summary-box">
                    {selectedWeek.aiSummary ? (
                      <div
                        className="ai-text"
                        dangerouslySetInnerHTML={{
                          __html: selectedWeek.aiSummary.replace(/\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <p className="ai-placeholder">AI가 요약을 준비 중...</p>
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

              {/* 🔁 복습 탭 */}
              {activeTab === "복습" && (
                <>
                  <h4>AI 연습문제</h4>

                  <div className="ai-quiz-box">
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
