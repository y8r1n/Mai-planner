/// <reference types="node" />
//@ts-nocheck


/* ========================================================================== */
/* 📦 Imports */
/* ========================================================================== */
import detect from "detect-port";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import admin from "firebase-admin";

// Firebase Client SDK (프론트와 같은 Firestore)
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";

dotenv.config();

/* ========================================================================== */
/* 🔐 Service Account Load */
/* ========================================================================== */
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

/* ========================================================================== */
/* 🚀 Express Init */
/* ========================================================================== */
const app = express();
app.use(cors());
app.use(express.json());

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
/* 🧠 공통 OpenAI Handler */
/* ========================================================================== */
async function callOpenAI(prompt, model = "gpt-4o-mini", jsonMode = false) {
  try {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
    };

    if (jsonMode) body.response_format = { type: "json_object" };

    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
  } catch (e) {
    console.error("❌ OpenAI 요청 오류:", e.response?.data || e.message);
    throw new Error("OpenAI 요청 실패");
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
  const { userId = "defaultUser", day = "오늘", subject = "공부", mood = "보통" } = req.body;

  const prompt = `
"${day}" 하루 동안 "${subject}" 관련 추천 활동 3가지를 제안해줘.
기분: ${mood}
JSON 배열만 출력.
  `;

  try {
    const result = await callOpenAI(prompt, "gpt-4o-mini", true);
    const json = safeJsonParse(result);

    await adminDb.collection("withAI_recommendations").add({
      userId,
      subject,
      mood,
      day,
      recommendations: json,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, recommendations: json });
  } catch (e) {
    console.error("❌ with-ai/recommend 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 💬 Mentor Chat */
/* ========================================================================== */
app.post("/api/mentor-chat/message", async (req, res) => {
  const { messages = [], subjectName, subjectId, weekId } = req.body;

  const userText = messages[messages.length - 1]?.content || "";
  const prompt = `"${subjectName}" 멘토처럼 답변해줘: "${userText}"`;

  try {
    const reply = await callOpenAI(prompt);

    await adminDb.collection("mentorChats").add({
      subjectId,
      weekId,
      subjectName,
      userText,
      aiReply: reply,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, reply });
  } catch (e) {
    console.error("❌ mentor-chat/message 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 📘 Mentor Summary */
/* ========================================================================== */
app.post("/api/mentor-ai/summary", async (req, res) => {
  const { subjectName, weekTitle, subjectId, weekId } = req.body;

  const prompt = `"${subjectName}" / "${weekTitle}" 요약해줘 (3문단 이하)`;

  try {
    const summary = await callOpenAI(prompt);

    await adminDb.collection("mentorSummaries").add({
      subjectId,
      weekId,
      subjectName,
      weekTitle,
      summary,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, summary });
  } catch (e) {
    console.error("❌ mentor-ai/summary 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🧩 Quiz 생성 */
/* ========================================================================== */
app.post("/api/generate-quiz", async (req, res) => {
  const { subjectName, count = 5, subjectId, weekId } = req.body;

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

    await adminDb.collection("generatedQuizzes").add({
      subjectId,
      weekId,
      subjectName,
      questions: json,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, questions: json });
  } catch (e) {
    console.error("❌ generate-quiz 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 📖 Quiz 해설 */
/* ========================================================================== */
app.post("/api/generate-explanations", async (req, res) => {
  const { questions = [], userAnswers = [] } = req.body;

  if (!questions.length) {
    return res.status(400).json({ success: false, error: "문제가 없습니다." });
  }

  // 문제 + 정답 + 내답 매핑 (correctAnswer/answer 둘 다 지원)
  const mappedQuestions = questions.map((q, i) => {
    const correctIdx = q.correctAnswer ?? q.answer ?? 0;
    const myIdx = userAnswers[i] ?? null;

    return {
      number: i + 1,
      question: q.question,
      correct: String.fromCharCode(65 + correctIdx),
      mine: myIdx !== null ? String.fromCharCode(65 + myIdx) : "-"
    };
  });

  const prompt = `
아래 문제들에 대해 각 번호별로 해설을 작성해줘.

반드시 JSON 배열 ONLY로 반환해야 한다.
형식:
[
  {"explanation": "해설 1"},
  {"explanation": "해설 2"}
]

문제 목록:
${JSON.stringify(mappedQuestions, null, 2)}
`;

  try {
    let result = await callOpenAI(prompt, "gpt-4o-mini");

    // AI가 앞뒤에 쓸데없는 내용 붙이면 JSON 부분만 자르기
    const first = result.indexOf("[");
    const last = result.lastIndexOf("]") + 1;

    if (first === -1 || last === -1) {
      throw new Error("AI가 JSON 형식을 반환하지 않았습니다");
    }

    const jsonString = result.slice(first, last);
    const json = JSON.parse(jsonString);

    res.json({ success: true, explanations: json });
  } catch (e) {
    console.error("❌ generate-explanations 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🎨 Image Diary 생성 */
/* ========================================================================== */
app.post("/api/generate-image-diary", async (req, res) => {
  const { emotion, diaryText, userId = "guest" } = req.body;

  try {
    const cleanEmotion = emotion.replace(/[^\p{Emoji}]/gu, "").trim();

    const promptRes = await callOpenAI(`
Convert to a single English artistic image prompt:
Emotion: "${cleanEmotion}"
Diary: "${diaryText}"
Only English. No explanation.
`);

    // Stable Diffusion 요청
    const formData = new FormData();
    formData.append("prompt", promptRes);
    formData.append("aspect_ratio", "1:1");
    formData.append("output_format", "png");

    const imgRes = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_KEY}`,
          Accept: "image/*",
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(imgRes.data);

    // Firebase Storage 업로드
    const fileName = `imageDiary/${userId}/${Date.now()}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, { contentType: "image/png" });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2030-12-31",
    });

    // Firestore 저장
    await addDoc(collection(db, "imageDiary"), {
      userId,
      emotion: cleanEmotion,
      diaryText,
      imageUrl: url,
      prompt: promptRes,
      createdAt: serverTimestamp(),
    });

    res.json({ success: true, imageUrl: url, prompt: promptRes });
  } catch (e) {
    console.error("❌ 이미지 생성 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 🚀 서버 실행 */
/* ========================================================================== */
async function startServer() {
  const defaultPort = process.env.PORT || 4003;
  const port = await detect(defaultPort);

  if (port !== defaultPort) {
    console.log(`⚠️ 포트 ${defaultPort} 충돌 → ${port} 로 변경`);
  }

  // .env 업데이트
  const envContent = fs.readFileSync(".env", "utf8");
  const newEnv = envContent.replace(/VITE_SERVER_PORT=.*/g, `VITE_SERVER_PORT=${port}`);
  fs.writeFileSync(".env", newEnv);

  app.listen(port, () => {
    console.log(`🚀 서버 실행됨 → http://localhost:${port}`);
    console.log("🔄 프론트는 자동으로 새 포트에 연결됩니다!");
  });
}

startServer();
