import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";

// 공통 레이아웃
import Layout from "./components/Layout.jsx";

// 페이지들
import Home from "./components/Home.jsx";
import TodoTab from "./components/TodoTab.jsx";
import Calendar from "./components/Calendar.jsx";
import School from "./components/School.jsx";
import ImageDiary from "./components/ImageDiary.jsx";
import Study from "./components/Study.jsx";
import Withai from "./components/Withai.jsx";
import Subject from "./components/Subject.jsx";
import WeekDetail from "./components/WeekDetail.jsx"; 
import MentorChat from "./components/MentorChat.jsx";
import QuizAI from "./components/QuizAI.jsx";
import ReviewDetail from "./components/Reviewdetail.jsx";
import Alarm from "./components/Alarm.jsx";
import ClearNotifications from "./components/ClearNotifications.jsx";
import Login from "./components/Login.jsx";
import TutorialModal from "./components/TutorialModal.jsx";
import FCMTest from './components/FCMTest';
import NotificationTest from './components/NotificationTest';
import SettingsPage from './components/Settings/SettingsPage';
import NotificationSettings from './components/Settings/NotificationSettings';
import DoNotDisturbSettings from './components/Settings/DoNotDisturbSettings';
import AISettings from './components/Settings/AISettings';



// 전역 컨텍스트
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { AppProvider } from "./contexts/AppContext.jsx";

// 전역 UI
import LoadingSpinner from "./common/LoadingSpinner.jsx";
import ErrorMessage from "./common/ErrorMessage.jsx";
import Toast from "./common/Toast.jsx";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // 로그인 상태 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoadingAuth(false);

      // 로그인 성공 시 튜토리얼 체크
      if (u && !localStorage.getItem("tutorialShown")) {
        setShowTutorial(true);
      }
    });
    return () => unsub();
    
  }, []);
  useEffect(() => {
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    
    // 자동 모드 처리
    if (savedTheme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Firebase Auth가 초기화될 때까지 로딩 UI
  if (loadingAuth || user === undefined) {
    return (
      <div
        style={{
          textAlign: "center",
          paddingTop: "120px",
          fontSize: "18px",
        }}
      >
        🔄 로그인 상태 확인 중...
      </div>
    );
  }
  


  // 보호 라우트
  const Protected = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };
  
  return (
    <AppProvider>
      <NotificationProvider>
        <LoadingSpinner />
        <ErrorMessage />
        <Toast />

        {/* 튜토리얼 모달 */}
        {showTutorial && (
          <TutorialModal onClose={() => setShowTutorial(false)} />
        )}

        <Routes>
          {/* 로그인 페이지 */}
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* 기본 페이지 */}
            <Route
              path="/"
              element={
                <Protected>
                  <Home />
                </Protected>
              }
            />

            <Route
              path="/todotab"
              element={
                <Protected>
                  <TodoTab />
                </Protected>
              }
            />

            <Route
              path="/calendar"
              element={
                <Protected>
                  <Calendar />
                </Protected>
              }
            />

            <Route
              path="/school"
              element={
                <Protected>
                  <School />
                </Protected>
              }
            />

            <Route
              path="/withai"
              element={
                <Protected>
                  <Withai />
                </Protected>
              }
            />

            <Route
              path="/study"
              element={
                <Protected>
                  <Study />
                </Protected>
              }
            />

            <Route
              path="/imagediary"
              element={
                <Protected>
                  <ImageDiary />
                </Protected>
              }
            />

            {/* 🔥 NEW: 과목 상세 (주차 목록) */}
            <Route
              path="/subject/:id"
              element={
                <Protected>
                  <Subject />
                </Protected>
              }
            />

            {/* 🔥 NEW: 주차 상세 페이지 */}
            <Route
              path="/subject/:subjectId/week/:weekId"
              element={
                <Protected>
                  <WeekDetail />
                </Protected>
              }
            />

            {/* 멘토챗 / 퀴즈AI / 복습 */}
            <Route
              path="/mentorchat/:subjectId/:weekId"
              element={
                <Protected>
                  <MentorChat />
                </Protected>
              }
            />

            <Route
              path="/quizai/:subjectId/:weekId"
              element={
                <Protected>
                  <QuizAI />
                </Protected>
              }
            />

            <Route
              path="/reviewdetail/:subjectId/:weekId/:noteId"
              element={
                <Protected>
                  <ReviewDetail />
                </Protected>
              }
            />

            {/* 알림 */}
            <Route
              path="/alarm"
              element={
                <Protected>
                  <Alarm />
                </Protected>
              }
            />
            <Route
              path="/clear-notifications"
              element={
                <Protected>
                  <ClearNotifications />
                </Protected>
              }
            />
          </Route>
          <Route path="/fcm-test" element={<FCMTest />} />
          <Route path="/notification-test" element={<NotificationTest />} />
          
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/settings/dnd" element={<DoNotDisturbSettings />} />
          <Route path="/settings/ai" element={<AISettings />} />
        </Routes>
      </NotificationProvider>
    </AppProvider>
  );
}