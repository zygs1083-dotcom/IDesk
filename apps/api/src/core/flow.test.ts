import { type Actor, TransitionError } from "@idesk/shared/task-machine";
import { eq, sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../db/client.ts";
import { agents, events, tasks } from "../db/schema.ts";
import { authenticateAgent, listAgents, registerAgent } from "./agents/agents.ts";
import { type Event, onEvent } from "./events/bus.ts";
import { listRelay } from "./relay/relay.ts";
import { createTask, getTask, listTasks, TERMINAL_WINDOW_MS } from "./tasks/store.ts";
import { actOnTask, reportProgress } from "./tasks/transition.ts";

function register(name: string) {
  return registerAgent({ name, kind: "codex", host: "test", capabilities: ["coding"] });
}

test("claim, report, handoff, accept and complete commit tasks, events and deliverables", () => {
  const a = register("A").agent;
  const b = register("B").agent;
  const actorA: Actor = { kind: "agent", id: a.id, capabilities: a.capabilities };
  const actorB: Actor = { kind: "agent", id: b.id, capabilities: b.capabilities };
  const received: Event[] = [];
  const stop = onEvent("*", (event) => {
    expect(db.select().from(events).where(eq(events.id, event.id)).get()).toEqual(event);
    received.push(event);
  });
  try {
    const task = createTask({ title: "实现核心服务", capabilities: ["coding"] }, "human");
    actOnTask(task.id, { type: "claim" }, actorA);
    reportProgress(task.id, actorA, "进展");
    const handed = actOnTask(task.id, { type: "handoff", to: b.id, note: "上下文" }, actorA);
    const before = db.select().from(events).where(eq(events.taskId, task.id)).all();
    expect(actOnTask(task.id, { type: "complete", result: "非法" }, actorA)).toBeInstanceOf(
      TransitionError,
    );
    expect(getTask(task.id)).toEqual(handed);
    expect(db.select().from(events).where(eq(events.taskId, task.id)).all()).toEqual(before);
    actOnTask(task.id, { type: "accept" }, actorB);
    expect(actOnTask(task.id, { type: "complete", result: "已完成" }, actorB)).toMatchObject({
      status: "done",
      assigneeId: b.id,
      result: "已完成",
    });
    const stored = db
      .select()
      .from(events)
      .where(eq(events.taskId, task.id))
      .orderBy(sql`rowid`)
      .all();
    expect(stored.map((event) => event.type)).toEqual([
      "task.created",
      "task.claim",
      "task.reported",
      "task.handoff",
      "relay.sent",
      "task.accept",
      "task.complete",
    ]);
    expect(received.filter((event) => event.taskId === task.id)).toEqual(stored);
    expect(stored[0]).toMatchObject({
      agentId: null,
      payload: { title: "实现核心服务", status: "open" },
    });
    expect(stored[2]).toMatchObject({ agentId: a.id, payload: { message: "进展" } });
    expect(stored[3]).toMatchObject({
      payload: { from: "in_progress", to: "assigned", handoffFrom: a.id, handoffTo: b.id },
    });
    const inbox = listRelay(actorB, "inbox", task.id);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      kind: "deliverable",
      taskId: task.id,
      body: "上下文",
      subject: task.title,
    });
    expect(listRelay(actorA, "sent", task.id)).toEqual(inbox);
    expect(listRelay(actorA, "inbox", task.id)).toEqual([]);
    expect(listTasks({ status: "done", capability: "coding", assigneeId: b.id })).toContainEqual(
      getTask(task.id),
    );
    expect(listTasks({ capability: "cod" }).some((row) => row.id === task.id)).toBe(false);
    expect(actOnTask("missing", { type: "claim" }, actorA)).toBeUndefined();
  } finally {
    stop();
  }
});

