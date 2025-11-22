import axios from "axios";
import { fromBuffer } from "pdf2pic";

export async function extraPdfText(url) {
  try {
    console.log("📥 PDF 다운로드:", url);
    const res = await axios.get(url, { responseType: "arraybuffer" });

    // PDF → 이미지 변환 준비
    const converter = fromBuffer(res.data, {
      density: 200,
      format: "png",
      width: 1200,
      height: 1600,
      quality: 80,
    });

    const images = await converter.bulk(-1); // 전체 페이지 이미지 생성
    console.log(`📄 총 페이지 수: ${images.length}`);

    let fullText = "";

    for (let page of images) {
      console.log(`🧠 Vision OCR 페이지 처리...`);

      const base64 = page.base64;

      const ocrRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "이미지의 모든 텍스트를 정확히 OCR해."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_image",
                  image_url: `data:image/png;base64,${base64}`
                }
              ]
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const pageText = ocrRes.data.choices?.[0]?.message?.content || "";
      fullText += "\n" + pageText;
    }

    console.log("📜 OCR 전체 완료. 텍스트 길이:", fullText.length);
    return fullText;

  } catch (err) {
    console.error("❌ OCR 파싱 전체 실패:", err.message);
    return "";
  }
}
