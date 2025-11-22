import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  X,
  Home,
  Sparkles,
  BookOpen,
  Image,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  ChevronRight,
} from "lucide-react";
import "../styles/HamburgerMenu.css";

export default function HamburgerMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // Firebase Auth 기본 정보
  const [profile, setProfile] = useState(null); // Firestore users/{uid}

  // 🔥 1) Firebase Auth 구독
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      // Firestore 사용자 정보도 가져오기
      if (currentUser) {
        loadUserProfile(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔥 2) Firestore 사용자 정보 로드
  const loadUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    } catch (e) {
      console.error("❌ 프로필 로드 실패:", e);
    }
  };

  // 🔥 로그아웃
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("✅ 로그아웃 성공");
      navigate("/login");
      onClose();
    } catch (error) {
      console.error("❌ 로그아웃 실패:", error);
      alert("로그아웃에 실패했습니다.");
    }
  };

  // 🔥 라우팅
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  // 🔥 Firestore 프로필 우선 적용
  const displayName =
    profile?.name || user?.displayName || "사용자";

  const displayEmail =
    profile?.email || user?.email || "";

  const photoURL =
    profile?.photoURL || user?.photoURL || null;

  return (
    <>
      <div className="menu-overlay" onClick={onClose} />

      <div className={`hamburger-menu ${isOpen ? "open" : ""}`}>
        {/* 닫기 버튼 */}
        <div className="menu-header">
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* 프로필 */}
        <div className="menu-profile">
          {user ? (
            <>
              <div className="profile-avatar">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    {displayName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="profile-info">
                <h3>{displayName}</h3>
                <p>{displayEmail}</p>
              </div>
            </>
          ) : (
            <div className="profile-login">
              <User size={40} />
              <button
                className="login-btn"
                onClick={() => handleNavigate("/login")}
              >
                로그인하기
              </button>
            </div>
          )}
        </div>

        {/* 네비 메뉴 */}
        <nav className="menu-nav">
          <div className="nav-section">
            <div className="nav-section-title">메뉴</div>

            <button className="nav-item" onClick={() => handleNavigate("/")}>
              <Home size={20} />
              <span>HOME</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/withai")}>
              <Sparkles size={20} />
              <span>WITH AI</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/study")}>
              <BookOpen size={20} />
              <span>SUBJECT</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/imagediary")}>
              <Image size={20} />
              <span>IMAGE DIARY</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/alarm")}>
              <Bell size={20} />
              <span>알림</span>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 설정 */}
          <div className="nav-section">
            <div className="nav-section-title">설정</div>

            <button className="nav-item" onClick={() => handleNavigate("/settings")}>
              <Settings size={20} />
              <span>전체 설정</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/settings/ai")}>
              <Settings size={20} />
              <span>AI 설정</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/settings/notifications")}>
              <Bell size={20} />
              <span>알림 설정</span>
              <ChevronRight size={18} />
            </button>

            <button className="nav-item" onClick={() => handleNavigate("/settings/dnd")}>
              <Moon size={20} />
              <span>방해금지 시간</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </nav>

        {/* 로그아웃 */}
        {user && (
          <div className="menu-footer">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}