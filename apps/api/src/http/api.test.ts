import { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

function request(path: string, credential = "", body?: object) {
  return app.request(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login() {
  const response = await request("/auth/login", "", { password: "test" });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("Set-Cookie") as string;
  expect(cookie).toContain("idesk_session=");
  expect(cookie).toContain("HttpOnly");
  return cookie.split(";")[0] as string;
}
async function register(cookie: string, name: string) {
  const response = await request("/agents", cookie, {
    name,
    kind: "codex",
    host: "test",
    capabilities: ["coding"],
  });
  expect(response.status).toBe(201);
  return registeredAgentSchema.parse(await response.json());
}

test("login, signed cookies and bearer keys enforce authentication and roles", async () => {
  const wrong = await request("/auth/login", "", { password: "wrong" });
  expect(wrong.status).toBe(401);
  expect(await wrong.json()).toEqual({ error: "密码不对" });
  const absent = await request("/tasks");
  expect(absent.status).toBe(401);
  expect(await absent.json()).toEqual({ error: "未登录" });
  const invalid = await request("/tasks", "idk_invalid");
  expect(invalid.status).toBe(401);
  expect(await invalid.json()).toEqual({ error: "key 无效" });
  const cookie = await login();
  expect((await request("/tasks", cookie)).status).toBe(200);
  expect((await request("/tasks", `${cookie}tampered`)).status).toBe(401);
  const { agent, apiKey } = await register(cookie, "roles");
  const me = await request("/agents/me", apiKey);
  expect(me.status).toBe(200);
  expect(await me.json()).toMatchObject({ id: agent.id, status: "online" });
  expect((await request("/agents/me/heartbeat", apiKey, {})).status).toBe(200);
  const forbidden = await request("/agents", apiKey, {});
  expect(forbidden.status).toBe(403);
  expect(await forbidden.json()).toEqual({ error: "只有人可以操作" });
  expect((await request("/agents/me", cookie)).status).toBe(403);
  expect((await request("/agents/me/heartbeat", cookie, {})).status).toBe(403);
  expect((await request("/relay/missing/read", cookie, {})).status).toBe(404);
  const agents = await request("/agents", cookie);
  expect(await agents.text()).not.toContain("apiKeyHash");
});
test("real tasks, reports, handoffs and relay visibility map core results", async () => {
  const cookie = await login();
  const a = await register(cookie, "publisher");
  const b = await register(cookie, "worker");
  const c = await register(cookie, "receiver");
  const response = await request("/tasks", a.apiKey, { title: "REST", capabilities: ["coding"] });
  expect(response.status).toBe(201);
  const task = taskSchema.parse(await response.json());
  expect(task.publisherId).toBe(a.agent.id);
  const claim = await request(`/tasks/${task.id}/actions/claim`, b.apiKey, {});
  expect(claim.status).toBe(200);
  expect(await claim.json()).toMatchObject({ status: "in_progress", assigneeId: b.agent.id });
  const repeat = await request(`/tasks/${task.id}/actions/claim`, a.apiKey, {});
  expect(repeat.status).toBe(409);
  expect(await repeat.json()).toEqual({ error: "进行中的任务不能领取" });
  const missing = await request("/tasks/missing/actions/claim", a.apiKey, {});
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: "任务不存在" });
  expect((await request("/tasks", a.apiKey, {})).status).toBe(400);
  expect((await request(`/tasks/${task.id}/actions/lease_expired`, a.apiKey, {})).status).toBe(400);
  expect((await request(`/tasks/${task.id}/report`, b.apiKey, { message: "working" })).status).toBe(
    200,
  );
  const events = z
    .array(eventSchema)
    .parse(await (await request(`/tasks/${task.id}/events`, b.apiKey)).json());
  expect(events.map((event) => event.type)).toEqual([
    "task.created",
    "task.claim",
    "task.reported",
  ]);
  expect(events.map((event) => event.id)).toEqual(events.map((event) => event.id).sort());
  const handed = await request(`/tasks/${task.id}/actions/handoff`, b.apiKey, {
    to: c.agent.id,
    note: "context",
  });
  expect(handed.status).toBe(200);
  expect(await handed.json()).toMatchObject({ status: "assigned", assigneeId: c.agent.id });
  const inbox = z
    .array(relayMessageSchema)
    .parse(await (await request(`/relay?taskId=${task.id}`, c.apiKey)).json());
  expect(inbox).toHaveLength(1);
  const message = inbox[0] as z.infer<typeof relayMessageSchema>;
  expect(message).toMatchObject({ kind: "deliverable", body: "context" });
  expect((await request(`/relay/${message.id}/read`, c.apiKey, {})).status).toBe(200);
  const invisible = await request(`/relay/${message.id}/read`, a.apiKey, {});
  expect(invisible.status).toBe(404);
  expect(await invisible.json()).toEqual({ error: "消息不存在" });
  const accepted = await app.request(`/api/v1/tasks/${task.id}/actions/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}` },
  });
  expect(accepted.status).toBe(200);
  expect(
    (await request(`/tasks/${task.id}/actions/complete`, c.apiKey, { result: "done" })).status,
  ).toBe(200);
  const activity = z
    .array(eventSchema)
    .parse(
      await (
        await request(
          `/events?agentId=${b.agent.id}&type=task.reported&since=${events[0]?.id}`,
          cookie,
        )
      ).json(),
    );
  expect(activity).toHaveLength(1);
  expect(
    activity.every((event) => event.agentId === b.agent.id && event.type === "task.reported"),
  ).toBe(true);
  const sent = await request("/relay", a.apiKey, {
    to: { kind: "broadcast" },
    kind: "note",
    subject: "hello",
  });
  expect(sent.status).toBe(201);
  expect(await sent.json()).toMatchObject({ fromAgentId: a.agent.id });
});
test("activity filters in SQL before applying the 200 event limit", async () => {
  const cookie = await login();
  const { agent, apiKey } = await register(cookie, "activity");
  const created = await request("/tasks", apiKey, { title: "activity" });
  const task = taskSchema.parse(await created.json());
  for (let i = 0; i < 201; i++) {
    expect(
      (
        await request("/relay", cookie, {
          to: { kind: "broadcast" },
          kind: "note",
          subject: `noise ${i}`,
        })
      ).status,
    ).toBe(201);
  }
  const latest = z.array(eventSchema).parse(await (await request("/events", cookie)).json());
  expect(latest).toHaveLength(200);
  expect(latest.map((event) => event.id)).toEqual(
    latest
      .map((event) => event.id)
      .sort()
      .reverse(),
  );
  const filtered = z
    .array(eventSchema)
    .parse(await (await request(`/events?type=task.created&agentId=${agent.id}`, cookie)).json());
  expect(filtered).toHaveLength(1);
  expect(filtered[0]).toMatchObject({ taskId: task.id, agentId: agent.id, type: "task.created" });
});
test("OpenAPI exposes every REST operation", async () => {
  const response = await app.request("/api/openapi.json");
  expect(response.status).toBe(200);
  const document = z
    .object({ paths: z.record(z.string(), z.record(z.string(), z.unknown())) })
    .parse(await response.json());
  for (const [path, methods] of Object.entries({
    "/auth/login": ["post"],
    "/tasks": ["get", "post"],
    "/tasks/{id}": ["get"],
    "/tasks/{id}/actions/{action}": ["post"],
    "/tasks/{id}/report": ["post"],
    "/tasks/{id}/events": ["get"],
    "/agents": ["get", "post"],
    "/agents/me": ["get"],
    "/agents/me/heartbeat": ["post"],
    "/events": ["get"],
    "/relay": ["get", "post"],
    "/relay/{id}/read": ["post"],
  })) {
    for (const method of methods) expect(document.paths[`/api/v1${path}`]).toHaveProperty(method);
  }
});
