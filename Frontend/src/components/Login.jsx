// src/components/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInAnonymously } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      console.log("✅ Google 로그인 성공:", result.user.displayName);
      navigate("/");
    } catch (error) {
      console.error("❌ Google 로그인 실패:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/popup-closed-by-user":
        return "로그인 창이 닫혔습니다.";
      case "auth/network-request-failed":
        return "네트워크 연결을 확인해주세요.";
      default:
        return "로그인 중 오류가 발생했습니다.";
    }
  };

  // 🔥 익명 로그인
  const handleAnonymous = async () => {
    try {
      const result = await signInAnonymously(auth);
      console.log("🥷 익명 로그인:", result.user.uid);
      navigate("/");
    } catch (err) {
      console.error("익명 로그인 오류:", err);
      alert("익명 로그인 실패!");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* 로고 */}
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🌸</span>
            <h1>MAi Planner</h1>
          </div>
          <p className="login-subtitle">AI와 함께하는 스마트 학습 관리</p>
        </div>

        {/* 로그인 카드 */}
        <div className="login-card">
          <h2>로그인</h2>
          <p className="login-description">Google 계정으로 간편하게 시작하세요</p>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Google 버튼 */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-login-btn"
          >
            {loading ? (
              <>
                <div className="spinner"></div> 로그인 중...
              </>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25..."></path>
                  <path fill="#34A853" d="M12 23..."></path>
                  <path fill="#FBBC05" d="M5.84 14.09..."></path>
                  <path fill="#EA4335" d="M12 5.38..."></path>
                </svg>
                Google로 계속하기
              </>
            )}
          </button>

          {/* 🔥 익명 로그인 추가 */}
          <button onClick={handleAnonymous} className="skip-login-btn">
            로그인 건너뛰기
          </button>

          {/* 약관 */}
          <div className="login-footer">
            <p className="terms-text">
              로그인 시 <a href="/terms">이용약관</a>과{" "}
              <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.
            </p>
          </div>
        </div>

        {/* 소개 박스 3개 */}
        <div className="features-section">
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <div>
              <h3>스마트 학습 관리</h3>
              <p>과목별 자료와 일정을 한눈에</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <div>
              <h3>AI 맞춤 추천</h3>
              <p>나만의 AI 학습 도우미</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📝</span>
            <div>
              <h3>효율적인 복습</h3>
              <p>AI 문제 생성 & 오답 노트</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
