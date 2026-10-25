import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { officeAssetVersion } from "./asset-version.ts";

const build = Date.now().toString(36);

export default defineConfig({
  base: "/office/",
  define: {
    __OFFICE_BUILD__: JSON.stringify(build),
    __OFFICE_ASSET_VERSION__: JSON.stringify(
      officeAssetVersion(fileURLToPath(new URL("./public", import.meta.url))),
    ),
  },
  plugins: [
    react(),
    {
      name: "office-build",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { name: "office-build", content: build }, injectTo: "head" },
      ],
    },
  ],
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
