import { readFileSync } from "node:fs";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "../../config.ts";
import type { AuthEnv } from "../middleware/auth.ts";

const agentGuide = readFileSync(config.IDESK_AGENT_GUIDE, "utf8");

export function agentKitRoutes(app: OpenAPIHono<AuthEnv>) {
  app.get("/agent-guide.md", (c) =>
    c.body(agentGuide.replaceAll("{{origin}}", new URL(c.req.url).origin), 200, {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-cache",
    }),
  );
  app.get("/api/agent-kit/v1/idesk.mjs", (c) =>
    c.body(readFileSync(config.IDESK_CLI_DIST), 200, {
      "Content-Type": "text/javascript; charset=utf-8",
    }),
  );
}
