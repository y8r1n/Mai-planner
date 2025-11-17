import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
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
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import Alarm from "./components/Alarm.jsx"; 
import ClearNotifications from "./components/ClearNotifications"; 
import { AppProvider } from "./contexts/AppContext .jsx";
import LoadingSpinner from "./common/LoadingSpinner.jsx";
import ErrorMessage from "./common/ErrorMessage.jsx";
import Toast from "./common/Toast.jsx";

function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        {/* 전역 UI 컴포넌트 */}
        <LoadingSpinner />
        <ErrorMessage />
        <Toast />

        {/* 공통 네비게이터 */}
        <NavBar />

        {/* 라우트 */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/TodoTab" element={<TodoTab />} />
          <Route path="/Calendar" element={<Calendar />} />
          <Route path="/School" element={<School />} />
          <Route path="/imagediary" element={<ImageDiary />} />
          <Route path="/Study" element={<Study />} />
          <Route path="/withai" element={<Withai />} />
          <Route path="/subject/:id" element={<Subject />} />
          <Route path="/Mentorchat/:subjectId/:weekId" element={<MentorChat />} />
          <Route path="/QuizAI/:subjectId/:weekId" element={<QuizAI />} />
          <Route path="/ReviewDetail/:subjectId/:weekId/:noteId" element={<ReviewDetail />} />
          <Route path="/Alarm" element={<Alarm />} />
          <Route path="/clear-notifications" element={<ClearNotifications />} />
        </Routes>
      </NotificationProvider>
    </AppProvider>
  );
}

export default App;