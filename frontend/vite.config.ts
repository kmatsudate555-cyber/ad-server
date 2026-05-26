import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "https://ad-server-production-7eb7.up.railway.app";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": BACKEND,
      "/uploads": BACKEND,
    },
  },
});
