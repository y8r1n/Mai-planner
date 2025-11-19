import React, { useState, useEffect } from "react";
import { drawAI, quizAI } from "../services/api";
import { db, auth } from "../services/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Trash2, Calendar, Filter, Search, X } from "lucide-react";
import "../styles/ImageDiary.css";

export default function ImageDiary() {
  const user = auth.currentUser;
  const userId = user?.uid || "test-user";

  const [emotion, setEmotion] = useState("평온 🌿");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedEmotion, setSelectedEmotion] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [modalImg, setModalImg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /* 🔥 Firestore 실시간 구독: users/{uid}/imageDiary */
  useEffect(() => {
    if (!userId) return;

    const q = collection(db, "users", userId, "imageDiary");

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtered = data.filter((item) => item.imageUrl);

      const sorted = filtered.sort((a, b) => {
        const aT = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : a.createdAt || 0;

        const bT = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : b.createdAt || 0;

        return bT - aT;
      });

      setEntries(sorted);
      setFilteredEntries(sorted);
    });

    return () => unsub();
  }, [userId]);

  /* 🔥 필터링 */
  useEffect(() => {
    let result = [...entries];

    if (selectedMonth !== "all") {
      result = result.filter((entry) => {
        const t = entry.createdAt?.seconds
          ? entry.createdAt.seconds * 1000
          : entry.createdAt;

        if (!t) return false;
        return new Date(t).getMonth() + 1 === Number(selectedMonth);
      });
    }

    if (selectedEmotion !== "all") {
      result = result.filter((entry) =>
        entry.emotion?.includes(selectedEmotion)
      );
    }

    if (searchQuery.trim()) {
      result = result.filter((entry) =>
        entry.diaryText?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEntries(result);
  }, [entries, selectedMonth, selectedEmotion, searchQuery]);

  /* 🔥 AI 이미지 생성 */
  const handleCreate = async () => {
    if (!text.trim()) return alert("일기를 입력하세요!");

    setLoading(true);
    try {
      await drawAI.post("/generate-image-diary", {
        emotion,
        diaryText: text,
        userId, // ⭐ 진짜 사용자 ID 전달
      });

      setText("");
    } catch (e) {
      console.error("이미지 생성 실패:", e);
      alert("AI 이미지 생성 실패!");
    } finally {
      setLoading(false);
    }
  };

  /* 🔥 개별 삭제 */
  const handleDelete = async (entryId) => {
    try {
      await deleteDoc(doc(db, "users", userId, "imageDiary", entryId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제 실패!");
    }
  };

  /* 🔥 월 목록 생성 */
  const getAvailableMonths = () => {
    const months = new Set();
    entries.forEach((entry) => {
      const t = entry.createdAt?.seconds
        ? entry.createdAt.seconds * 1000
        : entry.createdAt;
      if (t) months.add(new Date(t).getMonth() + 1);
    });
    return [...months].sort((a, b) => b - a);
  };

  const resetFilters = () => {
    setSelectedMonth("all");
    setSelectedEmotion("all");
    setSearchQuery("");
  };

  return (
    <div className="diary-page">
      {/* 헤더 */}
      <div className="diary-header">
        <h2 className="diary-title">🌤 AI 이미지 다이어리</h2>
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          필터
        </button>
      </div>

      {/* 필터 영역 */}
      {showFilters && (
        <div className="diary-filters">
          <div className="filter-row">
            {/* 검색 */}
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="일기 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 월 */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="filter-select"
            >
              <option value="all">전체 월</option>
              {getAvailableMonths().map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>

            {/* 감정 */}
            <select
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
              className="filter-select"
            >
              <option value="all">전체 감정</option>
              <option value="기쁨">기쁨 😊</option>
              <option value="슬픔">슬픔 😢</option>
              <option value="분노">분노 😡</option>
              <option value="평온">평온 🌿</option>
              <option value="설렘">설렘 💖</option>
            </select>

            <button className="reset-filters-btn" onClick={resetFilters}>
              초기화
            </button>
          </div>

          <div className="filter-info">
            총 {filteredEntries.length}개의 기록
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="diary-input-section">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="오늘 하루를 기록해보세요 🌸"
        />

        <div className="diary-controls">
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
          >
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
      </div>

      {/* 갤러리 */}
      {filteredEntries.length === 0 ? (
        <div className="diary-empty">
          <Calendar size={48} />
          <p>아직 작성된 다이어리가 없습니다.</p>
        </div>
      ) : (
        <div className="diary-gallery">
          {filteredEntries.map((entry) => {
            const time = entry.createdAt?.seconds
              ? entry.createdAt.seconds * 1000
              : entry.createdAt;

            return (
              <div key={entry.id} className="diary-card fade-in">
                <button
                  className="diary-delete-btn"
                  onClick={() => setDeleteConfirm(entry.id)}
                >
                  <Trash2 size={16} />
                </button>

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

                  {time && (
                    <p className="diary-date">
                      {new Date(time).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 이미지 확대 */}
      {modalImg && (
        <div className="modal" onClick={() => setModalImg(null)}>
          <img src={modalImg} className="modal-img" alt="" />
        </div>
      )}

      {/* 삭제 모달 */}
      {deleteConfirm && (
        <div className="delete-modal-bg" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ 삭제 확인</h3>
            <p>정말 삭제하시겠습니까?</p>
            <p className="delete-warning">삭제된 기록은 복구될 수 없습니다.</p>

            <div className="delete-modal-btns">
              <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>
                취소
              </button>
              <button
                className="confirm-btn"
                onClick={() => handleDelete(deleteConfirm)}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
