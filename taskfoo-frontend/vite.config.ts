// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // REST
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // WebSocket / SockJS endpoint'i
      "/ws": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true, // <— websocket proxy çok önemli
      },
    },
  },
  define: {
    global: "window",
    "process.env": {},
  },
});