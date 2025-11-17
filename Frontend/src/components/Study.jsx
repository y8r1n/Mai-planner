//Subject 탭
import React, { useEffect, useState } from "react";
import "../styles/study.css";
import { db } from "../services/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { deleteSubjectCompletely } from "../utils/deleteUtils"; 

export default function Study() {
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    year: "2025",
    semester: "1",
    name: "",
  });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [dragStart, setDragStart] = useState(0);

  const navigate = useNavigate();

  // 🔹 과목 불러오기
  useEffect(() => {
    const q = query(collection(db, "subjects"), orderBy("year", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(data);
    });
    return () => unsub();
  }, []);

  // 🔹 과목 추가
  const addSubject = async () => {
    if (!newSubject.name.trim()) return;
    await addDoc(collection(db, "subjects"), newSubject);
    setShowModal(false);
    setNewSubject({ year: "2025", semester: "1", name: "" });
  };

  // 🔹 과목 수정 모달 열기
  const openEditModal = (subject) => {
    setNewSubject({
      year: subject.year,
      semester: subject.semester,
      name: subject.name,
    });
    setSelectedSubject(subject);
    setShowModal(true);
  };

  // 🔹 과목 업데이트
  const updateSubject = async () => {
    if (!selectedSubject) return;
    await updateDoc(doc(db, "subjects", selectedSubject.id), newSubject);
    setShowModal(false);
    setSelectedSubject(null);
  };

  // 🔹 학년/학기별 그룹화
  const groupedSubjects = subjects.reduce((acc, subj) => {
    const key = `${subj.year}학년도 ${subj.semester}학기`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(subj);
    return acc;
  }, {});

  return (
    <div className="study-page">
      <div className="study-container">
      {/* 상단 헤더 */}
      <div className="study-header-row">
        <h2 className="study-page-title">나의 과목</h2>
        <button className="study-add-btn" onClick={() => setShowModal(true)}>
          ＋
        </button>
      </div>

      <hr className="study-divider" />

      {/* 과목 리스트 */}
      {subjects.length === 0 ? (
        <div className="study-empty-box">
          <p>
            오른쪽 상단 ＋ 를 이용하여
            <br />
            과목을 추가해보세요!
          </p>
        </div>
      ) : (
        Object.keys(groupedSubjects)
          .sort((a, b) => b.localeCompare(a))
          .map((key) => (
            <div key={key} className="study-semester-block">
              <h3 className="study-semester-title">{key}</h3>

              {groupedSubjects[key].map((s) => (
                <div
                  key={s.id}
                  className={`study-subject-item-wrapper ${
                    selectedSubject?.id === s.id ? "show-actions" : ""
                  }`}
                  onTouchStart={(e) => setDragStart(e.touches[0].clientX)}
                  onTouchEnd={(e) => {
                    const diff = e.changedTouches[0].clientX - dragStart;
                    if (diff < -40) setSelectedSubject(s); // 왼쪽 드래그
                    else if (diff > 40) setSelectedSubject(null); // 오른쪽 드래그 시 닫기
                  }}
                  onMouseDown={(e) => setDragStart(e.clientX)}
                  onMouseUp={(e) => {
                    const diff = e.clientX - dragStart;
                    if (diff < -40) setSelectedSubject(s);
                    else if (diff > 40) setSelectedSubject(null);
                  }}
                >
                  <button
                    className="study-subject-item"
                    onClick={() => navigate(`/subject/${s.id}`)}
                  >
                    {s.name}
                  </button>

                  {/* 수정 / 삭제 버튼 */}
                  {selectedSubject?.id === s.id && (
                    <div className="study-edit-delete-btns">
                      <button
                        className="study-edit-btn"
                        onClick={() => openEditModal(s)}
                      >
                        수정
                      </button>
                      <button
                        className="study-delete-btn"
                        onClick={() => {
                          if (
                            window.confirm(
                              "이 과목의 모든 데이터(주차, 파일, 오답노트, 챗 기록 등)가 완전히 삭제됩니다. 계속하시겠습니까?"
                            )
                          ) {
                            deleteSubjectCompletely(s.id)
                              .then(() => {
                                alert("✅ 과목 전체 삭제 완료");
                                setSelectedSubject(null);
                              })
                              .catch((err) => {
                                console.error("삭제 중 오류:", err);
                                alert("삭제 중 오류가 발생했습니다.");
                              });
                          }
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
      )}

      {/* 모달 */}
      {showModal && (
        <div className="study-modal-bg">
          <div className="study-modal">
            <h4>{selectedSubject ? "과목 수정" : "기간 선택"}</h4>

            <div className="study-modal-row">
              <select
                value={newSubject.year}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, year: e.target.value })
                }
              >
                {[2025, 2024, 2023, 2022].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span>년도</span>
              <select
                value={newSubject.semester}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, semester: e.target.value })
                }
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
              <span>학기</span>
            </div>

            <label>과목명</label>
            <input
              type="text"
              placeholder="과목명을 입력하세요"
              value={newSubject.name}
              onChange={(e) =>
                setNewSubject({ ...newSubject, name: e.target.value })
              }
            />

            <div className="study-modal-btns">
              <button onClick={() => setShowModal(false)}>취소</button>
              <button onClick={selectedSubject ? updateSubject : addSubject}>
                {selectedSubject ? "수정" : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
