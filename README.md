<div align="center">
<img width="120" src=""> <br/> <h1>📘 Mai Better Life — MAI Planner</h1> <p><b>AI 기반 일정 · 학습 · 감정 기록 · 라이프스타일 관리 플랫폼</b></p> <p>WithAI 일정 추천 · MentorChat · 주차별 학습 관리 · 이미지 일기 · 시간 패턴 분석</p> <br/> </div>

<br/> <h3>✨ 프로젝트 한눈에 보기<h3/>

일상을 더 똑똑하게, 더 나답게.<br/>
<br/>
AI를 활용해 “공부 · 일정 · 감정 · 시각화 · 루틴”을
<br/>
<br/>한 곳에서 관리하도록 설계한 All-in-One Life Planner.

<br/> 

## 📸 Preview 

<br/>

## 📄 Documentation

<details>
<summary><b> 📕All-in-One 문서 폴더 (전체 자료 모음)</b></summary>
<br>

보완자료 + 기술문서 + 시연자료 + Figma + 이미지 + 제출물  
모든 산출물을 하나로 통합한 전체 폴더입니다.

🔗 **전체 문서(ALL Docs)**  
https://drive.google.com/drive/folders/12k4O1Cgb8CNY689bGvlXK6s9ERUfigss?usp=drive_link

</details>

<br/>

## <h3>🧩 1. 프로젝트 개요 (Overview)</h3>

Mai Planner는 대학생의 실제 학습 상황을 기반으로 설계된
AI 기반 개인 일정/학습 관리 플랫폼입니다.

사용자는 다음과 같은 기능을 사용할 수 있습니다:

하루 목표에 맞춘 AI 일정 추천

주차별 학습 정리 + AI 요약/설명

감정 기반 이미지 일기 생성

시간/루틴 패턴 분석

사용자 커리어 관리(확장 예정)

## <h3>🎯 1-2. 제작 목적 (Project Goal)</h3>

대학생 학습 환경에 필요한 AI 기반 학습 도구(MVP) 제작

공모전 제출을 위한 기능성 + 실사용성 + UX 중심 구조 설계

AI의 자동화 기능을 적극 활용한 사용자 경험 개선

## <h3>🎛️ 2. 핵심 기능 (Features) </h3>
🔹 1) WithAI — 일정 추천

날짜 / 과목 / 기분 입력 → AI가 현실적인 활동 3개 추천

Firestore에 자동 저장해 히스토리 관리

🔹 2) MentorChat — 주차별 학습 챗봇

수업 내용을 입력하면 요약/설명/문답 지원

GPT-4o 기반 실시간 대화

Firestore 실시간 반영(onSnapshot)

주차별 AI 피드백 기록

🔹 3) MentorAI — 핵심 요약

복잡한 텍스트를 핵심으로 자동 요약

어려운 개념을 쉬운 언어로 재설명

🔹 4) Image Diary — 감정 기반 이미지 일기

“오늘의 기분 + 메시지” → Stability + OpenAI로 이미지 생성

Firebase Storage에 자동 업로드 후 URL 저장

감성 기반 하루 기록

🔹 5) SUBJECT — 주차별 학습 관리

과목 → 주차 생성 → 이미지/메모 업로드

Firebase Storage 저장

주차 전체 삭제(deleteWeekCompletely)

연습문제집 & 해설 제공 플로우

🔹 6) Visualization — 시간 패턴 분석

하루/주간 시간 사용 패턴 시각화

공부/휴식/루틴 분포 파악에 도움

개인화 추천 기능으로 확장 예정

🔹 7) Career — 자격증/목표 관리 (확장 예정)

자격증 일정 및 루틴 관리

목표 달성률 기반 추천 기능 계획

##  <h3>🏗️ 3. 기술 스택 (Tech Stack)</h3>

>Frontend

React 19

Vite 5

TailwindCSS

React Router

Lucide Icons

Framer Motion

Firebase Auth

Axios

>Backend

Node.js (Express)

