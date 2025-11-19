import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../services/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
      const user = result.user;

      console.log("✅ 로그인 성공:", user.displayName);

      // ==========================
      // 🔥 Firestore 사용자 문서 생성
      // ==========================
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "사용자",
          email: user.email,
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),

          // 초기 데이터
          settings: {
            notifications: true,
            darkMode: false,
          },
        });

        console.log("📁 새 사용자 문서 생성 완료");
      } else {
        console.log("📁 기존 사용자 문서 확인됨, 생성 생략");
      }

      navigate("/");
    } catch (error) {
      console.error("❌ 로그인 실패:", error);
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
      case "auth/too-many-requests":
        return "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
      default:
        return "로그인 중 오류가 발생했습니다.";
    }
  };

  // ==========================
  // ⛔ 로그인 건너뛰기 (개발용)
  // → Firestore에도 가짜 user 생성
  // ==========================
  const handleSkipLogin = async () => {
    const fakeId = "dev-user";

    const userRef = doc(db, "users", fakeId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: fakeId,
        name: "테스트 사용자",
        email: "dev@example.com",
        photoURL: "",
        createdAt: serverTimestamp(),
        settings: {
          notifications: true,
          darkMode: false,
        },
      });
    }

    localStorage.setItem("skipLogin", "true");
    window.location.href = "/";
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🌸</span>
            <h1>MAi Planner</h1>
          </div>
          <p className="login-subtitle">AI와 함께하는 스마트한 학습 관리</p>
        </div>

        <div className="login-card">
          <h2>로그인</h2>
          <p className="login-description">Google 계정으로 간편하게 시작하세요</p>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={loading} className="google-login-btn">
            {loading ? (
              <>
                <div className="spinner"></div>로그인 중...
              </>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07...."/>
                </svg>
                Google로 계속하기
              </>
            )}
          </button>

          <div className="login-footer">
            <p className="terms-text">
              로그인 시 <a href="/terms" className="terms-link">이용약관</a>과{" "}
              <a href="/privacy" className="terms-link">개인정보처리방침</a> 에 동의하게 됩니다.
            </p>
          </div>
        </div>

        {/* 개발용 skip login */}
        <button onClick={handleSkipLogin} style={{ marginTop: 20 }}>
          로그인 건너뛰기
        </button>
      </div>
    </div>
  );
}
