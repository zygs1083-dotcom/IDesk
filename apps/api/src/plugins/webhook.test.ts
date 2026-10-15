import { createHash, createHmac } from "node:crypto";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import type { Event } from "../core/events/bus.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { createTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { agents, events } from "../db/schema.ts";
import { startPlugins } from "./host.ts";
import { stopPlugins } from "./registry.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const requests: { method: string | undefined; headers: IncomingHttpHeaders; body: string }[] = [];
let status = 200;
let hanging = false;
const server = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  requests.push({ method: request.method, headers: request.headers, body });
  if (!hanging) response.writeHead(status).end();
});
let url: string;
let a: ReturnType<typeof registerAgent>;
let b: ReturnType<typeof registerAgent>;

async function received(count: number) {
  await vi.waitFor(() => expect(requests).toHaveLength(count));
  // Let fetch consume the response before advancing a retry timer.
  await wait(30);
}

beforeEach(async () => {
  db.update(agents).set({ webhookUrl: null }).run();
  requests.length = 0;
  status = 200;
  hanging = false;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("TCP address required");
  url = `http://127.0.0.1:${address.port}`;
  a = registerAgent({
    name: "A",
    kind: "codex",
    host: "test",
    capabilities: ["coding"],
    webhookUrl: url,
  });
  b = registerAgent({ name: "B", kind: "codex", host: "test", capabilities: [] });
  await startPlugins();
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await stopPlugins();
  db.update(agents).set({ webhookUrl: null }).where(eq(agents.id, a.agent.id)).run();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("matching task and relay events are signed, targeted and unsubscribed on stop", async () => {
  const task = createTask({ title: "coding", capabilities: ["coding"] }, "human");
  await received(1);
  const request = requests[0] as (typeof requests)[number];
  expect(request.method).toBe("POST");
  expect(request.headers["content-type"]).toBe("application/json");
  expect(JSON.parse(request.body)).toMatchObject({ type: "task.created", taskId: task.id });
  const hash = createHash("sha256").update(a.apiKey).digest("hex");
  expect(request.headers["x-idesk-signature"]).toBe(
    `sha256=${createHmac("sha256", hash).update(request.body).digest("hex")}`,
  );
  createTask({ title: "gpu", capabilities: ["gpu"] }, "human");
  sendRelay({ to: { kind: "agent", id: a.agent.id }, kind: "note", subject: "direct" }, b.agent.id);
  sendRelay({ to: { kind: "broadcast" }, kind: "note", subject: "broadcast" }, b.agent.id);
  sendRelay({ to: { kind: "broadcast" }, kind: "note", subject: "self" }, a.agent.id);
  await received(3);
  expect(requests.slice(1).map((request) => JSON.parse(request.body).type)).toEqual([
    "relay.sent",
    "relay.sent",
  ]);
  sendRelay(
    { to: { kind: "capability", value: "coding" }, kind: "note", subject: "cap" },
    b.agent.id,
  );
  await received(4);
  actOnTask(task.id, { type: "assign", agentId: a.agent.id }, { kind: "human" });
  await received(5);
  expect(JSON.parse((requests[4] as (typeof requests)[number]).body).type).toBe("task.assign");
  actOnTask(
    task.id,
    { type: "accept" },
    { kind: "agent", id: a.agent.id, capabilities: ["coding"] },
  );
  actOnTask(task.id, { type: "handoff", to: a.agent.id, note: "targeted" }, { kind: "human" });
  await received(7);
  expect(requests.slice(5).map((request) => JSON.parse(request.body).type)).toEqual([
    "task.handoff",
    "relay.sent",
  ]);
  await stopPlugins();
  createTask({ title: "stopped", capabilities: ["coding"] }, "human");
  await wait(100);
  expect(requests).toHaveLength(7);
});

test("HTTP failures retry after 1s, 5s and 30s then record one failed event", async () => {
  status = 500;
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  const task = createTask({ title: "failure", capabilities: ["coding"] }, "human");
  await received(1);
  for (const [index, delay] of [1000, 5000, 30000].entries()) {
    await vi.advanceTimersByTimeAsync(delay);
    await received(index + 2);
  }
  const original = db.select().from(events).where(eq(events.taskId, task.id)).get() as Event;
  const failures = db
    .select()
    .from(events)
    .where(eq(events.type, "webhook.failed"))
    .all()
    .filter((event) => event.payload.eventId === original.id);
  expect(failures).toHaveLength(1);
  expect((failures[0] as Event).payload).toEqual({
    agentId: a.agent.id,
    eventId: original.id,
    error: "HTTP 500",
  });
});

test("hanging deliveries time out after 30s and exhaust all three retries", async () => {
  hanging = true;
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  // Node 自带的 AbortSignal.timeout 用的是内部计时器，不受 Vitest 假时钟控制，所以要 mock
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
      delay,
    );
    return controller.signal;
  });
  const task = createTask({ title: "timeout", capabilities: ["coding"] }, "human");
  await received(1);
  const original = db.select().from(events).where(eq(events.taskId, task.id)).get() as Event;
  const failures = () =>
    db
      .select()
      .from(events)
      .where(eq(events.type, "webhook.failed"))
      .all()
      .filter((event) => event.payload.eventId === original.id);
  for (const [index, retryDelay] of [1000, 5000, 30000].entries()) {
    await vi.advanceTimersByTimeAsync(29_999);
    expect(requests).toHaveLength(index + 1);
    expect(failures()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await wait(30);
    await vi.advanceTimersByTimeAsync(retryDelay - 1);
    expect(requests).toHaveLength(index + 1);
    await vi.advanceTimersByTimeAsync(1);
    await received(index + 2);
  }
  await vi.advanceTimersByTimeAsync(30_000);
  await vi.waitFor(() => expect(failures()).toHaveLength(1));
  expect(timeout.mock.calls).toEqual([[30_000], [30_000], [30_000], [30_000]]);
  expect((failures()[0] as Event).payload).toEqual({
    agentId: a.agent.id,
    eventId: original.id,
    error: "Request timed out",
  });
});
