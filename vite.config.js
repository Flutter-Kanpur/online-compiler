import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api/interviews": "http://localhost:8787",
      "/ws/interview": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
});
