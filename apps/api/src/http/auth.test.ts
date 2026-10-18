import { once } from "node:events";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { authMeSchema } from "@idesk/shared/agent-schemas";
import { Hono } from "hono";
import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { emitEvent } from "../core/events/bus.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import { app, injectWebSocket } from "./app.ts";

const viewerPassword = config.IDESK_VIEWER_PASSWORD;
afterEach(async () => {
  config.IDESK_VIEWER_PASSWORD = viewerPassword;
  await stopPlugins();
});

async function login(password: string) {
  return app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}
async function cookie(password: string) {
  const response = await login(password);
  expect(response.status).toBe(200);
  for (const attribute of ["HttpOnly", "Max-Age=2592000", "SameSite=Lax", "Path=/"]) {
    expect(response.headers.get("Set-Cookie")).toContain(attribute);
  }
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
function read(path: string, session: string) {
  return app.request(`/api/v1${path}`, { headers: { Cookie: session } });
}

test("viewer reads as a human and all non-GET methods reject writes before routing", async () => {
  config.IDESK_VIEWER_PASSWORD = "viewer-test";
  const viewer = await cookie("viewer-test");
  const me = await read("/auth/me", viewer);
  expect(me.status).toBe(200);
  expect(authMeSchema.parse(await me.json())).toEqual({ role: "viewer" });
  expect((await read("/tasks", viewer)).status).toBe(200);
  expect((await read("/relay?box=all", viewer)).status).toBe(200);
  for (const [path, method] of [
    ["/tasks", "POST"],
    ["/plugins/x", "PATCH"],
    ["/plugins/x/enable", "POST"],
    ["/agents/x", "DELETE"],
    ["/tasks", "PUT"],
    ["/tasks", "HEAD"],
    ["/tasks", "OPTIONS"],
  ] as const) {
    const response = await app.request(`/api/v1${path}`, {
      method,
      headers: { Cookie: viewer },
    });
    expect(response.status).toBe(403);
    if (method !== "HEAD") expect(await response.json()).toEqual({ error: "只读账号" });
  }
  const admin = await cookie("test");
  expect(authMeSchema.parse(await (await read("/auth/me", admin)).json())).toEqual({
    role: "admin",
  });
});

test("viewer password is optional and admin wins when both passwords match", async () => {
  config.IDESK_VIEWER_PASSWORD = undefined;
  for (const password of ["viewer-test", "", "wrong", "long-wrong-password"]) {
    const response = await login(password);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "密码不对" });
  }
  config.IDESK_VIEWER_PASSWORD = "test";
  expect(await (await read("/auth/me", await cookie("test"))).json()).toEqual({ role: "admin" });
});

test("agent keys cannot query the human session role", async () => {
  const { apiKey } = registerAgent({ name: "auth", kind: "codex", host: "test", capabilities: [] });
  const response = await app.request("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "只有人可以操作" });
});

test("viewer can read plugin routes while plugin writes are forbidden", async () => {
  config.IDESK_VIEWER_PASSWORD = "viewer-test";
  await registerPlugin(
    {
      id: "viewer-fixture",
      name: "Viewer fixture",
      version: "1",
      kind: "action",
      configSchema: z.object({}),
      setup(ctx) {
        const routes = new Hono();
        routes.get("/probe", (c) => c.json({ ok: true }));
        routes.post("/probe", (c) => c.json({ ok: true }));
        ctx.registerRoutes(routes);
      },
    },
    new URL("file:///viewer-fixture.js"),
  );
  const session = await cookie("viewer-test");
  for (const method of ["GET", "POST"]) {
    const response = await app.request("/api/plugins/viewer-fixture/probe", {
      method,
      headers: { Cookie: session },
    });
    expect(response.status).toBe(method === "GET" ? 200 : 403);
    expect(await response.json()).toEqual(method === "GET" ? { ok: true } : { error: "只读账号" });
  }
});

test("viewer websocket receives real events", async () => {
  config.IDESK_VIEWER_PASSWORD = "viewer-test";
  const session = await cookie("viewer-test");
  const server = serve({ fetch: app.fetch, port: 0 });
  injectWebSocket(server);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  const request = httpRequest({
    host: "127.0.0.1",
    port,
    path: "/ws",
    headers: {
      Cookie: session,
      Connection: "Upgrade",
      Upgrade: "websocket",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
    },
  });
  request.end();
  const [response, socket] = await once(request, "upgrade");
  expect(response.statusCode).toBe(101);
  const received = once(socket, "data");
  emitEvent({ type: "viewer.probe" });
  const [frame] = await received;
  expect(frame.toString()).toContain('"type":"viewer.probe"');
  socket.destroy();
  server.close();
  await once(server, "close");
});

test("admin and viewer logout expire only the current browser cookie; agents cannot logout", async () => {
  config.IDESK_VIEWER_PASSWORD = "viewer-test";
  for (const password of ["test", "viewer-test"]) {
    const session = await cookie(password);
    const response = await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: session },
    });
    expect(response.status).toBe(204);
    const expired = response.headers.get("Set-Cookie") as string;
    for (const attribute of ["HttpOnly", "Max-Age=0", "SameSite=Lax", "Path=/"])
      expect(expired).toContain(attribute);
    expect((await read("/auth/me", expired.split(";")[0] as string)).status).toBe(401);
    expect((await read("/auth/me", "")).status).toBe(401);
  }
  const { apiKey } = registerAgent({
    name: "logout",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const response = await app.request("/api/v1/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Cookie: await cookie("test") },
  });
  expect(response.status).toBe(403);
  expect(response.headers.has("Set-Cookie")).toBe(false);
  expect((await app.request("/api/v1/auth/logout", { method: "POST" })).status).toBe(401);
});
