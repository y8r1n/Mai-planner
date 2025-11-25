// Backend/extrapdfText.js
import axios from "axios";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * PDF URL 을 받아서 앞부분 몇 페이지만 텍스트로 추출해주는 함수
 * - Vercel/Render 같은 서버리스 환경에서도 잘 돌아가도록 설계
 * - LLM 호출 안 함 (완전 무료 처리)
 *
 * @param {string} pdfUrl  Firebase Storage 등에서 받은 PDF 다운 URL
 * @param {object} options
 *    - maxPages: 최대 몇 페이지까지 읽을지 (기본 8)
 *    - maxChars: 잘라낼 최대 문자 수 (기본 8000)
 *    - minChars: 결과가 이 길이 미만이면 "너무 짧다" 판단용 (지금은 로그만)
 */
export async function extraPdfText(
  pdfUrl,
  {
    maxPages = 8,    // 🔹 멀티 페이지 제한 (앞에서부터 N페이지만)
    maxChars = 8000, // 🔹 LLM 프롬프트용 길이 제한
    minChars = 200,  // 🔹 너무 짧은 경우 참고용
  } = {}
) {
  if (!pdfUrl) {
    console.warn("⚠ extraPdfText 호출했는데 pdfUrl이 비어있음");
    return "";
  }

  try {
    console.log("📥 PDF 다운로드 시도:", pdfUrl);

    // 1) PDF 바이너리 가져오기 (로컬/배포 둘 다 URL 기반)
    const res = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const buffer = new Uint8Array(res.data);

    // 2) PDF.js 문서 핸들 생성 (unpdf + 서버리스용 PDF.js 번들 사용)
    const pdf = await getDocumentProxy(buffer);

    // 3) 전체 텍스트 추출 (페이지별 string 배열로 받기)
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    // text: string[]  (각 요소가 한 페이지)

    console.log("📚 전체 페이지 수:", totalPages);

    // 4) 앞에서부터 maxPages 페이지만 사용 (멀티 페이지 처리)
    const lastPage = Math.min(totalPages, maxPages);
    const selectedPages = text.slice(0, lastPage);

    // 5) 페이지 사이에 구분선 넣어서 합치기
    let combined = selectedPages
      .map((pageText, idx) => `--- [페이지 ${idx + 1}] ---\n${pageText}`)
      .join("\n\n");

    combined = (combined || "").trim();

    console.log("📝 추출 텍스트 길이:", combined.length);

    // 6) 너무 길면 잘라서 반환 (토큰/비용 방어)
    if (combined.length > maxChars) {
      combined = combined.slice(0, maxChars);
      console.log("✂ maxChars 초과 → 잘라서 사용:", maxChars);
    }

    if (combined.length < minChars) {
      console.log("⚠ 추출 결과가 너무 짧음 (minChars 미만)", {
        length: combined.length,
        minChars,
      });
      // 그래도 일단 그대로 반환 (요약/메모 fallback 로직은 quiz 쪽에서 처리)
    }

    return combined;
  } catch (e) {
    console.error("❌ extraPdfText 오류:", e.message || e);
    // 실패 시엔 그냥 빈 문자열 → quiz/generate 에서 summary/notes로 fallback
    return "";
  }
}
