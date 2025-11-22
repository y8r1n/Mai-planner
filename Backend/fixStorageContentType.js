import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import admin from "firebase-admin";

// Render 환경 감지
const isRender = process.env.RENDER === "true";

// 자동 경로 선택
const serviceAccountPath = isRender
  ? "/etc/secrets/serviceAccountKey.json"  // Render
  : "./serviceAccountKey.json";           // Local

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ serviceAccountKey.json 파일 없음!");
  console.error("경로:", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath));

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();


/* -------------------------------------------------------------------------- */
/* 🔧 Storage에 저장된 파일들의 contentType 강제 수정                         */
/* -------------------------------------------------------------------------- */

async function fixMetadata() {
  console.log("🔍 이미지 스토리지 contentType 자동 수정 시작…");

  try {
    // 모든 파일 목록 가져오기
    const [files] = await bucket.getFiles({
      prefix: "imageDiary/",
    });

    console.log(`📁 총 파일 개수: ${files.length}`);

    for (const file of files) {
      const filePath = file.name;
      console.log(`\n--------------------------------------------------------`);
      console.log(`📝 파일 확인: ${filePath}`);

      const [metadata] = await file.getMetadata();

      // contentType이 잘못돼 있으면 수정
      if (metadata.contentType !== "image/png") {
        console.log(`⚠ contentType 오류 발견 → ${metadata.contentType}`);
        console.log("➡ image/png 로 수정 중…");

        await file.setMetadata({
          contentType: "image/png",
          cacheControl: "public, max-age=31536000",
        });

        console.log("✅ 수정 완료!");
      } else {
        console.log("👌 이미 정상 contentType = image/png");
      }
    }

    console.log("\n🎉 모든 파일 contentType 점검 및 수정 완료!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 메타데이터 수정 오류:", error);
    process.exit(1);
  }
}

fixMetadata();
