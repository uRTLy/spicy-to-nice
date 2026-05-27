import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/spicy-to-nice/" : "/",
  build: {
    // WebLLM is intentionally lazy-loaded for Offline mode, but its runtime chunks are large.
    chunkSizeWarningLimit: 6500,
  },
  plugins: [react()],
}));
