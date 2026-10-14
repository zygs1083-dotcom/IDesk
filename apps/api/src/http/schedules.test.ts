import { scheduleSchema } from "@idesk/shared/schedule-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { schedules } from "../db/schema.ts";
import { stopSchedules } from "../scheduler/schedules.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
let cookie: string;
beforeEach(async () => {
  db.delete(schedules).run();
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(() => {
  stopSchedules();
  db.delete(schedules).run();
});
function request(path: string, method = "GET", body?: object, key?: string) {
  return app.request(`/api/v1/schedules${path}`, {
    method,
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : { Cookie: cookie }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const input = {
  name: "Publish",
  cron: "* * * * *",
  action: { type: "publish_task", template: { title: "REST schedule" } },
};

test("human CRUD and manual run return schedules, including disabled nextRunAt", async () => {
  const created = await request("", "POST", input);
  expect(created.status).toBe(201);
  const row = scheduleSchema.parse(await created.json());
  expect(row.nextRunAt).not.toBeNull();
  expect(row.timezone).toBe("Asia/Shanghai");
  expect(row.enabled).toBe(true);
  expect(z.array(scheduleSchema).parse(await (await request("")).json())).toHaveLength(1);
  expect(scheduleSchema.parse(await (await request(`/${row.id}`)).json()).id).toBe(row.id);
  const paused = await request(`/${row.id}`, "PATCH", { enabled: false });
  expect(paused.status).toBe(200);
  expect(await paused.json()).toMatchObject({ enabled: false, nextRunAt: null });
  const renamed = await request(`/${row.id}`, "PATCH", { name: "Renamed" });
  expect(await renamed.json()).toMatchObject({ name: "Renamed", enabled: false, nextRunAt: null });
  const run = await request(`/${row.id}/run`, "POST");
  expect(run.status).toBe(200);
  expect(await run.json()).toMatchObject({ lastStatus: "success", nextRunAt: null });
  const resumed = await request(`/${row.id}`, "PATCH", {
    enabled: true,
    cron: "*/2 * * * *",
    timezone: "UTC",
  });
  expect(scheduleSchema.parse(await resumed.json()).nextRunAt).not.toBeNull();
  expect((await request(`/${row.id}`, "DELETE")).status).toBe(204);
  for (const [path, method, body] of [
    [`/${row.id}`, "GET"],
    [`/${row.id}`, "PATCH", {}],
    [`/${row.id}`, "DELETE"],
    [`/${row.id}/run`, "POST"],
  ] as const) {
    const response = await request(path, method, body);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "定时任务不存在" });
  }
});

test("cron validation rejects invalid expressions and timezones at create and partial update", async () => {
  for (const bad of [{ cron: "invalid" }, { timezone: "No/SuchZone" }]) {
    const response = await request("", "POST", { ...input, ...bad });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "cron 表达式无效" });
  }
  const row = scheduleSchema.parse(
    await (await request("", "POST", { ...input, timezone: "UTC" })).json(),
  );
  for (const bad of [{ cron: "invalid" }, { timezone: "No/SuchZone" }]) {
    const response = await request(`/${row.id}`, "PATCH", bad);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "cron 表达式无效" });
  }
  const patched = await request(`/${row.id}`, "PATCH", { cron: "*/3 * * * *" });
  expect(await patched.json()).toMatchObject({ timezone: "UTC", cron: "*/3 * * * *" });
});

test("agent keys can read schedules and cannot create, patch, delete or run", async () => {
  const { apiKey } = registerAgent({
    name: "Schedule reader",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const row = scheduleSchema.parse(await (await request("", "POST", input)).json());
  expect((await request("", "GET", undefined, apiKey)).status).toBe(200);
  expect((await request(`/${row.id}`, "GET", undefined, apiKey)).status).toBe(200);
  for (const [path, method, body] of [
    ["", "POST", input],
    [`/${row.id}`, "PATCH", { enabled: false }],
    [`/${row.id}`, "DELETE"],
    [`/${row.id}/run`, "POST"],
  ] as const) {
    expect((await request(path, method, body, apiKey)).status).toBe(403);
  }
});

test("failed manual executions return 200 and shared response schemas are visible in OpenAPI", async () => {
  const row = scheduleSchema.parse(
    await (
      await request("", "POST", {
        ...input,
        action: { type: "connector_trigger", connectorId: "missing", jobExternalId: "job" },
      })
    ).json(),
  );
  const run = await request(`/${row.id}/run`, "POST");
  expect(run.status).toBe(200);
  expect(scheduleSchema.parse(await run.json()).lastStatus).toBe("failed");
  const document = z
    .object({
      paths: z.record(z.string(), z.record(z.string(), z.unknown())),
      components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
    })
    .parse(await (await app.request("/api/openapi.json")).json());
  expect(document.paths["/api/v1/schedules"]).toHaveProperty("post");
  expect(document.paths["/api/v1/schedules/{id}"]).toHaveProperty("patch");
  expect(document.paths["/api/v1/schedules/{id}/run"]).toHaveProperty("post");
  expect(document.components.schemas).toHaveProperty("Schedule");
});
