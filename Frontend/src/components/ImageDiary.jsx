import React, { useState, useEffect } from "react";
import { drawAI } from "../services/api";
import { db, auth } from "../services/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Trash2, Calendar, Filter, Search, X } from "lucide-react";
import "../styles/ImageDiary.css";

export default function ImageDiary() {
  const [userId, setUserId] = useState(null);
  
  // ⭐ userId 제대로 가져오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("✅ 로그인된 사용자:", user.uid);
        setUserId(user.uid);
      } else {
        console.log("❌ 로그인 안 됨");
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ⭐ 프록시 URL 생성
  const getProxyImageUrl = (entry) => {
    if (!userId) {
      console.warn("⚠️ userId가 없습니다");
      return "";
    }

    // filename이 있으면 사용 (새 방식)
    if (entry.filename) {
      const baseUrl = import.meta.env.DEV 
        ? "http://localhost:4003" 
        : "https://mai-planner.onrender.com";
      
      const proxyUrl = `${baseUrl}/api/image/${userId}/${entry.filename}`;
      console.log("🔄 프록시 URL (filename):", proxyUrl);
      return proxyUrl;
    }
    
    // filename이 없으면 imageUrl에서 추출 (기존 방식)
    if (entry.imageUrl) {
      const parts = entry.imageUrl.split("/");
      const filename = parts[parts.length - 1].split("?")[0];
      
      const baseUrl = import.meta.env.DEV 
        ? "http://localhost:4003" 
        : "https://mai-planner.onrender.com";
      
      const proxyUrl = `${baseUrl}/api/image/${userId}/${filename}`;
      console.log("🔄 프록시 URL (imageUrl):", proxyUrl);
      return proxyUrl;
    }
    
    return "";
  };

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

  useEffect(() => {
    if (!userId) {
      console.log("⏳ userId 대기 중...");
      return;
    }

    console.log("📡 Firestore 구독 시작:", userId);

    const q = collection(db, "users", userId, "imageDiary");

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("📊 Firestore 데이터:", data.length, "개");

      const filtered = data.filter((item) => item.imageUrl);

      const sorted = filtered.sort((a, b) => {
        const aT = a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : a.createdAt || Date.now();

        const bT = b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : b.createdAt || Date.now();

        return bT - aT;
      });

      setEntries(sorted);
      setFilteredEntries(sorted);
    });

    return () => unsub();
  }, [userId]);

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

  const handleCreate = async () => {
    if (!text.trim()) return alert("일기를 입력하세요!");
    if (!userId) return alert("로그인이 필요합니다!");

    setLoading(true);
    try {
      console.log("🎨 이미지 생성 요청:", { userId, emotion, diaryText: text.substring(0, 50) });
      
      await drawAI.post("/generate-image-diary", {
        emotion,
        diaryText: text,
        userId,
      });

      setText("");
      console.log("✅ 이미지 생성 요청 성공");
    } catch (e) {
      console.error("❌ 이미지 생성 실패:", e);
      alert("AI 이미지 생성 실패!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!userId) return;
    
    try {
      await deleteDoc(doc(db, "users", userId, "imageDiary", entryId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("삭제 실패:", e);
      alert("삭제 실패!");
    }
  };

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

  // 로그인 대기 중
  if (userId === null) {
    return (
      <div className="diary-page">
        <div className="diary-empty">
          <Calendar size={48} />
          <p>로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="diary-page">
      <div className="diary-header">
        <h2 className="diary-title">  AI 이미지 다이어리</h2>
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          필터
        </button>
      </div>

      {showFilters && (
        <div className="diary-filters">
          <div className="filter-row">
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

            const imageUrl = getProxyImageUrl(entry);

            return (
              <div key={entry.id} className="diary-card fade-in">
                <button
                  className="diary-delete-btn"
                  onClick={() => setDeleteConfirm(entry.id)}
                >
                  <Trash2 size={16} />
                </button>

                <img
                  src={imageUrl}
                  alt="AI diary"
                  className="diary-img"
                  onClick={() => setModalImg(imageUrl)}
                  onError={(e) => {
                    console.error("❌ 이미지 로드 실패:", imageUrl);
                    e.target.style.backgroundColor = "#f0f0f0";
                    e.target.style.minHeight = "200px";
                    e.target.alt = "이미지 로드 실패";
                  }}
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

      {modalImg && (
        <div className="modal" onClick={() => setModalImg(null)}>
          <img src={modalImg} className="modal-img" alt="" />
        </div>
      )}

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