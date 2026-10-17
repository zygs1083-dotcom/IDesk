import { createServer, type IncomingHttpHeaders } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { deleteAgent, registerAgent } from "../core/agents/agents.ts";
import { emitEvent } from "../core/events/bus.ts";
import { createTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { events } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { cookie } from "./host-fixture.ts";
import { stopPlugins } from "./registry.ts";

vi.hoisted(() => vi.stubEnv("IDESK_PUBLIC_URL", "https://desk.example/"));
afterAll(() => vi.unstubAllEnvs());

const requests: { method: string | undefined; headers: IncomingHttpHeaders; body: object }[] = [];
let status = 200;
const server = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  requests.push({ method: request.method, headers: request.headers, body: JSON.parse(body) });
  response.writeHead(status).end();
});
let url: string;

beforeEach(async () => {
  requests.length = 0;
  status = 200;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("TCP address required");
  url = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  vi.restoreAllMocks();
  await stopPlugins();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function enable() {
  return app.request("/api/v1/plugins/chat-notifier/enable", {
    method: "POST",
    headers: { Cookie: cookie },
  });
}
function patch(config: Record<string, unknown>) {
  return app.request("/api/v1/plugins/chat-notifier", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
}
async function configure(config: Record<string, unknown> = {}) {
  expect((await patch({ webhookUrl: url, ...config })).status).toBe(200);
  expect((await enable()).status).toBe(200);
}
async function received(count: number) {
  await vi.waitFor(() => expect(requests).toHaveLength(count));
}
async function listing() {
  const response = await app.request("/api/v1/plugins", { headers: { Cookie: cookie } });
  return response.json();
}

test.each([
  ["feishu", { msg_type: "text", content: { text: "format.test：" } }],
  ["slack", { text: "format.test：" }],
  ["telegram", { chat_id: "123", text: "format.test：" }],
  ["text", { text: "format.test：" }],
])("%s sends its JSON body", async (format, body) => {
  await configure({ format, chatId: "123", events: "format.test" });
  emitEvent({ type: "format.test" });
  await received(1);
  expect(requests[0]).toMatchObject({
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
});

test("task and webhook messages use database names, human actor and public links", async () => {
  await configure({
    events:
      "task.created,task.claim,task.accept,task.complete,task.handoff,task.lease_expired,webhook.failed,custom.event",
  });
  const { agent } = registerAgent({
    name: "小助手",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const task = createTask({ title: "通知测试" }, "human");
  await received(1);
  actOnTask(task.id, { type: "claim" }, { kind: "agent", id: agent.id, capabilities: [] });
  await received(2);
  actOnTask(task.id, { type: "complete", result: "done" }, { kind: "human" });
  await received(3);
  emitEvent({ type: "webhook.failed", payload: { agentId: agent.id } });
  await received(4);
  for (const type of ["task.accept", "task.handoff", "task.lease_expired", "custom.event"]) {
    emitEvent({ type, taskId: task.id, agentId: agent.id, payload: { title: "ignored" } });
    await received(requests.length + 1);
  }
  const link = `\nhttps://desk.example/desk?task=${task.id}`;
  expect(requests.map((request) => request.body)).toEqual([
    { text: `新任务：通知测试${link}` },
    { text: `小助手 领取了 通知测试${link}` },
    { text: `管理员 完成了 通知测试${link}` },
    { text: "Webhook 失败：小助手" },
    { text: `小助手 领取了 通知测试${link}` },
    { text: `小助手 交接了 通知测试${link}` },
    { text: `租约到期：通知测试${link}` },
    { text: `custom.event：通知测试${link}` },
  ]);
});

test("event selection trims whitespace, filters types and changes live", async () => {
  await configure({ events: " selected.event, , " });
  emitEvent({ type: "ignored.event" });
  emitEvent({ type: "selected.event" });
  await received(1);
  await patch({ webhookUrl: url, events: "replacement.event" });
  emitEvent({ type: "selected.event" });
  emitEvent({ type: "replacement.event" });
  await received(2);
  await wait(100);
  expect(requests.map((request) => request.body)).toEqual([
    { text: "selected.event：" },
    { text: "replacement.event：" },
  ]);
});

test("HTTP failure emits chat.failed once without retry or recursive notification", async () => {
  status = 500;
  await configure({ events: "failure.test,chat.failed" });
  const original = emitEvent({ type: "failure.test" });
  await received(1);
  await vi.waitFor(() => {
    expect(
      db
        .select()
        .from(events)
        .where(eq(events.type, "chat.failed"))
        .all()
        .filter((event) => event.ts >= original.ts),
    ).toEqual([expect.objectContaining({ payload: { type: "failure.test", error: "HTTP 500" } })]);
  });
  await wait(100);
  expect(requests).toHaveLength(1);
});
test("network errors with request secrets become safe chat.failed events", async () => {
  await configure({ events: "network.test" });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error(`${url}/fake-secret Authorization: fake-token fake-body`),
  );
  emitEvent({ type: "network.test" });
  await vi.waitFor(() => {
    expect(db.select().from(events).where(eq(events.type, "chat.failed")).all()).toContainEqual(
      expect.objectContaining({ payload: { type: "network.test", error: "HTTP request failed" } }),
    );
  });
  expect(requests).toHaveLength(0);
});

test("fresh database defaults off and missing URL is an error recoverable by configuration", async () => {
  expect(await listing()).toContainEqual(
    expect.objectContaining({ id: "chat-notifier", enabled: false }),
  );
  await enable();
  expect(await listing()).toContainEqual(
    expect.objectContaining({
      id: "chat-notifier",
      enabled: false,
      error: "请先配置 Webhook 地址",
    }),
  );
  const response = await patch({ webhookUrl: url });
  expect(await response.json()).toMatchObject({ enabled: true });
  expect(await listing()).toContainEqual(
    expect.objectContaining({ id: "chat-notifier", enabled: true }),
  );
  createTask({ title: "恢复" }, "human");
  await received(1);
});
test("completion event uses deleted assignee id", async () => {
  await configure({ events: "task.complete" });
  const { agent } = registerAgent({ name: "Gone", kind: "codex", host: "test", capabilities: [] });
  const task = createTask({ title: "保留任务" }, agent.id);
  const actor = { kind: "agent" as const, id: agent.id, capabilities: [] };
  actOnTask(task.id, { type: "claim" }, actor);
  deleteAgent(agent.id);
  expect(actOnTask(task.id, { type: "complete", result: "done" }, actor)).toMatchObject({
    status: "done",
  });
  await received(1);
  expect(requests[0]?.body).toEqual({
    text: `${agent.id} 完成了 保留任务\nhttps://desk.example/desk?task=${task.id}`,
  });
});
