// src/services/api.js
import axios from "axios";

// 자동 환경 감지
const BASE_URL = import.meta.env.DEV
  ? "http://localhost:4003"
  : "https://mai-planner-backend.onrender.com";

// 📅 일정 추천
export const withAI = axios.create({
  baseURL: `${BASE_URL}/api/with-ai`,
});

// 📘 요약
export const mentorAI = axios.create({
  baseURL: `${BASE_URL}/api/mentor-ai`,
});

// 💬 대화
export const mentorChat = axios.create({
  baseURL: `${BASE_URL}/api/mentor-chat`,
});

// 🧩 퀴즈 생성
export const quizAI = axios.create({
  baseURL: `${BASE_URL}/api/quiz-ai`,
});

// 🎨 이미지 생성
export const drawAI = axios.create({
  baseURL: `${BASE_URL}/api/draw-ai`,
});
