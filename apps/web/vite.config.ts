import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3300",
      "/mcp": "http://localhost:3300",
      "/ws": { target: "ws://localhost:3300", ws: true },
    },
  },
});
