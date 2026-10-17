import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { scheduleSchema } from "@idesk/shared/schedule-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { MASK } from "../core/connectors/connectors.ts";
import { db } from "../db/client.ts";
import { agents, events, schedules } from "../db/schema.ts";
import { stopSchedules } from "../scheduler/schedules.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const originalViewer = config.IDESK_VIEWER_PASSWORD;
let admin: string;
let viewer: string;
let apiKey: string;
async function login(password: string) {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
function request(path: string, method = "GET", body?: object, credential = admin) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(async () => {
  config.IDESK_VIEWER_PASSWORD = "secret-test-viewer";
  admin = await login("test");
  viewer = await login("secret-test-viewer");
  apiKey = registerAgent({ name: "reader", kind: "codex", host: "test", capabilities: [] }).apiKey;
  db.delete(schedules).run();
  db.delete(events).run();
});
afterEach(() => {
  stopSchedules();
  vi.unstubAllGlobals();
  config.IDESK_VIEWER_PASSWORD = originalViewer;
  db.delete(schedules).run();
  db.delete(events).run();
  db.delete(agents).run();
});
const action = {
  type: "http",
  method: "POST",
  url: "http://127.0.0.1/secret-path",
  headers: { Authorization: "fake-token", "X-Private": "fake-header" },
  body: "fake-body",
};
async function create(http = action) {
  const response = await request("/schedules", "POST", {
    name: "secret fixture",
    cron: "* * * * *",
    enabled: false,
    action: http,
  });
  expect(response.status).toBe(201);
  return scheduleSchema.parse(await response.json());
}

test("all roles receive masked HTTP actions; PATCH markers preserve real execution", async () => {
  const received: { url: string | undefined; token: string | undefined; body: string }[] = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({ url: req.url, token: req.headers.authorization, body });
    res.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const row = await create({
      ...action,
      url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/secret-path`,
    });
    const masked = {
      ...action,
      url: MASK,
      headers: { Authorization: MASK, "X-Private": MASK },
      body: MASK,
    };
    expect(row.action).toEqual(masked);
    for (const credential of [admin, viewer, apiKey]) {
      for (const path of ["/schedules", `/schedules/${row.id}`]) {
        const response = await request(path, "GET", undefined, credential);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data) ? data[0].action : data.action).toEqual(masked);
      }
    }
    const patched = await request(`/schedules/${row.id}`, "PATCH", {
      name: "renamed",
      action: masked,
    });
    expect(patched.status).toBe(200);
    expect(scheduleSchema.parse(await patched.json()).action).toEqual(masked);
    const run = await request(`/schedules/${row.id}/run`, "POST");
    expect(scheduleSchema.parse(await run.json())).toMatchObject({
      action: masked,
      lastStatus: "success",
    });
    expect(received).toEqual([{ url: "/secret-path", token: "fake-token", body: "fake-body" }]);
    const replacement = {
      ...action,
      url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/replacement`,
      headers: { Authorization: "replacement" },
      body: "",
    };
    expect((await request(`/schedules/${row.id}`, "PATCH", { action: replacement })).status).toBe(
      200,
    );
    await request(`/schedules/${row.id}/run`, "POST");
    expect(received[1]).toEqual({ url: "/replacement", token: "replacement", body: "" });
    expect(db.select().from(schedules).get()?.action).toEqual(replacement);
    const { body: _, ...withoutBody } = replacement;
    await request(`/schedules/${row.id}`, "PATCH", { action: withoutBody });
    expect(db.select().from(schedules).get()?.action).not.toHaveProperty("body");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("markers cannot create secrets, invent missing values or cross action types", async () => {
  for (const invalid of [
    { ...action, url: MASK },
    { ...action, headers: { missing: MASK } },
    { ...action, body: MASK },
  ]) {
    expect(
      (await request("/schedules", "POST", { name: "bad", cron: "* * * * *", action: invalid }))
        .status,
    ).toBe(400);
  }
  const row = await create({ ...action, body: "" });
  for (const invalid of [
    { ...action, headers: { missing: MASK } },
    { ...action, body: MASK },
    { ...action, url: "bad" },
  ]) {
    expect((await request(`/schedules/${row.id}`, "PATCH", { action: invalid })).status).toBe(400);
  }
  expect(
    (
      await request(`/schedules/${row.id}`, "PATCH", {
        action: { type: "publish_task", template: { title: "safe" } },
      })
    ).status,
  ).toBe(200);
  expect(
    (await request(`/schedules/${row.id}`, "PATCH", { action: { ...action, url: MASK } })).status,
  ).toBe(400);
  expect((await request(`/schedules/${row.id}`, "PATCH", { action })).status).toBe(200);
});

test("HTTP failures never expose fetch errors containing request secrets", async () => {
  const row = await create();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(JSON.stringify(action))));
  const run = await request(`/schedules/${row.id}/run`, "POST");
  expect(scheduleSchema.parse(await run.json()).lastStatus).toBe("failed");
  for (const credential of [admin, viewer, apiKey]) {
    const response = await request("/events", "GET", undefined, credential);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("HTTP request failed");
    for (const secret of [action.url, action.body, ...Object.values(action.headers)])
      expect(text).not.toContain(secret);
  }
});
