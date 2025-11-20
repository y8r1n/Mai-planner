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

// CORS 설정 (안정화)
const allowedOrigins = [
  "http://localhost:5173",
  "https://mai-planner.vercel.app",
  "https://mai-planner-22r94993l-y8r1ns-projects.vercel.app", // ← 추가!
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 🔥 Express5 / path-to-regexp 호환되는 OPTIONS 패턴
app.options(/.*/, cors());

// 🔥 JSON Body 파서
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
      { "title": "추천 제목", "description": "설명" },
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

    // 배열 형태 아니면 강제 변환
    if (!Array.isArray(list)) list = [];

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
/* 🧩 Quiz 생성 — 안정화 버전 */
/* ========================================================================== */
app.post("/api/generate-quiz", async (req, res) => {
  const { subjectName, count = 5 } = req.body;

  const prompt = `
  "${subjectName}" 과목의 객관식 ${count}문제를 JSON 배열 ONLY 로 생성해줘.
  형식:
  [
    {
      "question": "...",
      "options": ["..."],
      "answer": 0
    }
  ]
  반드시 JSON 배열만 출력해야 함.
  `;

  try {
    const raw = await callOpenAI(prompt);

    // JSON 부분만 추출
    const first = raw.indexOf("[");
    const last = raw.lastIndexOf("]") + 1;

    if (first === -1 || last === -1) {
      throw new Error("JSON 배열을 찾을 수 없음");
    }

    const jsonText = raw.slice(first, last);

    let questions = JSON.parse(jsonText);

    if (!Array.isArray(questions)) {
      throw new Error("퀴즈 형식 오류");
    }

    res.json({ success: true, questions });
  } catch (e) {
    console.error("❌ quiz 오류:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});



/* ========================================================================== */
/* 🎨 이미지 다이어리 (USER 기반 저장 버전) — 최신 안정화 버전 */
/* ========================================================================== */
app.post("/api/generate-image-diary", async (req, res) => {
  const { emotion, diaryText, userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId가 필요합니다.",
      });
    }

    const cleanEmotion = emotion.replace(/[^\p{Emoji}]/gu, "").trim();

    // 영어로 변환
    const promptText = await callOpenAI(
      `Convert to English prompt:
      Emotion: "${cleanEmotion}"
      Diary: "${diaryText}"
      Only English description.`
    );

    // Stability 새로운 엔드포인트
    const form = new FormData();
    form.append("prompt", promptText);
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "png");

    const imgRes = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/ultra",
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

    // Firebase Storage Upload
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: "image/png" });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });

    await adminDb
      .collection("users")
      .doc(userId)
      .collection("imageDiary")
      .add({
        emotion: cleanEmotion,
        diaryText,
        imageUrl: url,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({ success: true, imageUrl: url });
  } catch (e) {
    console.error("❌ 이미지 생성 오류:", e?.response?.data || e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
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
