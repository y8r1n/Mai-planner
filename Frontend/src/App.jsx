import { Routes, Route } from "react-router-dom";

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
import MentorChat from "./components/MentorChat.jsx";
import QuizAI from "./components/QuizAI.jsx";
import ReviewDetail from "./components/Reviewdetail.jsx";
import Alarm from "./components/Alarm.jsx";
import ClearNotifications from "./components/ClearNotifications.jsx";

// 전역 컨텍스트
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { AppProvider } from "./contexts/AppContext.jsx";

// 전역 UI
import LoadingSpinner from "./common/LoadingSpinner.jsx";
import ErrorMessage from "./common/ErrorMessage.jsx";
import Toast from "./common/Toast.jsx";

function App() {
  return (
    <AppProvider>
      <NotificationProvider>

        <LoadingSpinner />
        <ErrorMessage />
        <Toast />

        <Routes>

          {/* 공통 Layout 적용 */}
          <Route element={<Layout />}>
            {/* 기본 페이지 */}
            <Route path="/" element={<Home />} />
            <Route path="/todotab" element={<TodoTab />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/school" element={<School />} />
            <Route path="/withai" element={<Withai />} />
            <Route path="/study" element={<Study />} />
            <Route path="/imagediary" element={<ImageDiary />} />

            {/* 상세 페이지 */}
            <Route path="/subject/:id" element={<Subject />} />
            <Route path="/mentorchat/:subjectId/:weekId" element={<MentorChat />} />
            <Route path="/quizai/:subjectId/:weekId" element={<QuizAI />} />
            <Route path="/reviewdetail/:subjectId/:weekId/:noteId" element={<ReviewDetail />} />

            {/* 알림 */}
            <Route path="/alarm" element={<Alarm />} />
            <Route path="/clear-notifications" element={<ClearNotifications />} />
          </Route>

        </Routes>

      </NotificationProvider>
    </AppProvider>
  );
}

export default App;
