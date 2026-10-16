import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/zod/")) return "validation";
          if (id.includes("/node_modules/@dnd-kit/")) return "dnd";
          if (id.includes("/node_modules/croner/")) return "croner";
          if (/\/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id))
            return "motion";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3300",
      "/mcp": "http://localhost:3300",
      "/ws": { target: "ws://localhost:3300", ws: true },
    },
  },
});
