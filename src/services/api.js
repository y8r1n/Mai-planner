// src/services/api.js
import axios from "axios";

// 🔥 개발/배포 자동 전환
export const BASE_URL = import.meta.env.DEV
  ? "http://localhost:4003"
  : "https://mai-planner-backend.onrender.com";

// 🔥 공통 axios 인스턴스
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
});

// ❗ 공통 에러 인터셉터
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("💥 API 오류:", err.response || err.message);
    return Promise.reject(err);
  }
);

// =============== 서비스별 API ===============

// 일정 추천
export const withAI = {
  recommend: (data) => api.post("/with-ai/recommend", data),
};

// 요약
export const mentorAI = {
  summary: (data) => api.post("/mentor-ai/summary", data),
};

// 대화
export const mentorChat = {
  sendMessage: (data) => api.post("/mentor-chat/message", data),
};

// 퀴즈 생성
export const quizAI = {
  generateQuiz: (data) => api.post("/generate-quiz", data),
  generateExplanations: (data) => api.post("/generate-explanations", data),
};

// 이미지 생성
export const drawAI = {
  generateImage: (data) => api.post("/generate-image-diary", data),
};
