// src/services/api.js
import axios from "axios";

// 자동 환경 감지
const isDev = import.meta.env.DEV;

// 로컬 / 배포 자동 전환
export const BASE_URL = isDev
  ? "http://localhost:4003"
  : "https://mai-planner-backend.onrender.com";

// 공통 axios
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
});

// 오류 로그 공통 처리
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("💥 API 오류:", err.response || err.message);
    return Promise.reject(err);
  }
);

// =============== 그룹 API ===============
export const withAI = {
  recommend: (data) => api.post("/with-ai/recommend", data),
};

export const mentorAI = {
  summary: (data) => api.post("/mentor-ai/summary", data),
};

export const mentorChat = {
  message: (data) => api.post("/mentor-chat/message", data),
};

export const quizAI = {
  generate: (data) => api.post("/generate-quiz", data),
  explain: (data) => api.post("/generate-explanations", data),
};

export const drawAI = {
  diary: (data) => api.post("/generate-image-diary", data),
};
