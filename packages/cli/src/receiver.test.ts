import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkReceiver, initReceiver } from "./commands/receiver.js";
import { saveConfig } from "./config.js";
import {
  type Event,
  Receiver,
  type ReceiverConfig,
  type ReceiverState,
  receiverClient,
  wakeCommand,
} from "./receiver.js";
import { handleWebhook, signature } from "./receiver-http.js";
import {
  receiverHeartbeat,
  recoverAssignments,
  recoverUnread,
  renewTasks,
} from "./receiver-jobs.js";
import { runReceiver } from "./receiver-run.js";

type Stub = <T>(method: string, path: string, body?: object) => Promise<T>;
const key = "idk_example_key_for_signature_test";
const config: ReceiverConfig = {
  listen: "127.0.0.1:8790",
  publicUrl: "http://127.0.0.1:8790/",
  wake: [process.execPath, "-e", "process.exit(0)", "{prompt}"],
  wakeOnOpen: false,
};
const me = { id: "agent-1", name: "Test", capabilities: ["code"] };
let home: string;
let originalHome: string | undefined;
let server: Server | undefined;
const receivers: Receiver[] = [];
let base: string;
let calls: { method: string; path: string; body: object | undefined }[];
let tasks: { id: string; status: string; assigneeId: string | null }[];
let prompts: string[];
let now: number;
const state = (): ReceiverState => ({ events: [], inProgressSince: {} });
const event = (
  id: string,
  type = "task.assign",
  taskId: string | null = "task-1",
  payload: Record<string, unknown> = {},
): Event => ({ id, ts: new Date(now).toISOString(), type, taskId, agentId: "other", payload });
const request: Stub = async (method, path, body) => {
  calls.push({ method, path, body });
  if (path === "/agents/me") return me as never;
  if (path.startsWith("/tasks?")) return tasks as never;
  if (path.startsWith("/tasks/"))
    return (tasks.find((task) => path.includes(`/${task.id}`)) ?? {
      id: "task-1",
      status: "assigned",
      assigneeId: me.id,
    }) as never;
  if (path === "/relay/summary") return { unread: 2 } as never;
  return {} as never;
};
const wake = async (_argv: string[], prompt: string): Promise<boolean> => {
  prompts.push(prompt);
  return true;
};
const make = (settings = config, persisted = state()) =>
  new Receiver(
    settings,
    { url: "http://idesk", key },
    me,
    persisted,
    request,
    () => {},
    () => now,
    wake,
  );
