#📚 Mai-Planner — AI 기반 학습 플래너 웹앱

대학생의 학습 루틴을 돕기 위해 기획된 AI 학습 플래너
일정 추천, 요약, 챗봇, 이미지 기반 다이어리, 시간표 관리 등
학습과 감정 기록을 동시에 지원하는 AI Productivity Web App입니다.

🔗 배포 URL: https://mai-planner.vercel.app
🔗 백엔드 API URL: https://mai-planner-backend.onrender.com

#👩🏻‍💻 제작 목적 (Project Goal)
실제 대학생 학습 상황에 유용한 AI 학습 도구(MVP) 개발
공모전 출품 → 기능성 + 실사용성 + 확장성을 중심으로 설계
UI/UX 흐름, 데이터 구조, AI 자동화 기능 강조

#22Z team 
김재이: 아이디어 구상, 기능 구현, 테스팅 
이예린: 백 엔드, 프론트엔드 개발, UI/UX 디자인(Figma) 

#✨ 주요 기능 (Key Features)
🔥 AI 기반 기능

AI 일정 추천 — 하루의 기분·과목 기반으로 일정 3가지 자동 추천

AI 멘토 챗봇 — 과목별 대화형 학습 도움

AI 학습 요약 — 주차별 학습 내용을 AI가 3문단으로 요약

AI 객관식 퀴즈 생성 — 과목 기반 문제 자동 생성

AI 퀴즈 해설 — 틀린 문제에 대해 JSON 기반 해설 생성

AI 이미지 다이어리 — 감정 + 일기 → 이미지 생성 후 Firebase Storage 저장

📅 학습 관리 기능

시간표 기능 — 요일·시간 기반 블록형 UI, 수정·삭제·모달 UI

주차별 관리 — 주차 생성, 콘텐츠 추가, 파일 업로드

알림(Notification) — 과목별 알림 저장 및 표시

전체 UI 아이패드 4:3 기준 디자인 적용

#🏛 기술 스택 (Tech Stack)

**Frontend**
React 19
Vite 5
React Router
TailwindCSS 4
Lucide Icons

**Backend**
Node.js (Express)
Firebase Admin SDK
Firebase Firestore (Client + Admin)
Stability.ai API
OpenAI GPT-4o-mini
Deploy

#배포
Frontend → Vercel
Backend → Render (Web Service)
Storage → Firebase Storage

#📸 스크린샷 (Screenshots)

#🛠 프로젝트 구조 (Project Structure)
ai-planner/
├─ src/
│  ├─ components/
│  ├─ contexts/
│  ├─ services/
│  └─ styles/
├─ public/
├─ package.json
└─ README.md

#🚀 실행 방법 (How to Run)
▶ 1. 📦 프론트엔드 실행 (Vite)
npm install
npm run dev

로컬 주소:
http://localhost:5173

#▶ 2. 🔥 백엔드(Node.js Express) 실행

.env 준비:
OPENAI_API_KEY=...
STABILITY_KEY=...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MSG_ID=...
FIREBASE_APP_ID=...
**Admin key는 Render Secret에 업로드**


설치 및 실행:
npm install
node server-api.js

로컬 주소
http://localhost:4003

#🌐 배포 방법 (Deploy Guide)
🔵 Frontend (Vercel)
1) Vercel → New Project
2) GitHub Repo 연결
3) Framework: Vite
4) Build Command: vite build
5) Output: dist
6) Environment Variables 입력
7) Deploy

🟣 Backend (Render)
1) Render → New → Web Service
2) Build Command: npm install
3) Start Command: node server-api.js
4) Environment Variables 입력
5) Auto Deploy 활성화
6) Keep Alive 필요 없음 (무료 플랜은 sleep 모드)

#🔒 보안 정책 (Security)
serviceAccountKey.json → GitHub에 절대 업로드 ❌
모든 API KEY는 .env 또는 Render Secret에서 관리
서버는 CORS 정책으로 Vercel URL만 허용






📸 스크린샷 (Screenshots)
