import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { config } from "../config.ts";
import { registerWebSocket } from "../realtime/ws.ts";
import { HttpError } from "./errors.ts";
import { type AuthEnv, auth } from "./middleware/auth.ts";
import { agentRoutes } from "./routes/agents.ts";
import { authRoutes } from "./routes/auth.ts";
import { automationRoutes } from "./routes/automation.ts";
import { connectorRoutes } from "./routes/connectors.ts";
import { eventRoutes } from "./routes/events.ts";
import { mcpRoutes } from "./routes/mcp.ts";
import { pluginRoutes } from "./routes/plugins.ts";
import { relayRoutes } from "./routes/relay.ts";
import { scheduleRoutes } from "./routes/schedules.ts";
import { taskRoutes } from "./routes/tasks.ts";

z.config(z.locales.zhCN());

export const app = new OpenAPIHono<AuthEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues.map((issue) => issue.message).join("；") }, 400);
    }
  },
});

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.get("/api/meta", (c) => c.json({ office: config.IDESK_OFFICE_DIST !== undefined }));

app.get("/api/health", (c) => c.json({ ok: true }));

app.use("/api/v1/*", auth);
authRoutes(app);
taskRoutes(app);
agentRoutes(app);
eventRoutes(app);
relayRoutes(app);
pluginRoutes(app);
connectorRoutes(app);
automationRoutes(app);
scheduleRoutes(app);
mcpRoutes(app);

app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "IDesk API", version: "0.1.0" },
});

export const injectWebSocket = registerWebSocket(app);

if (config.IDESK_OFFICE_DIST !== undefined) {
  const dist = config.IDESK_OFFICE_DIST;
  app.get("/office/scene.json", (c) => {
    const override = join(config.IDESK_DATA_DIR, "office", "scene.json");
    const path = existsSync(override) ? override : join(dist, "scene.json");
    return c.body(readFileSync(path, "utf8"), 200, { "Content-Type": "application/json" });
  });
  app.use(
    "/office/*",
    serveStatic({ root: dist, rewriteRequestPath: (path) => path.slice("/office".length) }),
  );
  app.get("/office/*", serveStatic({ root: dist, path: "index.html" }));
} else {
  app.get("/office/*", (c) => c.notFound());
}

if (config.IDESK_WEB_DIST) {
  app.use("/*", serveStatic({ root: config.IDESK_WEB_DIST }));
  app.get("*", serveStatic({ root: config.IDESK_WEB_DIST, path: "index.html" }));
}