test("finished tasks leave the default listing after the window but stay under their status", () => {
  const a = register("window").agent;
  const actor: Actor = { kind: "agent", id: a.id, capabilities: a.capabilities };
  const task = createTask({ title: "旧任务" }, a.id);
  actOnTask(task.id, { type: "claim" }, actor);
  actOnTask(task.id, { type: "complete", result: "完成" }, actor);
  expect(listTasks({}).some((row) => row.id === task.id)).toBe(true);
  db.update(tasks)
    .set({ updatedAt: new Date(Date.now() - TERMINAL_WINDOW_MS - 1000) })
    .where(eq(tasks.id, task.id))
    .run();
  expect(listTasks({}).some((row) => row.id === task.id)).toBe(false);
  expect(listTasks({ status: "done" }).some((row) => row.id === task.id)).toBe(true);
});

test("authentication updates presence and public agents exclude key hashes", () => {
  const { agent, apiKey } = register("key test");
  expect(apiKey).toMatch(/^idk_[A-Za-z0-9_-]{43}$/);
  expect(agent).not.toHaveProperty("apiKeyHash");
  expect(agent.status).toBe("offline");
  expect(authenticateAgent("incorrect")).toBeUndefined();
  const old = new Date(Date.now() - 180_000);
  db.update(agents).set({ lastSeenAt: old }).where(eq(agents.id, agent.id)).run();
  expect(listAgents().find((row) => row.id === agent.id)?.status).toBe("offline");
  const authenticated = authenticateAgent(apiKey);
  expect(authenticated).toMatchObject({ id: agent.id, status: "online" });
  expect(authenticated?.lastSeenAt?.getTime()).toBeGreaterThan(old.getTime());
  expect(authenticated).not.toHaveProperty("apiKeyHash");
  expect(listAgents().every((row) => !("apiKeyHash" in row))).toBe(true);
});

test("handoff without a recipient reopens the task and broadcasts the deliverable", () => {
  const a = register("broadcast").agent;
  const actor: Actor = { kind: "agent", id: a.id, capabilities: a.capabilities };
  const task = createTask({ title: "广播交接" }, a.id);
  actOnTask(task.id, { type: "claim" }, actor);
  expect(actOnTask(task.id, { type: "handoff", to: null, note: "继续" }, actor)).toMatchObject({
    status: "open",
    assigneeId: null,
  });
  expect(listRelay({ kind: "human" }, "all", task.id)).toMatchObject([
    { to: { kind: "broadcast" } },
  ]);
});

test("exact subscriptions can unsubscribe and listener failures occur after commit", () => {
  let calls = 0;
  const stop = onEvent("task.created", () => {
    calls += 1;
  });
  createTask({ title: "订阅" }, "human");
  stop();
  createTask({ title: "已退订" }, "human");
  expect(calls).toBe(1);
  const failure = new Error("listener failed");
  let committedId = "";
  const stopFailure = onEvent("task.created", (event) => {
    committedId = event.taskId as string;
    throw failure;
  });
  try {
    expect(() => createTask({ title: "已提交" }, "human")).toThrow(failure);
    expect(getTask(committedId)?.title).toBe("已提交");
  } finally {
    stopFailure();
  }
});

test("a relay insert failure rolls back the handoff and its events", () => {
  const a = register("rollback").agent;
  const actor: Actor = { kind: "agent", id: a.id, capabilities: a.capabilities };
  const task = createTask({ title: "原子交接" }, "human");
  const running = actOnTask(task.id, { type: "claim" }, actor);
  const before = db.select().from(events).where(eq(events.taskId, task.id)).all();
  db.run(`CREATE TRIGGER fail_handoff BEFORE INSERT ON relay_messages
    WHEN NEW.task_id = '${task.id}' BEGIN SELECT RAISE(ABORT, 'relay rejected'); END`);
  try {
    expect(() =>
      actOnTask(task.id, { type: "handoff", to: null, note: "上下文" }, actor),
    ).toThrow();
    expect(db.select().from(tasks).where(eq(tasks.id, task.id)).get()).toEqual(running);
    expect(db.select().from(events).where(eq(events.taskId, task.id)).all()).toEqual(before);
  } finally {
    db.run("DROP TRIGGER fail_handoff");
  }
});
