// src/services/api.js

import axios from "axios";

// 자동 환경 감지
const BASE_URL = import.meta.env.DEV
  ? "http://localhost:4003"
  : "https://mai-planner.onrender.com";

// =========================
// 그룹별 axios 인스턴스
// =========================

// 📅 WITH AI 일정 추천
export const withAI = axios.create({
  baseURL: `${BASE_URL}/api/with-ai`,
});

// 📘 Mentor 요약
export const mentorAI = axios.create({
  baseURL: `${BASE_URL}/api/mentor-ai`,
});

// 💬 Mentor Chat
export const mentorChat = axios.create({
  baseURL: `${BASE_URL}/api/mentor-chat`,
});

// 🧩 퀴즈 생성 + 해설
export const quizAI = axios.create({
  baseURL: `${BASE_URL}`,
});

// 🎨 이미지 생성
export const drawAI = axios.create({
  baseURL: `${BASE_URL}/api`,
});
