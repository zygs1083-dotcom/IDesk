import { createServer } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { Hono } from "hono";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { emitEvent } from "../core/events/bus.ts";
import { createTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { agents, pluginState } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { startPlugins } from "./host.ts";
import {
  disablePlugin,
  enablePlugin,
  plugins,
  registerPlugin,
  reloadPlugin,
  stopPlugins,
} from "./registry.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
let cookie: string;
beforeEach(async () => {
  db.delete(pluginState).run();
  db.update(agents).set({ webhookUrl: null }).run();
  await startPlugins();
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(async () => {
  await stopPlugins();
  db.delete(pluginState).run();
  db.update(agents).set({ webhookUrl: null }).run();
  vi.useRealTimers();
});

test("disable, enable and reload persist state and keep a single webhook subscription", async () => {
  let received = 0;
  const server = createServer((_request, response) => {
    received++;
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("TCP address required");
  registerAgent({
    name: "lifecycle",
    kind: "codex",
    host: "test",
    capabilities: [],
    webhookUrl: `http://127.0.0.1:${address.port}`,
  });
  createTask({ title: "initial" }, "human");
  await vi.waitFor(() => expect(received).toBe(1));
  await disablePlugin("webhook-notifier");
  await disablePlugin("webhook-notifier");
  expect(db.select().from(pluginState).get()?.enabled).toBe(false);
  createTask({ title: "disabled" }, "human");
  await wait(100);
  expect(received).toBe(1);
  await stopPlugins();
  await startPlugins();
  createTask({ title: "persisted disabled" }, "human");
  await wait(100);
  expect(received).toBe(1);
  await reloadPlugin("webhook-notifier");
  expect(plugins.get("webhook-notifier")?.enabled).toBe(false);
  await enablePlugin("webhook-notifier");
  await enablePlugin("webhook-notifier");
  expect(db.select().from(pluginState).get()?.enabled).toBe(true);
  createTask({ title: "enabled" }, "human");
  await vi.waitFor(() => expect(received).toBe(2));
  await reloadPlugin("webhook-notifier");
  createTask({ title: "reloaded" }, "human");
  await vi.waitFor(() => expect(received).toBe(3));
  await wait(100);
  expect(received).toBe(3);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("disable removes event subscriptions, cron jobs and cookie-only plugin routes", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  let ticks = 0;
  let delivered = 0;
  await registerPlugin(
    {
      id: "fixture",
      name: "Fixture",
      version: "1",
      kind: "action",
      configSchema: z.object({}),
      setup(ctx) {
        ctx.events.on("fixture.event", () => delivered++);
        const cancel = ctx.schedule("* * * * * *", async () => {
          ticks += 100;
        });
        cancel();
        ctx.schedule("* * * * * *", async () => {
          ticks++;
        });
        ctx.registerRoutes(
          new Hono()
            .get("/ping", (c) => c.json({ query: c.req.query("q") }))
            .post("/echo", async (c) => c.text(await c.req.text())),
        );
      },
    },
    new URL("file:///fixture.js"),
  );
  expect((await app.request("/api/plugins/fixture/ping")).status).toBe(401);
  const { apiKey } = registerAgent({
    name: "routes",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  expect(
    (
      await app.request("/api/plugins/fixture/ping", {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    ).status,
  ).toBe(401);
  const ping = await app.request("/api/plugins/fixture/ping?q=yes", {
    headers: { Cookie: cookie },
  });
  expect(await ping.json()).toEqual({ query: "yes" });
  const echo = await app.request("/api/plugins/fixture/echo", {
    method: "POST",
    headers: { Cookie: cookie },
    body: "payload",
  });
  expect(await echo.text()).toBe("payload");
  emitEvent({ type: "fixture.event" });
  await vi.advanceTimersByTimeAsync(1100);
  expect(ticks).toBe(1);
  expect(delivered).toBe(1);
  await disablePlugin("fixture");
  emitEvent({ type: "fixture.event" });
  await vi.advanceTimersByTimeAsync(2000);
  expect(ticks).toBe(1);
  expect(delivered).toBe(1);
  expect(
    (await app.request("/api/plugins/fixture/ping", { headers: { Cookie: cookie } })).status,
  ).toBe(404);
});

test("plugin REST lists plugins and restricts lifecycle operations to humans", async () => {
  const headers = { Cookie: cookie };
  const list = await app.request("/api/v1/plugins", { headers });
  expect(await list.json()).toContainEqual(
    expect.objectContaining({ id: "webhook-notifier", enabled: true }),
  );
  const { apiKey } = registerAgent({
    name: "plugin-reader",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const agentHeaders = { Authorization: `Bearer ${apiKey}` };
  expect((await app.request("/api/v1/plugins", { headers: agentHeaders })).status).toBe(200);
  expect(
    (
      await app.request("/api/v1/plugins/webhook-notifier/disable", {
        method: "POST",
        headers: agentHeaders,
      })
    ).status,
  ).toBe(403);
  expect(
    (await app.request("/api/v1/plugins/missing/disable", { method: "POST", headers })).status,
  ).toBe(404);
  expect(
    (await app.request("/api/v1/plugins/webhook-notifier/invalid", { method: "POST", headers }))
      .status,
  ).toBe(400);
  for (const action of ["disable", "enable", "reload"]) {
    const response = await app.request(`/api/v1/plugins/webhook-notifier/${action}`, {
      method: "POST",
      headers,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: action !== "disable" });
  }
  const document = await (await app.request("/api/openapi.json")).text();
  expect(document).toContain("/api/v1/plugins/{id}/{action}");
});
