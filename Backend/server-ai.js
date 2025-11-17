//  server-ai.js
/* ========================================================================== */
/* 📦 Imports */
/* ========================================================================== */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import detect from "detect-port";
import FormData from "form-data";
import admin from "firebase-admin";

// Firebase Client SDK
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";

dotenv.config();

/* ========================================================================== */
/* 🔐 Load Firebase Admin Secret */
/* ========================================================================== */

// 🔥 Render Secret Files 경로
const serviceAccountPath = "/etc/secrets/serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ serviceAccountKey.json 파일이 존재하지 않습니다!");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);


/* ========================================================================== */
/* 🚀 Express Init */
/* ========================================================================== */
const app = express();

// 🔥 CORS 완전 정상화
const allowedOrigins = [
  "http://localhost:5173",
  "https://mai-planner.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

/* ========================================================================== */
/* 🔥 Firebase Admin Init */
/* ========================================================================== */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const adminDb = admin.firestore();
const bucket = admin.storage().bucket();

/* ========================================================================== */
/* 🔥 Firebase Client Init */
/* ========================================================================== */
const clientApp = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MSG_ID,
  appId: process.env.FIREBASE_APP_ID,
});
const db = getFirestore(clientApp);

/* ========================================================================== */
/* 🧠 공통 OpenAI Request Handler (안정화 버전) */
/* ========================================================================== */
async function callOpenAI(prompt, model = "gpt-4o-mini", jsonMode = false) {
  try {
  const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com";

    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await axios.post(
      `${apiBase}/v1/chat/completions`,
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10초 타임아웃 추가 (서버 멈춤 방지)
      }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
  } catch (e) {
    console.error("❌ OpenAI 요청 오류:", e.response?.data || e.message);
    throw new Error("OpenAI 요청 실패 (callOpenAI)");
  }
}


/* ========================================================================== */
/* 🎯 Helper: JSON 안전 파싱 */
/* ========================================================================== */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    return JSON.parse(text.slice(start, end));
  }
}

/* ========================================================================== */
/* 🧭 WITH AI — 일정 추천 */
/* ========================================================================== */
app.post("/api/with-ai/recommend", async (req, res) => {
  const { day = "오늘", subject = "공부", mood = "" } = req.body;

  const prompt = `
"${day}" 하루 동안 "${subject}" 관련 추천 활동 3가지를 제안해줘.
기분: ${mood}
JSON 배열만 출력.
  `;

  try {
    const result = await callOpenAI(prompt, "gpt-4o-mini", true);
    const json = safeJsonParse(result);

    await adminDb.collection("withAI_recommendations").add({
      day,
      subject,
      mood,
      recommendations: json,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, recommendations: json });
  } catch (e) {
    console.error("❌ 일정 추천 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 💬 Mentor Chat */
/* ========================================================================== */
app.post("/api/mentor-chat/message", async (req, res) => {
  const { messages = [], subjectName } = req.body;
  const userText = messages[messages.length - 1]?.content || "";

  try {
    const prompt = `"${subjectName}" 멘토처럼 답변해줘: "${userText}"`;
    const reply = await callOpenAI(prompt);

    res.json({ success: true, reply });
  } catch (e) {
    console.error("❌ mentor-chat 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 📘 Mentor Summary */
/* ========================================================================== */
app.post("/api/mentor-ai/summary", async (req, res) => {
  const { subjectName, weekTitle } = req.body;

  const prompt = `"${subjectName}" / "${weekTitle}" 요약해줘 (3문단 이하)`;

  try {
    const summary = await callOpenAI(prompt);

    res.json({ success: true, summary });
  } catch (e) {
    console.error("❌ 요약 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🧩 Quiz 생성 */
/* ========================================================================== */
app.post("/api/generate-quiz", async (req, res) => {
  const { subjectName, count = 5 } = req.body;

  const prompt = `
"${subjectName}" 과목의 객관식 ${count}문제를 JSON 배열로 생성해줘.
형식:
[
 { "question": "...", "options": [".."], "answer": 0 }
]
`;

  try {
    const result = await callOpenAI(prompt);
    const json = safeJsonParse(result);

    res.json({ success: true, questions: json });
  } catch (e) {
    console.error("❌ quiz 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 📖 Quiz 해설 */
/* ========================================================================== */
app.post("/api/generate-explanations", async (req, res) => {
  const { questions = [], userAnswers = [] } = req.body;

  if (questions.length === 0) {
    return res.status(400).json({ success: false, error: "문제가 없습니다." });
  }

  const mapped = questions.map((q, i) => ({
    number: i + 1,
    question: q.question,
    correct: String.fromCharCode(65 + (q.correctAnswer ?? q.answer ?? 0)),
    mine:
      userAnswers[i] !== null && userAnswers[i] !== undefined
        ? String.fromCharCode(65 + userAnswers[i])
        : "-",
  }));

  const prompt = `
아래 문제들에 대해 번호별 해설을 작성해줘.
반드시 JSON 배열 ONLY:
[
 {"explanation":"..."},
]
문제 목록:
${JSON.stringify(mapped, null, 2)}
`;

  try {
    const result = await callOpenAI(prompt);

    const first = result.indexOf("[");
    const last = result.lastIndexOf("]") + 1;

    const json = JSON.parse(result.slice(first, last));

    res.json({ success: true, explanations: json });
  } catch (e) {
    console.error("❌ 해설 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🎨 이미지 다이어리 */
/* ========================================================================== */
app.post("/api/generate-image-diary", async (req, res) => {
  const { emotion, diaryText, userId = "guest" } = req.body;

  try {
    const cleanEmotion = emotion.replace(/[^\p{Emoji}]/gu, "").trim();

    const promptText = await callOpenAI(
      `Convert to English artistic image prompt:
Emotion: "${cleanEmotion}"
Diary: "${diaryText}"
Only English.`
    );

    // Stable Diffusion 이미지 생성
    const form = new FormData();
    form.append("prompt", promptText);
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "png");

    const imgRes = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      form,
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_KEY}`,
          ...form.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(imgRes.data);
    const fileName = `imageDiary/${userId}/${Date.now()}.png`;

    // Firebase Upload
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: "image/png" });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });

    // Firestore 기록
    await addDoc(collection(db, "imageDiary"), {
      userId,
      emotion: cleanEmotion,
      diaryText,
      imageUrl: url,
      createdAt: serverTimestamp(),
    });

    res.json({ success: true, imageUrl: url });
  } catch (e) {
    console.error("❌ 이미지 생성 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🩺 Health Check */
/* ========================================================================== */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Mai-planner backend running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true });
});


/* ========================================================================== */
/* 🚀 Start Server */
/* ========================================================================== */

const port = process.env.PORT || 4003;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 서버 실행됨 (Render) → 포트: ${port}`);
});