Firebase Admin SDK

Firestore(Admin + Client)

Stability AI API

GPT-4o / GPT-4o-mini

Database / Storage

Firestore

Firebase Storage

>DevOps

Frontend: Vercel

Backend: Render

CDN: Firebase Storage

## <h3>📂 4. 디렉토리 구조 (Project Structure)</h3>

````
mai-planner/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home/
│   │   │   ├── WithAI/
│   │   │   ├── Subject/
│   │   │   ├── MentorChat/
│   │   │   ├── ImageDiary/
│   │   │   └── Common/
│   │   ├── contexts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── App.jsx
│   ├── public/
│   └── vite.config.js
│
└── backend/
    ├── routes/
    │   ├── with-ai.js
    │   ├── mentor-ai.js
    │   ├── mentor-chat.js
    │   └── diary.js
    ├── config/
    │   └── firebase.js
    ├── services/
    │   ├── openai.js
    │   └── stability.js
    ├── server.js
    └── package.json
````


## <h3>🚀 5. 실행 방법 (How to Run)</h3>

## Frontend


```
npm install
npm run dev

http://localhost:5173
```



## Backend

.env 필요:


```
OPENAI_API_KEY=
STABILITY_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MSG_ID=
FIREBASE_APP_ID=
```


관리자 키는 Render Secret 사용

```
npm install
node server.js
```


## <h3>🌐 6. 배포 (Deployment)</h3>


## Frontend – Vercel

Framework: Vite

Build: vite build

Output: dist

Env 등록

Deploy

## Backend – Render

Build: npm install

Start: node server.js

Env 등록

Auto Deploy on

Sleep Mode OK
<br/>

## <h3>🔒 7. 보안 정책 (Security)</h3>

serviceAccountKey.json → 절대 GitHub에 업로드 금지

모든 KEY는 .env 또는 Render Secret

CORS = Vercel URL만 허용

## <h1>🤝 8. Team 22Z </h1>
👥 Team Members

### 👩🏻‍💻 김재이 (Frontend Developer / Product Planner)
Github: https://github.com/jkimj

Email: jkimj2004@naver.com

<details>
<summary> <b> Roles & Contributions </b> </summary>

Frontend Development

React UI 구성 (Login page, Alarm page)

Lucide icon 전체 페이지 스타일링 및 개선 

사용자 플로우 테스트 및 UI 디테일 조정

AI 서버 디테일 수정, 연동 작업 

모바일·PC 반응형 적용

Product Planning

프로젝트 전체 아이디어 및 기능 기획

서비스 구조도, 스토리보드 작성

User Scenario 제작 및 기능 검증

Documentation & QA

기술 문서/기획 문서 제작

테스트 케이스 작성 및 품질 검증

제출 자료 정리

</details>


### 👩🏻‍💻 이예린 (Full-Stack Developer / AI Integration)
Github: https://github.com/y8r1n

Email: yesrin14@gmail.com

<details>
<summary> <b> Roles & Contributions </b></summary>

Backend Development

Node.js + Express 기반 서버 구축

Firebase Admin SDK 연동

AI API(OpenAI, Stability) 통합

서버 라우트(with-ai, mentor-ai, diary 등) 설계 및 구현

데이터 모델링(Firestore 구조 설계)

Frontend Development

React 기반 UI 컴포넌트 구축

TailwindCSS 스타일링 및 UX 개선

MentorChat / WithAI / Subject / ImageDiary 주요 기능 구현

실시간 데이터 연동(onSnapshot)

AI & System Integration

GPT-4o/4o-mini 모델 활용 자동 요약·추천 서비스 구축

이미지 생성 파이프라인 설계

Core Feature AI-Flow 개발 (MentorAI, WithAI 로직 등)

Deployment

Vercel(Frontend) / Render(Backend) 배포

.env / 시크릿 관리 및 보안 구성

CORS 안정성 설정 및 최적화

UI/UX & Product Design

Figma 기반 전체 화면 설계

</details>


