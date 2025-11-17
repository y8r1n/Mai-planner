import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// 🎨 디자인 시스템
import "./styles/design-system.css";

// 🎨 글로벌 스타일
import "./index.css";

// 🎨 전역 UI 스타일
import "./styles/loading.css";
import "./styles/error.css";
import "./styles/toast.css";

// 🎨 리팩터링된 컴포넌트 스타일
import "./styles/navbar-refactored.css";
import "./styles/home-refactored.css";
import "./styles/WithAi-refactored.css";
import "./styles/Subject-refactored.css";
import "./styles/todotab-refactored.css";

// 🎨 기존 스타일
import "./styles/alarm.css";
import "./styles/CalendarCustom.css";
import "./styles/school.css";
import "./styles/mentorchat.css";
import "./styles/quizai.css";
import "./styles/reviewdetail.css";
import "./styles/ImageDiary.css";
import "./styles/study.css";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
