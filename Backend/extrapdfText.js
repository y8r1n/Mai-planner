import axios from "axios";
import pdf from "pdf-parse";

export async function extraPdfText(url) {
  try {
    console.log("📥 PDF 다운로드:", url);
    const res = await axios.get(url, { responseType: "arraybuffer" });

    // 1️⃣ pdf-parse로 텍스트 추출 시도
    try {
      const parsed = await pdf(res.data);
      if (parsed.text && parsed.text.trim().length > 50) {
        console.log("📘 PDF-Parse 텍스트 추출 성공:", parsed.text.length);
        return parsed.text;
      }
    } catch (err) {
      console.log("⚠ PDF-Parse 실패 → Vision OCR로 포올백");
    }

    // 2️⃣ Vision OCR fallback (단일 이미지로 인식)
    console.log("🧠 Vision OCR 시작...");
    const base64 = Buffer.from(res.data).toString("base64");

    const ocrRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "이미지의 모든 텍스트를 그대로 OCR하세요."
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
          "Content-Type": "application/json"
        }
      }
    );

    const text = ocrRes.data.choices?.[0]?.message?.content || "";
    console.log("📜 OCR 완료:", text.length);
    return text;

  } catch (err) {
    console.error("❌ OCR 전체 실패:", err.message);
    return "";
  }
}
