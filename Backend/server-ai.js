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
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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
/* 🤖 WITH AI — AI 일정 자동 생성 (USER 기반 저장 버전) */
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
      userName = "사용자",
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

    /* 🔥 userId 반드시 필요 */
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId가 필요합니다.",
      });
    }

    /* 🔥 필수값 체크 */
    if (!selectedDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "날짜, 시작/종료 시간이 필요합니다.",
      });
    }

    /* 프롬프트 구성 */
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
최적화된 하루 일정을 JSON ONLY로 출력해줘.

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

⚠ MUST: JSON만 출력해.
    `;

    /* 🔥 OpenAI 호출 */
    console.log("🤖 OpenAI 호출 중...");
    const raw = await callOpenAI(prompt, "gpt-4o", false);

    const clean = raw.replace(/```json|```/g, "").trim();
    let aiJson;

    try {
      aiJson = JSON.parse(clean);
    } catch (e) {
      console.log("❌ AI JSON 파싱 실패:", clean);
      return res.status(500).json({
        success: false,
        error: "AI JSON 파싱 실패",
      });
    }

    const schedule = aiJson.schedule || [];

    /* 🔥 DB 저장 (개인 calendar 컬렉션) */
    const calendarRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("calendar");

    const saveTasks = schedule.map((item) =>
      calendarRef.add({
        title: item.task,
        time: item.time,
        end: item.end || "",
        date: selectedDate,
        reason: item.reason || "",
        type: item.type || "todo",
        aiGenerated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(saveTasks);

    console.log(`✅ ${saveTasks.length}개 AI 일정 저장 완료`);

    res.json({
      success: true,
      schedule,
      summary: aiJson.summary || "",
      totalTasks: saveTasks.length,
    });
  } catch (error) {
    console.error("❌ WITH AI 오류:", error);
    res.status(500).json({
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
  await adminDb.collection("imageDiary").add({
  userId,
  emotion: cleanEmotion,
  diaryText,
  imageUrl: url,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
