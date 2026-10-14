import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return "motion";
          if (id.includes("/@dnd-kit/")) return "dnd";
          if (
            /\/(react-markdown|remark-[^/]+|rehype-[^/]+|micromark[^/]*|mdast[^/]*|hast[^/]*|unist[^/]*|unified|vfile[^/]*|bail|trough|devlop|decode-named-character-reference|character-entities[^/]*|character-reference-invalid|property-information|space-separated-tokens|comma-separated-tokens|ccount|escape-string-regexp|is-plain-obj|trim-lines|html-url-attributes|estree-util-is-identifier-name|inline-style-parser|is-alphabetical|is-alphanumerical|is-decimal|is-hexadecimal|longest-streak|parse-entities|stringify-entities|style-to-js|style-to-object|extend|dequal|debug|ms|@ungap\/structured-clone|zwitch)\//.test(
              id,
            )
          )
            return "markdown";
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
