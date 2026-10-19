import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { message } from "@idesk/shared/messages";
import { compress } from "hono/compress";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { config } from "../config.ts";
import { registerWebSocket } from "../realtime/ws.ts";
import { HttpError } from "./errors.ts";
import { type AuthEnv, auth } from "./middleware/auth.ts";
import { requestLang } from "./request-lang.ts";
import { agentKitRoutes } from "./routes/agent-kit.ts";
import { agentWebhookRoutes } from "./routes/agent-webhook.ts";
import { agentRoutes } from "./routes/agents.ts";
import { authRoutes } from "./routes/auth.ts";
import { automationRoutes } from "./routes/automation.ts";
import { connectorRoutes } from "./routes/connectors.ts";
import { eventRoutes } from "./routes/events.ts";
import { mcpRoutes } from "./routes/mcp.ts";
import { pluginRoutes } from "./routes/plugins.ts";
import { relayRoutes } from "./routes/relay.ts";
import { scheduleRoutes } from "./routes/schedules.ts";
import { probeRoutes, serverRoutes } from "./routes/servers.ts";
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
  const lang = requestLang(c.req.header("Accept-Language"));
  if (err instanceof HttpError) return c.json({ error: err.translate(lang) }, err.status);
  console.error(err);
  return c.json({ error: message(lang, "internal.error", undefined) }, 500);
});

// 内网带宽常常只有 10 Mbps：JS 压缩后缩到三分之一，带 hash 的构建产物一年不再下载。
// /mcp 是流式响应，/ws 是升级请求，都不压缩。
app.use("/api/v1/*", compress());
const cached = (value: string) =>
  createMiddleware(async (c, next) => {
    await next();
    c.header("Cache-Control", value);
  });
for (const path of ["/assets/*", "/office/assets/*"])
  app.use(path, cached("public, max-age=31536000, immutable"), compress());
app.use("/office/:file{.+\\.(png|webp|woff2)}", cached("public, max-age=86400"));
for (const path of ["/office/characters.json", "/office/occluders.json"])
  app.use(path, cached("public, max-age=86400"), compress());

// 办公室页常年开着，部署后靠 build 变化让它自己刷新；index.html 里的 bundle 名每次构建都不同。
const officeBuild =
  config.IDESK_OFFICE_DIST === undefined
    ? null
    : createHash("sha1")
        .update(readFileSync(join(config.IDESK_OFFICE_DIST, "index.html")))
        .digest("hex")
        .slice(0, 8);
app.get("/api/meta", (c) => c.json({ office: officeBuild !== null, build: officeBuild }));

app.get("/api/health", (c) => c.json({ ok: true }));
probeRoutes(app);
agentKitRoutes(app);

app.use("/api/v1/*", auth);
authRoutes(app);
taskRoutes(app);
agentWebhookRoutes(app);
agentRoutes(app);
eventRoutes(app);
relayRoutes(app);
pluginRoutes(app);
connectorRoutes(app);
automationRoutes(app);
scheduleRoutes(app);
serverRoutes(app);
mcpRoutes(app);

app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "IDesk API", version: "0.1.0" },
});

export const injectWebSocket = registerWebSocket(app);

if (config.IDESK_OFFICE_DIST !== undefined) {
  const dist = config.IDESK_OFFICE_DIST;
  app.get("/office/layout.json", (c) => {
    const override = join(config.IDESK_DATA_DIR, "office", "layout.json");
    const path = existsSync(override) ? override : join(dist, "layout.json");
    return c.body(readFileSync(path, "utf8"), 200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
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
