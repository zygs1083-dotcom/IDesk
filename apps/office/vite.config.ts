import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/office/",
  define: { __OFFICE_BUILD__: JSON.stringify(Date.now().toString(36)) },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Grouping barrel modules makes Rolldown pull both Pixi chunks back together.
          if (id.includes("/node_modules/pixi.js/") || id.includes("/node_modules/@pixi/"))
            return id.includes("/index.mjs") || id.includes("/index.js")
              ? undefined
              : id.includes("/rendering/")
                ? "pixi-rendering"
                : "pixi";
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3300",
      "/ws": { target: "ws://localhost:3300", ws: true },
    },
  },
});
