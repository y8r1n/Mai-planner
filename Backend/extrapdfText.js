// Backend/extrapdfText.js
import axios from "axios";

/**
 * 🔍 extraPdfText
 * - PDF URL을 받아서 OpenAI Vision으로 텍스트 추출 시도
 * - 실패하면 "" 반환 (서버에서 summary/memo fallback)
 */
export async function extraPdfText(url) {
  try {
    console.log("📥 PDF 다운로드:", url);

    const res = await axios.get(url, { responseType: "arraybuffer" });
    const base64 = Buffer.from(res.data).toString("base64");

    console.log("🧠 Vision OCR 시작... (단일 PDF 전체)");

    const ocrRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an OCR engine. Extract ALL readable Korean/English text from the lecture PDF. Respond ONLY with plain text (no JSON, no explanations).",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "다음 PDF에서 보이는 글자를 최대한 많이 그대로 추출해줘. JSON 말고 순수 텍스트만 출력해.",
              },
              {
                type: "input_image",
                image_url: `data:application/pdf;base64,${base64}`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const text = ocrRes.data?.choices?.[0]?.message?.content || "";
    console.log("📜 OCR 완료, 길이:", text.length);
    return text;
  } catch (err) {
    console.error(
      "❌ OCR 전체 실패:",
      err.response?.data || err.message || err.toString()
    );
    return "";
  }
}
