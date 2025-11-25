/* ========================================================================== */
/* 📦 Imports */
/* ========================================================================== */
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import admin from "firebase-admin";
import { extraPdfText } from "./extrapdfText.js";
import path from "path";
import { fileURLToPath } from "url";

/* ========================================================================== */
/* 🔐 Load Firebase Admin Secret */
/* ========================================================================== */
const isRender = process.env.RENDER?.trim() === "true";
console.log("🌍 실행 환경:", isRender ? "RENDER (배포)" : "LOCAL (로컬)");


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = isRender
  ? "/etc/secrets/serviceAccountKey.json"
  : path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ serviceAccountKey.json 파일 없음:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

/* ========================================================================== */
/* 🚀 Express Init */
/* ========================================================================== */
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://mai-planner.vercel.app",
  "https://mai-planner.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      )
        return callback(null, true);
      return callback(new Error("Blocked by CORS: " + origin));
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Preflight allow-all
app.options(/.*/, (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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
        timeout: 30000, // 타임아웃 추가 (서버 멈춤 방지)
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
/* 🤖 WITH AI — 추천 문구 생성 */
/* ========================================================================== */

app.post("/api/with-ai/recommend", async (req, res) => {
  try {
    const { userId, day, subject, mood, todos = [] } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId가 필요합니다.",
      });
    }

    const prompt = `
    날짜: ${day}
    주제: ${subject}
    기분: ${mood}
    할일: ${todos.map((t) => t.title).join(", ") || "없음"}

    아래 형식의 JSON 배열만 반환하세요:
    [
      { "title": "추천 제목", "description": "설명" }
    ]
    `;

    const raw = await callOpenAI(prompt, "gpt-4o-mini", true);

    let list = [];
    try {
      list = JSON.parse(raw);
    } catch {
      list = safeJsonParse(raw);
    }

    // ⭐ 중요 → 빈 배열이면 fallback 생성
    if (!Array.isArray(list) || list.length === 0) {
      list = [
        {
          title: "여유로운 하루 시작",
          description: "오늘은 가볍게 커피 한잔하며 일정을 천천히 시작해보세요 ☕"
        },
        {
          title: "마음 편한 하루",
          description: "작은 루틴부터 차근차근. 오늘도 충분히 잘 해낼 수 있어요 🌿"
        }
      ];
    }

    return res.json({
      success: true,
      recommendations: list,
    });
  } catch (error) {
    console.error("❌ recommend 오류:", error);
    return res.status(500).json({
      success: false,
      error: "AI 추천 생성 실패",
    });
  }
});