async function start(receiver: Receiver): Promise<void> {
  receivers.push(receiver);
  server = createServer((req, res) => {
    void handleWebhook(receiver, req, res);
  });
  await new Promise<void>((resolve) => (server as Server).listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "object" && address) base = `http://127.0.0.1:${address.port}`;
}
async function post(body: Buffer | string, signed = true, path = "/", method = "POST") {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return fetch(`${base}${path}`, {
    method,
    headers: signed ? { "X-IDesk-Signature": signature(key, bytes) } : {},
    ...(method === "POST" ? { body: bytes.toString("utf8") } : {}),
  });
}
const send = (value: Event) => post(JSON.stringify(value));
beforeEach(async () => {
  originalHome = process.env.HOME;
  home = await mkdtemp(join(tmpdir(), "idesk-receiver-"));
  process.env.HOME = home;
  calls = [];
  tasks = [{ id: "task-1", status: "assigned", assigneeId: me.id }];
  prompts = [];
  now = Date.now();
});
afterEach(async () => {
  await Promise.all(receivers.map((receiver) => receiver.idle()));
  receivers.length = 0;
  if (server) await new Promise<void>((resolve) => (server as Server).close(() => resolve()));
  server = undefined;
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

describe("signed HTTP receiver", () => {
  it("matches the guide's HMAC vector and rejects changed or unsigned bodies", async () => {
    const body =
      '{"id":"01JZZZZZZZZZZZZZZZZZZZTEST","ts":"2026-10-19T00:00:00.000Z","type":"webhook.test","taskId":null,"agentId":null,"payload":{}}';
    expect(createHash("sha256").update(key).digest("hex")).toBe(
      "0973b57f25343d974b984a7a9a9704d28a008e10040c3159cf5cf100536daf12",
    );
    expect(signature(key, Buffer.from(body))).toBe(
      "sha256=f89ff86d32fd21a2cdb6750fb4b319a34f8d03045a300564c392afef0bf44884",
    );
    await start(make());
    expect((await post(body, false)).status).toBe(401);
    expect(
      (
        await fetch(base, {
          method: "POST",
          headers: { "X-IDesk-Signature": signature(key, Buffer.from(body)) },
          body: `${body} `,
        })
      ).status,
    ).toBe(401);
  });
  it("checks route, method, body size, JSON and replay window", async () => {
    await start(make());
    expect((await post("{}", true, "/wrong")).status).toBe(404);
    expect((await post("", false, "/", "GET")).status).toBe(405);
    expect((await post(Buffer.alloc(1024 * 1024 + 1))).status).toBe(413);
    expect((await post("{")).status).toBe(400);
    expect(
      (await send({ ...event("old"), ts: new Date(now - 11 * 60_000).toISOString() })).status,
    ).toBe(422);
    expect(
      (
        await send({
          ...event("recent", "webhook.test", null),
          ts: new Date(now - 9 * 60_000).toISOString(),
        })
      ).status,
    ).toBe(200);
  });
  it("persists before response, deduplicates across restart and caps history", async () => {
    const receiver = make();
    await start(receiver);
    const first = event("one", "webhook.test", null);
    expect((await send(first)).status).toBe(200);
    const path = join(home, ".config/idesk/receiver/state.json");
    expect((JSON.parse(await readFile(path, "utf8")) as ReceiverState).events[0]?.id).toBe("one");
    expect((await send(first)).status).toBe(200);
    expect(receiver.state.events).toHaveLength(1);
    const resumed = await Receiver.create(
      config,
      { url: "http://idesk", key },
      request,
      () => {},
      () => now,
      wake,
    );
    expect(resumed.state.events[0]?.id).toBe("one");
    await new Promise<void>((resolve) => (server as Server).close(() => resolve()));
    server = undefined;
    resumed.state.events = Array.from({ length: 1000 }, (_, n) => ({
      id: `old-${n}`,
      type: "webhook.test",
      taskId: null,
      state: "skipped",
      at: new Date(now).toISOString(),
    }));
    await start(resumed);
    expect((await send(event("latest", "webhook.test", null))).status).toBe(200);
    expect(resumed.state.events).toHaveLength(1000);
    expect(resumed.state.events[0]?.id).toBe("old-1");
  });
  it("wakes only when assignment or open task remains eligible", async () => {
    const receiver = make();
    await start(receiver);
    expect((await send(event("assign"))).status).toBe(200);
    await receiver.idle();
    expect(prompts[0]).toBe(
      "IDesk：任务 task-1 已指派给你（task.assign，事件 assign）。按 http://idesk/agent-guide.md 第 5 节处理。",
    );
    (tasks[0] as (typeof tasks)[number]).assigneeId = "someone-else";
    await send(event("moved", "task.handoff"));
    await receiver.idle();
    (tasks[0] as (typeof tasks)[number]).assigneeId = me.id;
    (tasks[0] as (typeof tasks)[number]).status = "in_progress";
    await send(event("started"));
    await receiver.idle();
    await send(event("created", "task.created"));
    await receiver.idle();
    await send(event("test", "webhook.test", null));
    await receiver.idle();
    expect(prompts).toHaveLength(1);
    expect(receiver.state.events.slice(1).map((entry) => entry.state)).toEqual([
      "skipped",
      "skipped",
      "skipped",
      "skipped",
    ]);
    const open = make({ ...config, wakeOnOpen: true });
    await new Promise<void>((resolve) => (server as Server).close(() => resolve()));
    server = undefined;
    await start(open);
    (tasks[0] as (typeof tasks)[number]).status = "open";
    await send(event("new", "task.created"));
    await open.idle();
    expect(prompts.at(-1)).toContain("有一个你能领的新任务 task-1");
  });
  it("uses fixed prompts without task content", async () => {
    const receiver = make();
    await start(receiver);
    await send({
      ...event("safe"),
      payload: { title: `$(touch /tmp/x)\n${"x".repeat(4000)}`, body: "attack" },
    });
    await receiver.idle();
    expect(prompts[0]).toBe(
      "IDesk：任务 task-1 已指派给你（task.assign，事件 safe）。按 http://idesk/agent-guide.md 第 5 节处理。",
    );
  });
});

describe("wake and periodic jobs", () => {
  it("replaces prompt, reports exit status and leaves long process alive", async () => {
    const path = join(home, "wake.txt");
    const argv = [
      process.execPath,
      "-e",
      `require('fs').writeFileSync(${JSON.stringify(path)},process.argv[1])`,
      "{prompt}",
    ];
    expect(await wakeCommand(argv, "hello", 300, () => {})).toBe(true);
    expect(await readFile(path, "utf8")).toBe("hello");
    expect(await wakeCommand([process.execPath, "-e", "process.exit(7)"], "x", 300, () => {})).toBe(
      false,
    );
    expect(await wakeCommand([join(home, "missing"), "{prompt}"], "x", 300, () => {})).toBe(false);
    expect(
      await wakeCommand(
        [
          process.execPath,
          "-e",
          `setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(path)},'alive'),100)`,
          "{prompt}",
        ],
        "x",
        10,
        () => {},
      ),
    ).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(await readFile(path, "utf8")).toBe("alive");
  });
  it("serializes event wakes and marks failed exit", async () => {
    let active = 0;
    let maximum = 0;
    const serialWake = async (_argv: string[], prompt: string) => {
      prompts.push(prompt);
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active--;
      return !prompt.includes("second");
    };
    const receiver = new Receiver(
      config,
      { url: "http://idesk", key },
      me,
      state(),
      request,
      () => {},
      () => now,
      serialWake,
    );
    await start(receiver);
    await Promise.all([send(event("first")), send(event("second"))]);
    await receiver.idle();
    expect(maximum).toBe(1);
    expect(receiver.state.events.map((entry) => entry.state)).toEqual(["woken", "failed"]);
  });
  it("renews and pauses four-hour tasks, pruning stale state", async () => {
    const persisted = state();
    persisted.inProgressSince.stale = new Date(now).toISOString();
    const receiver = make(config, persisted);
    tasks = [{ id: "task-1", status: "in_progress", assigneeId: me.id }];
    await renewTasks(receiver);
    expect(calls.some((call) => call.path === "/tasks/task-1/actions/heartbeat")).toBe(true);
    receiver.state.inProgressSince["task-1"] = new Date(now - 4 * 60 * 60_000).toISOString();
    calls = [];
    await renewTasks(receiver);
    expect(calls.map((call) => call.path)).toContain("/tasks/task-1/report");
    expect(calls.map((call) => call.path)).toContain("/tasks/task-1/actions/pause");
    expect(receiver.state.inProgressSince).toEqual({});
  });
  it("recovers assignments and unread messages with a ten-minute guard", async () => {
    const receiver = make();
    await recoverAssignments(receiver);
    await receiver.idle();
    await recoverAssignments(receiver);
    await receiver.idle();
    expect(prompts).toHaveLength(1);
    now += 600_001;
    await recoverAssignments(receiver);
    await receiver.idle();
    await recoverUnread(receiver);
    await receiver.idle();
    expect(prompts).toHaveLength(3);
    expect(prompts[2]).toContain("2 条未读传递区消息");
  });
  it("skips recovery while another wake for the task is queued", async () => {
    let finish: ((value: boolean) => void) | undefined;
    const waitingWake = async (_argv: string[], prompt: string): Promise<boolean> => {
      prompts.push(prompt);
      return new Promise<boolean>((resolve) => {
        finish = resolve;
      });
    };
    const receiver = new Receiver(
      config,
      { url: "http://idesk", key },
      me,
      state(),
      request,
      () => {},
      () => now,
      waitingWake,
    );
    receiver.enqueue("first", "task-1");
    receiver.enqueue("second", "task-1");
    await recoverAssignments(receiver);
    expect(receiver.pendingTasks.get("task-1")).toBe(2);
    finish?.(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(receiver.pendingTasks.has("task-1")).toBe(true);
    finish?.(true);
    await receiver.idle();
    expect(prompts).toEqual(["first", "second"]);
  });
  it("posts presence client and sends relay prompts without message content", async () => {
    const receiver = make();
    await receiverHeartbeat(receiver);
    expect(calls.at(-1)).toEqual({
      method: "POST",
      path: "/agents/me/heartbeat",
      body: { client: `idesk-receiver/0.2.0 (${process.platform}; wake=command)` },
    });
    await start(receiver);
    await send(
      event("relay-1", "relay.sent", null, { messageId: "msg-1", body: "$(touch /tmp/x)" }),
    );
    await receiver.idle();
    expect(prompts[0]).toBe(
      "IDesk：你收到传递区消息 msg-1。按 http://idesk/agent-guide.md 第 6 节处理。",
    );
  });
  it("formats the presence client for codex and command", () => {
    expect(receiverClient({ ...config, wake: ["codex", "queue"] })).toBe(
      `idesk-receiver/0.2.0 (${process.platform}; wake=codex)`,
    );
    expect(receiverClient(config)).toBe(`idesk-receiver/0.2.0 (${process.platform}; wake=command)`);
  });
});

describe("receiver commands", () => {
  it("refuses to start without a key or receiver settings", async () => {
    await expect(runReceiver()).rejects.toThrow("login");
    await saveConfig({ url: "http://idesk", key: "" });
    await expect(runReceiver()).rejects.toThrow("缺少 key");
    await saveConfig({ url: "http://idesk", key });
    await expect(runReceiver()).rejects.toThrow("receiver.json");
  });
  it("writes private config and registers webhook", async () => {
    const apiServer = createServer(async (req, res) => {
      calls.push({ method: req.method as string, path: req.url as string, body: undefined });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ...me, webhookUrl: "http://127.0.0.1:8790/" }));
    });
    server = apiServer;
    await new Promise<void>((resolve) => (server as Server).listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address !== "object" || !address) throw new Error("server missing");
    await saveConfig({ url: `http://127.0.0.1:${address.port}`, key });
    const path = await initReceiver({ listen: "127.0.0.1:8790", codexThread: "thread-1" });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
      ...config,
      wake: ["codex", "queue", "--thread", "thread-1", "--message", "{prompt}"],
    });
    expect(calls.some((call) => call.method === "PATCH" && call.path === "/api/v1/agents/me")).toBe(
      true,
    );
    await chmod(path, 0o644);
    await initReceiver({
      listen: "127.0.0.1:8790",
      wake: JSON.stringify([process.execPath, "{prompt}"]),
    });
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    await expect(initReceiver({ listen: "127.0.0.1:8790", wake: '["bad"]' })).rejects.toThrow(
      "--wake",
    );
  });
  it("reports check failures for disabled notifier and missing wake", async () => {
    let enabled = true;
    server = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify(
          req.url?.endsWith("webhook-test")
            ? { ok: true, status: 200, durationMs: 85, error: null, notifierEnabled: enabled }
            : { ...me, webhookUrl: config.publicUrl },
        ),
      );
    });
    await new Promise<void>((resolve) => (server as Server).listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address !== "object" || !address) throw new Error("server missing");
    await saveConfig({ url: `http://127.0.0.1:${address.port}`, key });
    const path = join(home, ".config/idesk/receiver.json");
    await writeFile(path, JSON.stringify(config));
    const lines: string[] = [];
    expect(await checkReceiver((line) => lines.push(line))).toBe(true);
    expect(lines).toContain("✓ 测试推送：接收端响应 200，用时 85 ms");
    enabled = false;
    lines.length = 0;
    expect(await checkReceiver((line) => lines.push(line))).toBe(false);
    expect(lines).toContain("✗ 测试推送：Webhook 推送插件已停用");
    await writeFile(path, JSON.stringify({ ...config, wake: [join(home, "missing"), "{prompt}"] }));
    expect(await checkReceiver(() => {})).toBe(false);
  });
});
