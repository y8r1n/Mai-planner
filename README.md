#📚 Mai-Planner — AI 기반 학습 플래너 웹앱

대학생의 학습 루틴을 돕기 위해 기획된 AI 학습 플래너
일정 추천, 요약, 챗봇, 이미지 기반 다이어리, 시간표 관리 등
학습과 감정 기록을 동시에 지원하는 AI Productivity Web App입니다.

🔗 배포 URL: https://mai-planner.vercel.app/
🔗 백엔드 API URL:https://mai-planner.onrender.com

#👩🏻‍💻 제작 목적 (Project Goal)
실제 대학생 학습 상황에 유용한 AI 학습 도구(MVP) 개발
공모전 출품 → 기능성 + 실사용성 + 확장성을 중심으로 설계
UI/UX 흐름, 데이터 구조, AI 자동화 기능 강조

#22Z team 
김재이: 아이디어 구상, 프론트엔드 개발, 테스팅, 문서 작성
이예린: 백엔드, 프론트엔드 개발, UI/UX 디자인(Figma), 배포 작업

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
├─ Frontend/
│  ├─ components/
│  ├─ contexts/
│  ├─ services/
│  └─ styles/
├─ Backend/
│  ├─ firebase.json/
│  ├─ server-ai.js/
│  ├─ firebaserc/
│  └─ package.json/
├─ public/
├─ vercel.json
└─ README.md

#🚀 실행 방법 (How to Run)
▶ 1. 📦 프론트엔드 실행 (Vite)
npm install
npm run dev

혹은 

npm run build 
npm run dev 

로컬 주소:
http://localhost:4173

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

> Home Tab 
사용자의 일정을 등록시 볼 수 있는 화면 


<img width="1481" height="1403" alt="스크린샷 2025-11-18 141032" src="https://github.com/user-attachments/assets/2fcc7cc1-cc57-4e83-8b07-73edc0dda131" />


*-Todo list


<img width="1755" height="1398" alt="스크린샷 2025-11-18 141201" src="https://github.com/user-attachments/assets/6af6896c-ef80-4673-a077-a068d0aef83d" />

*-timetable 



<img width="1835" height="1368" alt="스크린샷 2025-11-18 141220" src="https://github.com/user-attachments/assets/08a9ea66-ff21-44ac-a9b7-a39698f64e46" />
<img width="1509" height="1363" alt="스크린샷 2025-11-18 141225" src="https://github.com/user-attachments/assets/8bca3182-e082-4191-85fa-9b049c7a820d" />



*-calender



<img width="1462" height="1365" alt="스크린샷 2025-11-18 141236" src="https://github.com/user-attachments/assets/2ef299d3-be31-464a-8da7-8f4a194e401c" />
<img width="1489" height="1360" alt="스크린샷 2025-11-18 141243" src="https://github.com/user-attachments/assets/6114bac6-6099-494b-bef4-ad254b1fe8df" />










> With AI
상단의 ✨ 버튼 누를 시 AI 추천 타임라인 일정 생성



<img width="1486" height="1360" alt="스크린샷 2025-11-18 141253" src="https://github.com/user-attachments/assets/67fba359-6f50-4ae8-9d6e-a2e67a77b83d" />
<img width="2099" height="1351" alt="스크린샷 2025-11-18 160842" src="https://github.com/user-attachments/assets/44eb36de-debe-45dc-b55c-172dd4f08e23" />
<img width="2160" height="1348" alt="스크린샷 2025-11-18 160902" src="https://github.com/user-attachments/assets/1c54f15c-28dc-4625-8c91-bb745144fb09" />
<img width="2132" height="1330" alt="스크린샷 2025-11-18 160853" src="https://github.com/user-attachments/assets/84ed776b-4577-436b-984e-156d51fcdb4e" />







> Subject
채팅봇과 연습문제집&해설 제공, 본인이 등록한 과목으로 복습 가능



<img width="1360" height="1370" alt="스크린샷 2025-11-18 141308" src="https://github.com/user-attachments/assets/bcdd9e03-36d5-406c-8e25-69b4db933ff4" />
<img width="570" height="1356" alt="스크린샷 2025-11-18 141646" src="https://github.com/user-attachments/assets/784d4ca1-a5b2-4e7b-9b76-9fc73554decc" />
<img width="578" height="1349" alt="스크린샷 2025-11-18 141407" src="https://github.com/user-attachments/assets/8727243f-477c-4e69-803d-5464f8e284e9" />
<img width="573" height="1353" alt="스크린샷 2025-11-18 141333" src="https://github.com/user-attachments/assets/7f98f311-2729-4725-b3e0-01a8d65c5493" />
<img width="570" height="1363" alt="스크린샷 2025-11-18 141321" src="https://github.com/user-attachments/assets/b3301e0b-6f31-460a-a9a3-3266f9d2e37d" />




> ImageDiary
오늘의 기분과 간단한 메시지로 이미지 일기 생성

<img width="2547" height="1363" alt="스크린샷 2025-11-18 141657" src="https://github.com/user-attachments/assets/93ee3020-4a07-4ee1-917b-241c9e411ddb" />









