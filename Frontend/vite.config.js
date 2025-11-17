import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",  // 프론트 루트
  build: {
    outDir: "dist",   // vercel이 자동으로 dist 읽음
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});






