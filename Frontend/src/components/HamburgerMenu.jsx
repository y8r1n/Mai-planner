// src/components/HamburgerMenu.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { signOut } from "firebase/auth";
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
  const [user, setUser] = useState(null);

  // 사용자 정보 구독
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 로그아웃 핸들러
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

  // 메뉴 항목 클릭 핸들러
  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  // 메뉴가 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="menu-overlay" onClick={onClose} />

      {/* 메뉴 사이드바 */}
      <div className={`hamburger-menu ${isOpen ? "open" : ""}`}>
        {/* 헤더 */}
        <div className="menu-header">
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* 프로필 섹션 */}
        <div className="menu-profile">
          {user ? (
            <>
              <div className="profile-avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h3>{user.displayName || "사용자"}</h3>
                <p>{user.email}</p>
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

        {/* 네비게이션 */}
        <nav className="menu-nav">
          <div className="nav-section">
            <div className="nav-section-title">메뉴</div>
            <button
              className="nav-item"
              onClick={() => handleNavigate("/")}
            >
              <Home size={20} />
              <span>HOME</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button
              className="nav-item"
              onClick={() => handleNavigate("/withai")}
            >
              <Sparkles size={20} />
              <span>WITH AI</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button
              className="nav-item"
              onClick={() => handleNavigate("/study")}
            >
              <BookOpen size={20} />
              <span>SUBJECT</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button
              className="nav-item"
              onClick={() => handleNavigate("/imagediary")}
            >
              <Image size={20} />
              <span>IMAGE DIARY</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button
              className="nav-item"
              onClick={() => handleNavigate("/alarm")}
            >
              <Bell size={20} />
              <span>알림</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
          </div>

          {/* 설정 섹션 */}
          <div className="nav-section">
            <div className="nav-section-title">설정</div>
            <button className="nav-item">
              <Settings size={20} />
              <span>AI 설정</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button className="nav-item">
              <Bell size={20} />
              <span>알림 설정</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
            <button className="nav-item">
              <Moon size={20} />
              <span>방해금지 시간</span>
              <ChevronRight size={18} className="nav-arrow" />
            </button>
          </div>
        </nav>

        {/* 로그아웃 버튼 */}
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