// src/services/api.js
import axios from "axios";

// 백엔드 Render URL
const BASE_URL = "https://mai-planner-backend.onrender.com/api";

// 📅 일정 추천 (WithAI)
export const withAI = axios.create({
  baseURL: `${BASE_URL}/with-ai`,
});

// 📘 요약 (MentorAI)
export const mentorAI = axios.create({
  baseURL: `${BASE_URL}/mentor-ai`,
});

// 💬 대화 (MentorChat)
export const mentorChat = axios.create({
  baseURL: `${BASE_URL}/mentor-chat`,
});

// 🧩 퀴즈 (QuizAI)
export const quizAI = axios.create({
  baseURL: `${BASE_URL}`,
});

// 🎨 이미지 생성 (DRAW)
export const drawAI = axios.create({
  baseURL: `${BASE_URL}`,
});
