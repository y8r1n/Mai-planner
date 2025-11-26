// src/components/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInAnonymously } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import TutorialModal from "./TutorialModal";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

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
             <img src="/Logo.svg" alt="logo" />
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
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 계속하기
              </>
            )}
          </button>

          {/* 버튼 그룹 */}
          <div className="login-button-group">
            <button onClick={handleAnonymous} className="skip-login-btn">
              로그인 건너뛰기
            </button>

            {/* 🎓 개발자용 튜토리얼 테스트 버튼 */}
            <button 
              onClick={() => setShowTutorial(true)} 
              className="tutorial-test-btn"
              title="튜토리얼 미리보기"
            >
              튜토리얼
            </button>
          </div>

          {/* 약관 */}
          <div className="login-footer">
            <p className="terms-text">
              로그인 시 <a href="/terms">이용약관</a>과{" "}
              <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.
            </p>
          </div>
        </div>

        {/* 소개 박스 3개 */}
        <div className="features-wrapper">
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
             {/*점검시간*/}
      <div className="maintenance-box">
      <div className="maintenance-note">
        <p>⚠️ 매일 오전 0시 ~ 오후 24시: 서비스 점검 시간입니다.</p>
      </div>
      </div>

      {/* 푸터 */}
      <div className="login-footer">
        <div className="footer-note">ⓒ 2025. 22Z. All rights reserved.</div>
        </div>

      </div>

      {/* 튜토리얼 모달 */}
      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}