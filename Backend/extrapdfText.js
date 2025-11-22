import axios from "axios";

export async function extraPdfText(url) {
  try {
    console.log("📥 PDF 다운로드:", url);
    const res = await axios.get(url, { responseType: "arraybuffer" });

    const base64data = Buffer.from(res.data).toString("base64");

    const ocrRes = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: "gpt-4o-mini",
        reasoning: { effort: "medium" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "PDF 파일의 텍스트를 정확하게 OCR해서 추출해줘." },
              { type: "input_image", image_url: `data:application/pdf;base64,${base64data}` }
            ],
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    const text = ocrRes.data.output_text || "";
    console.log("📜 OCR 결과 길이:", text.length);
    return text;
  } catch (err) {
    console.error("❌ OCR 파싱 전체 실패:", err.message);
    return "";
  }
}
