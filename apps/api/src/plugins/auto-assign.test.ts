import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { selectAgent } from "../../../../plugins/auto-assign/select-agent.ts";
import { authenticateAgent, registerAgent } from "../core/agents/agents.ts";
import { onEvent } from "../core/events/bus.ts";
import { createTask, getTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { agents, events, tasks } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { cookie } from "./host-fixture.ts";

const now = new Date("2026-10-15T00:00:00Z");
const a = { id: "a", status: "online" as const, capabilities: ["coding"], lastSeenAt: now };
const b = { ...a, id: "b", lastSeenAt: new Date(now.getTime() - 1000) };

test("selection excludes agents without all required capabilities", () => {
  expect(
    selectAgent(
      { capabilities: ["coding", "gpu"] },
      [a, { ...b, capabilities: ["coding", "gpu"] }],
      new Map(),
    ),
  ).toBe("b");
});
test("selection prefers the least loaded agent", () => {
  expect(selectAgent({ capabilities: [] }, [a, b], new Map([["a", 1]]))).toBe("b");
});
test("selection breaks load ties by latest lastSeenAt", () => {
  expect(selectAgent({ capabilities: [] }, [b, a], new Map())).toBe("a");
});
test("selection returns undefined without eligible candidates", () => {
  expect(selectAgent({ capabilities: [] }, [], new Map())).toBeUndefined();
  expect(
    selectAgent({ capabilities: [] }, [{ ...a, status: "offline" }], new Map()),
  ).toBeUndefined();
});

let createdIds: string[];
let unsubscribeCreated: () => void;
beforeEach(() => {
  createdIds = [];
  unsubscribeCreated = onEvent("task.created", (event) => createdIds.push(event.taskId as string));
  vi.setSystemTime(now);
  db.update(agents).set({ lastSeenAt: null }).run();
});
afterEach(() => {
  unsubscribeCreated();
  if (createdIds.length) {
    db.delete(events).where(inArray(events.taskId, createdIds)).run();
    db.delete(tasks).where(inArray(tasks.id, createdIds)).run();
  }
});
function online(name: string, capabilities = ["coding"]) {
  const registered = registerAgent({ name, kind: "codex", host: "test", capabilities });
  authenticateAgent(registered.apiKey);
  return registered.agent;
}
async function enable() {
  const response = await app.request("/api/v1/plugins/auto-assign/enable", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
}

test("assigns to the idle online agent as system after broadcasting task.created", async () => {
  const busy = online("A");
  const idle = online("B");
  const existing = createTask({ title: "busy" }, "human");
  actOnTask(
    existing.id,
    { type: "claim" },
    { kind: "agent", id: busy.id, capabilities: ["coding"] },
  );
  await enable();
  const broadcast: string[] = [];
  const unsubscribe = onEvent("*", (event) => {
    if (event.type.startsWith("task.")) broadcast.push(event.type);
  });
  const task = createTask({ title: "new", capabilities: ["coding"] }, "human");
  expect(getTask(task.id)?.status).toBe("open");
  vi.setSystemTime(now.getTime() + 1);
  await Promise.resolve();
  unsubscribe();
  expect(getTask(task.id)).toMatchObject({ status: "assigned", assigneeId: idle.id });
  const history = db.select().from(events).where(eq(events.taskId, task.id)).all();
  const created = history.find((event) => event.type === "task.created");
  const assigned = history.find((event) => event.type === "task.assign");
  expect(assigned).toMatchObject({ agentId: null });
  expect(created?.id.localeCompare(assigned?.id as string)).toBeLessThan(0);
  expect(broadcast).toEqual(["task.created", "task.assign"]);
});

test("offline and capability-mismatched agents leave tasks open without later reassignment", async () => {
  const offline = online("offline");
  db.update(agents)
    .set({ lastSeenAt: new Date(now.getTime() - 180_000) })
    .where(eq(agents.id, offline.id))
    .run();
  online("mismatch", ["writing"]);
  await enable();
  const task = createTask({ title: "coding", capabilities: ["coding"] }, "human");
  await Promise.resolve();
  expect(getTask(task.id)).toMatchObject({ status: "open", assigneeId: null });
  online("later");
  await Promise.resolve();
  expect(getTask(task.id)?.status).toBe("open");
});

test("blocked tasks remain open", async () => {
  online("worker");
  const blocker = createTask({ title: "blocker" }, "human");
  await enable();
  const task = createTask({ title: "blocked", blockedBy: [blocker.id] }, "human");
  await Promise.resolve();
  expect(getTask(task.id)).toMatchObject({ status: "open", assigneeId: null });
});

test("tag configuration only assigns matching tasks", async () => {
  const agent = online("worker");
  const response = await app.request("/api/v1/plugins/auto-assign", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ config: { tag: "auto" } }),
  });
  expect(response.status).toBe(200);
  await enable();
  const skipped = createTask({ title: "manual" }, "human");
  const matching = createTask({ title: "automatic", tags: ["auto"] }, "human");
  await Promise.resolve();
  expect(getTask(skipped.id)?.status).toBe("open");
  expect(getTask(matching.id)).toMatchObject({ status: "assigned", assigneeId: agent.id });
});

test("fresh database defaults off and leaves new tasks open", async () => {
  online("worker");
  const response = await app.request("/api/v1/plugins", { headers: { Cookie: cookie } });
  expect(await response.json()).toContainEqual(
    expect.objectContaining({ id: "auto-assign", enabled: false }),
  );
  const task = createTask({ title: "manual" }, "human");
  await Promise.resolve();
  expect(getTask(task.id)).toMatchObject({ status: "open", assigneeId: null });
});
