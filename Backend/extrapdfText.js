import axios from "axios";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");   // <-- CommonJS 로 불러오기

export async function extraPdfText(url) {
  try {
    console.log("📥 PDF 다운로드:", url);

    const res = await axios.get(url, { responseType: "arraybuffer" });

    // ==============================
    // 1️⃣ PDF-Parse 텍스트 추출 시도
    // ==============================
    try {
      console.log("📘 PDF-Parse 시도...");
      const parsed = await pdf(res.data);

      if (parsed.text && parsed.text.trim().length > 30) {
        console.log("✅ PDF-Parse 텍스트 추출 성공:", parsed.text.length);
        return parsed.text;
      } else {
        console.log("⚠ PDF-Parse 결과 부족:", parsed.text?.length);
      }
    } catch (err) {
      console.log("⚠ PDF-Parse 실패:", err.message);
    }

    // ==============================
    // 2️⃣ OpenAI Vision OCR fallback
    // ==============================
    console.log("🧠 Vision OCR 시작... (fallback)");
    const base64 = Buffer.from(res.data).toString("base64");

    const ocrRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "PDF 페이지의 모든 텍스트를 가능한 정확히 OCR하여 반환하세요."
          },
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image_url: `data:application/pdf;base64,${base64}`
              }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        }
      }
    );

    const text = ocrRes.data?.choices?.[0]?.message?.content || "";
    console.log("📜 OCR 완료:", text.length);

    return text;

  } catch (err) {
    console.error("❌ OCR 전체 실패:", err.message);
    return "";
  }
}
