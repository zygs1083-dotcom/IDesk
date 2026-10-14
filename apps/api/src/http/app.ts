import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "../config.ts";
import { HttpError } from "./errors.ts";

export const app = new OpenAPIHono();

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "IDesk API", version: "0.1.0" },
});

if (config.IDESK_WEB_DIST) {
  app.use("/*", serveStatic({ root: config.IDESK_WEB_DIST }));
  app.get("*", serveStatic({ root: config.IDESK_WEB_DIST, path: "index.html" }));
}