/* ========================================================================== */
/* 🤖 WITH AI — AI 일정 자동 생성 (calendarEvents 기반, 카테고리 자동 분류 포함) */
/* ========================================================================== */
app.post("/api/with-ai/generate", async (req, res) => {
  try {
    const {
      selectedDate,
      startTime,
      endTime,
      todos = [],
      timetable = [],
      events = [],
      userId,
    } = req.body;

    console.log("📅 AI 일정 생성 요청:", {
      selectedDate,
      startTime,
      endTime,
      todos: todos.length,
      timetable: timetable.length,
      events: events.length,
      userId,
    });

    /* ----------------------------
      필수값 체크
    ----------------------------- */
    if (!userId)
      return res.status(400).json({
        success: false,
        error: "userId가 필요합니다.",
      });

    if (!selectedDate || !startTime || !endTime)
      return res.status(400).json({
        success: false,
        error: "날짜, 시작/종료 시간이 필요합니다.",
      });

    /* ========================================================================
       🔥 카테고리 프리셋 (프론트와 동일하게!)
    ======================================================================== */
    const CATEGORY_PRESETS = [
      { key: "leisure", label: "여가", emoji: "🧘" },
      { key: "study", label: "공부", emoji: "📚" },
      { key: "workout", label: "운동", emoji: "🏋" },
      { key: "meeting", label: "약속", emoji: "🤝" },
      { key: "meal", label: "식사", emoji: "🍽" },
      { key: "self", label: "자기계발", emoji: "✨" },
      { key: "etc", label: "기타", emoji: "📅" },
    ];

    function autoDetectCategory(title) {
      const t = title.toLowerCase();

      if (t.includes("운동") || t.includes("헬스") || t.includes("스트레칭"))
        return CATEGORY_PRESETS.find((c) => c.key === "workout");
      if (t.includes("스터디") || t.includes("공부") || t.includes("과제"))
        return CATEGORY_PRESETS.find((c) => c.key === "study");
      if (t.includes("밥") || t.includes("식사") || t.includes("점심"))
        return CATEGORY_PRESETS.find((c) => c.key === "meal");
      if (t.includes("약속") || t.includes("만남") || t.includes("모임"))
        return CATEGORY_PRESETS.find((c) => c.key === "meeting");
      if (t.includes("휴식") || t.includes("쉬기"))
        return CATEGORY_PRESETS.find((c) => c.key === "leisure");
      if (t.includes("자기계발") || t.includes("독서"))
        return CATEGORY_PRESETS.find((c) => c.key === "self");

      return CATEGORY_PRESETS.find((c) => c.key === "etc"); // default
    }

    /* ----------------------------
        프롬프트 구성
    ----------------------------- */
    const todosText =
      todos.length > 0
        ? todos
            .map(
              (t, i) =>
                `${i + 1}. ${t.title} ${
                  t.priority ? `(우선순위: ${t.priority})` : ""
                }`
            )
            .join("\n")
        : "없음";

    const timetableText =
      timetable.length > 0
        ? timetable
            .map((t, i) => `${i + 1}. ${t.title} (${t.start} ~ ${t.end})`)
            .join("\n")
        : "없음";

    const eventsText =
      events.length > 0
        ? events
            .map((e, i) => `${i + 1}. ${e.title} ${e.time ? `(${e.time})` : ""}`)
            .join("\n")
        : "없음";

    const prompt = `
📅 날짜: ${selectedDate}
⏰ 가용 시간: ${startTime} ~ ${endTime}

📋 오늘의 할 일:
${todosText}

🏫 시간표:
${timetableText}

📌 기타 일정:
${eventsText}

--- 요청사항 ---
최적의 하루 일정을 JSON ONLY 로 출력해줘.

형식:
{
  "schedule": [
    {
      "time": "09:00",
      "end": "09:30",
      "task": "작업 이름",
      "type": "todo|timetable|break|meal",
      "reason": "이 시간에 배치한 이유"
    }
  ],
  "summary": "한 줄 요약"
}

⚠ MUST: JSON만 출력해야 함.
    `;

    /* ----------------------------
        OpenAI 호출
    ----------------------------- */
    console.log("🤖 OpenAI 호출 중...");
    const raw = await callOpenAI(prompt, "gpt-4o", false);

    const clean = raw.replace(/```json|```/g, "").trim();

    let aiJson;
    try {
      aiJson = JSON.parse(clean);
    } catch (e) {
      console.log("❌ JSON 파싱 실패:", clean);
      return res.status(500).json({
        success: false,
        error: "AI JSON 파싱 실패",
      });
    }

    const schedule = aiJson.schedule || [];

    /* ======================================================================
        🔥 저장 위치 : calendarEvents (root)
        프론트와 100% 일치
    ======================================================================= */
    const calendarRef = adminDb.collection("calendarEvents");

    const saveTasks = schedule.map(async (item) => {
      const category = autoDetectCategory(item.task);

      // 중복 체크
      const dupSnap = await calendarRef
        .where("userId", "==", userId)
        .where("date", "==", selectedDate)
        .where("time", "==", item.time)
        .where("title", "==", item.task)
        .get();

      if (!dupSnap.empty) return null;

      return calendarRef.add({
        userId,
        title: item.task,
        time: item.time,
        end: item.end || "",
        date: selectedDate,
        reason: item.reason || "",
        type: item.type || "todo",
        aiGenerated: true,
        categoryKey: category.key,
        categoryLabel: category.label,
        categoryEmoji: category.emoji,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await Promise.all(saveTasks);

    return res.json({
      success: true,
      schedule,
      summary: aiJson.summary || "",
      totalTasks: saveTasks.length,
    });
  } catch (error) {
    console.error("❌ WITH AI 생성 오류:", error);
    return res.status(500).json({
      success: false,
      error: "AI 일정 생성 실패",
      details: error.message,
    });
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
  const { content } = req.body;  // ✅ 프론트가 실제로 보내는 필드

  if (!content || !content.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: "요약할 내용이 없습니다." 
    });
  }

  const prompt = `다음 내용을 3문단 이하로 요약해줘:\n\n${content}`;

  try {
    const result = await callOpenAI(prompt);
    
    // ✅ 프론트가 기대하는 응답 형식: res.data.result
    res.json({ success: true, result });
  } catch (e) {
    console.error("❌ 요약 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ========================================================================== */
/* 📘 Mentor Summary - generate-summary (프론트 경로 맞춤) */
/* ========================================================================== */
app.post("/api/mentor-ai/generate-summary", async (req, res) => {
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
/* 🧠 Quiz 생성 + 해설 포함 (file + summary + notes 기반) */
/* ========================================================================== */

import { extraPdfText } from "./extrapdfText.js";

app.post("/api/quiz/generate", async (req, res) => {
  const { pdfUrls = [], summary = "", notes = "", count = 5 } = req.body;

  console.log("📡 QUIZ REQUEST:", {
    pdfUrls,
    summaryLen: summary.length,
    notesLen: notes.length,
    count,
  });

  let fileText = "";

  // 1) PDF 텍스트 추출
  try {
    for (const url of pdfUrls) {
      if (!url) continue;

      // 🔽🔽 여기: 멀티 페이지 + 길이 제한 옵션 넣어서 호출
      const one = await extraPdfText(url, {
        maxPages: 8,   // 앞 8페이지까지만
        maxChars: 8000 // 각 PDF당 최대 8000자
      });

      if (one && one.trim().length > 0) {
        fileText += "\n\n" + one;
      }
    }
  } catch (e) {
    console.error("⚠ PDF 텍스트 추출 오류:", e.message || e.toString());
  }

  console.log("📄 PDF 기반 텍스트 길이:", fileText.length);

  // 2) 요약 + 메모 fallback (기존 로직 그대로)
  const fallbackText = `${summary}\n\n${notes}`.trim();
  const combinedText = (fileText || "").trim() || fallbackText;

  if (!combinedText) {
    return res.status(400).json({
      success: false,
      error: "교안(PDF) / 요약 / 메모 중 하나는 반드시 있어야 합니다.",
    });
  }

  // 길이 제한 (토큰 방어) – extraPdfText에서 한 번 자르지만 여기서도 한 번 더 방어
  const safeText = combinedText.slice(0, 7000);

  // 3) 프롬프트 구성 (JSON 배열 ONLY, 문제 개수 count 맞추기 지시)
  const prompt = `
다음 학습 자료를 바탕으로 난이도 중간 수준의 객관식 문제를 정확히 ${count}개 만들어줘.

반드시 아래 JSON 형식의 "배열"만 출력해야 해. 추가 설명, 한국어 문장, 마크다운, 코드블럭 금지.

[
  {
    "question": "질문 내용",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "보기1",
    "explanation": "왜 이 답이 맞는지 자세한 해설"
  }
]

규칙:
- 최상위는 반드시 JSON 배열이어야 한다.
- 각 요소는 question, options, answer, explanation 필드를 가진다.
- options는 항상 4개의 보기로 구성한다.
- answer는 options 배열 안에 있는 보기 문자열 중 하나여야 한다.
- explanation은 정답이 맞는 이유를 한국어로 자세히 설명한다.

아래 학습 자료를 참고해 문제를 만들어라.

--- 학습 자료 시작 ---
${safeText}
--- 학습 자료 끝 ---
JSON 배열만 출력해. (예: [ { ... }, { ... } ])
`;

  try {
    const raw = await callOpenAI(prompt, "gpt-4o", true); // jsonMode=true
    console.log("🧾 OpenAI raw (앞 200자):", raw?.slice?.(0, 200));

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = safeJsonParse(raw); // 기존 util
    }

    // 4) 항상 배열 형태로 정규화
    let quizArray = [];

    if (Array.isArray(parsed)) {
      quizArray = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      quizArray = parsed.questions;
    } else if (parsed && parsed.quiz && Array.isArray(parsed.quiz)) {
      quizArray = parsed.quiz;
    } else if (parsed && typeof parsed === "object") {
      quizArray = [parsed]; // 단일 객체
    }

    console.log("✅ 파싱된 문제 개수:", quizArray.length);

    if (!quizArray.length) {
      return res.status(500).json({
        success: false,
        error: "퀴즈를 생성하지 못했습니다.",
      });
    }

    // 5) 최소 정규화 (options / answer / explanation 보정)
    const normalized = quizArray.map((q, idx) => {
      const opt =
        Array.isArray(q.options) && q.options.length >= 2
          ? q.options
          : ["보기1", "보기2", "보기3", "보기4"];

      const answerStr =
        typeof q.answer === "string" && opt.includes(q.answer)
          ? q.answer
          : opt[0];

      return {
        question: q.question || `문제 ${idx + 1}`,
        options: opt,
        answer: answerStr,
        explanation: q.explanation || "",
      };
    });

    // 배열 길이 보정 (count보다 많이 오면 자르기)
    const trimmed = normalized.slice(0, count);

    return res.json({
      success: true,
      quiz: trimmed,
    });
  } catch (e) {
    console.error("❌ quiz 생성 오류:", e.response?.data || e.message);
    return res.status(500).json({
      success: false,
      error: "퀴즈 생성 중 서버 오류가 발생했습니다.",
    });
  }
});



/* ========================================================================== */
/* 🎨 이미지 생성 API - JSON 응답 처리 버전 */
/* Backend/server-ai.js의 /api/generate-image-diary 교체 */
/* ========================================================================== */

app.post("/api/generate-image-diary", async (req, res) => {
  const { emotion, diaryText, userId } = req.body;

  console.log("🎨 이미지 생성 시작:", { emotion, diaryText: diaryText.substring(0, 50), userId });

  if (!process.env.OPENAI_API_KEY || !process.env.STABILITY_KEY) {
    return res.status(500).json({ success: false, error: "API 키 누락" });
  }

  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId 필요" });
    }

    const cleanEmotion = emotion;

    // 영어 프롬프트 생성
    const promptText = await callOpenAI(
      `Create a detailed, vivid image description in English:
      
      Emotion: "${cleanEmotion}"
      Diary: "${diaryText}"
      
      Requirements:
      - Describe a beautiful, artistic scene
      - Include setting, colors, lighting, mood, atmosphere
      - Make it visually rich and detailed
      - 2-3 sentences minimum
      - Only return the description, no quotes
      
      Example: "A serene park bathed in golden afternoon sunlight, with lush green trees swaying gently. A person walks peacefully along a winding path, surrounded by colorful flowers and singing birds."`
    );

    console.log("🌐 영어 프롬프트 생성 완료:", promptText.substring(0, 100));

    // Stability AI 요청
    const form = new FormData();
    form.append("prompt", promptText);
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "png");

    console.log("📡 Stability AI 요청 시작 (core 모델)...");

    const imgRes = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      form,
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_KEY}`,
          Accept: "image/*, application/json",  // ⭐ Accept 헤더 추가
          ...form.getHeaders(),
        },
        responseType: "arraybuffer",
        timeout: 60000,
      }
    );

    console.log("✅ Stability AI 응답 받음");
    console.log("  - Content-Type:", imgRes.headers['content-type']);
    console.log("  - 데이터 크기:", imgRes.data.byteLength);

    let buffer;

    // ⭐⭐⭐ Content-Type에 따라 처리 분기 ⭐⭐⭐
    const contentType = imgRes.headers['content-type'];

    if (contentType.includes('application/json')) {
      // JSON 응답 (Base64 인코딩된 이미지)
      console.log("📦 JSON 응답 처리 중...");
      
      const jsonData = JSON.parse(imgRes.data.toString('utf-8'));
      console.log("  - JSON 키:", Object.keys(jsonData));

      if (jsonData.image) {
        // Base64 디코드
        buffer = Buffer.from(jsonData.image, 'base64');
        console.log("  - Base64 디코드 완료, 크기:", buffer.length);
      } else if (jsonData.artifacts && jsonData.artifacts[0]) {
        // artifacts 배열에서 추출
        buffer = Buffer.from(jsonData.artifacts[0].base64, 'base64');
        console.log("  - artifacts에서 추출 완료, 크기:", buffer.length);
      } else {
        throw new Error("JSON에서 이미지 데이터를 찾을 수 없습니다");
      }
    } else {
      // 직접 이미지 데이터
      console.log("📦 직접 이미지 데이터 처리 중...");
      buffer = Buffer.from(imgRes.data, 'binary');
    }

    console.log("📦 Buffer 생성 완료");
    console.log("  - Buffer 길이:", buffer.length);
    console.log("  - Buffer 시작 바이트:", buffer.slice(0, 8).toString('hex'));

    // PNG 시그니처 확인 (89 50 4E 47)
    const isPNG = buffer[0] === 0x89 && 
                  buffer[1] === 0x50 && 
                  buffer[2] === 0x4E && 
                  buffer[3] === 0x47;

    console.log("  - PNG 시그니처 확인:", isPNG ? "✅" : "❌");

    if (!isPNG) {
      console.error("❌ PNG 시그니처 불일치!");
      console.error("  - 실제:", buffer.slice(0, 4).toString('hex'));
      throw new Error("Invalid PNG signature");
    }

    if (buffer.length === 0) {
      throw new Error("Empty image buffer");
    }

    const timestamp = Date.now();
    const fileName = `imageDiary/${userId}/${timestamp}.png`;

    console.log("📁 저장 경로:", fileName);

    // Firebase Storage 업로드
    const file = bucket.file(fileName);
    await file.save(buffer, {
      contentType: "image/png",
      metadata: {
        cacheControl: "public, max-age=31536000",
      }
    });

    console.log("☁️ Firebase Storage 업로드 완료:", fileName);

    // 업로드 검증
    const [uploadedMetadata] = await file.getMetadata();
    console.log("✅ 업로드 검증:");
    console.log("  - 크기:", uploadedMetadata.size);
    console.log("  - Content-Type:", uploadedMetadata.contentType);

    // 공개 URL 생성
    const directUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });

    console.log("🔗 URL 생성 완료");

    // Firestore에 저장
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("imageDiary")
      .add({
        emotion: cleanEmotion,
        diaryText,
        imageUrl: directUrl,
        signedUrl: signedUrl,
        storagePath: fileName,
        filename: `${timestamp}.png`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log("🎉 이미지 생성 완료!");

    res.json({
      success: true,
      imageUrl: directUrl,
      filename: `${timestamp}.png`,
      storagePath: fileName
    });

  } catch (e) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ 이미지 생성 오류!");
    console.error("  - 메시지:", e.message);
    console.error("  - 스택:", e.stack);
    
    if (e?.response?.data) {
      try {
        const errorText = Buffer.isBuffer(e.response.data) 
          ? e.response.data.toString('utf-8')
          : e.response.data;
        console.error("  - API 응답:", errorText);
      } catch {}
    }
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(500).json({
      success: false,
      error: e.message || "이미지 생성 실패"
    });
  }
});
/* ========================================================================== */
/* 🖼️ 이미지 프록시 - 최종 수정 버전 */
/* Backend/server-ai.js의 /api/image 프록시를 이것으로 교체 */
/* ========================================================================== */

// OPTIONS 요청 처리
app.options("/api/image/:userId/:filename", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).send();
});

app.get("/api/image/:userId/:filename", async (req, res) => {
  const { userId, filename } = req.params;
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🖼️ 이미지 프록시 요청");
  console.log("  - userId:", userId);
  console.log("  - filename:", filename);
  
  try {
    const filePath = `imageDiary/${userId}/${filename}`;
    console.log("  - filePath:", filePath);
    
    const file = bucket.file(filePath);
    
    // 파일 존재 확인
    const [exists] = await file.exists();
    if (!exists) {
      console.error("❌ 파일 없음:", filePath);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(404).json({ error: "Image not found" });
    }
    
    console.log("✅ 파일 존재 확인");
    
    // 파일 메타데이터
    const [metadata] = await file.getMetadata();
    console.log("  - contentType:", metadata.contentType);
    console.log("  - size:", metadata.size);
    
    // 파일 다운로드
    console.log("📥 파일 다운로드 시작...");
    const [buffer] = await file.download();
    console.log("  - 다운로드 크기:", buffer.length, "bytes");
    
    if (buffer.length === 0) {
      console.error("❌ 빈 버퍼!");
      return res.status(500).send("Empty buffer");
    }
    
    // ⭐⭐⭐ 헤더 설정 (순서 중요!) ⭐⭐⭐
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff'
    });
    
    // Buffer 전송
    res.end(buffer, 'binary');
    
    console.log("✅ 이미지 전송 완료!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
  } catch (e) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ 이미지 프록시 오류:");
    console.error("  - 에러:", e.message);
    console.error("  - 스택:", e.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (!res.headersSent) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(500).send("Internal server error");
    }
  }
});
/* ========================================================================== */
/* 🩺 Health */
/* ========================================================================== */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Mai-planner backend running" });
});
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* ========================================================================== */
/* 🚀 Start */
/* ========================================================================== */
const port = process.env.PORT || 4003;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 서버 실행됨 → 포트 ${port}`);
});
