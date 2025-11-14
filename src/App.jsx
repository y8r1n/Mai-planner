import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import TodoTab from "./components/TodoTab";
import Calendar from "./components/Calendar";
import School from "./components/School";
import ImageDiary from "./components/ImageDiary";
import Study from "./components/Study";
import Withai from "./components/Withai";
import Subject from "./components/Subject";
import MentorChat from "./components/MentorChat";
import QuizAI from "./components/QuizAI";
import ReviewDetail from "./components/Reviewdetail";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import Alarm from "./components/Alarm"; // ⭐ 추가
import ClearNotifications from "./components/ClearNotifications"; // ⭐ 추가

function App() {
  return (
    <NotificationProvider>  {/* ⭐ 알림탭 이 부분만 추가 */}
    <>
    
      {/* 🔥 공통 네비게이터는 무조건 Routes 바깥! */}
      <NavBar />

      {/* 🔥 라우트는 딱 Routes 안에만 넣기 */}
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
        <Route path="/Alarm" element={<Alarm />} /> {/* ⭐ 추가 */}
        <Route path="/clear-notifications" element={<ClearNotifications />} /> {/* ⭐ 추가 */}
      </Routes>
      
    </>
    </NotificationProvider>  
  );
}

export default App;