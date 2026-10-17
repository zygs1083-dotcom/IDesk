import { type Actor, TransitionError } from "@idesk/shared/task-machine";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { events, relayMessages } from "../../db/schema.ts";
import { agentActor, deleteAgent, registerAgent } from "../agents/agents.ts";
import { onEvent } from "../events/bus.ts";
import { createTask, getTask } from "./store.ts";
import { actOnTask } from "./transition.ts";

migrate(db, { migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname });
const human: Actor = { kind: "human" };
function agent() {
  return registerAgent({ name: "recovery", kind: "codex", host: "test", capabilities: [] }).agent;
}
function snapshot(id: string) {
  return {
    task: getTask(id),
    events: db.select().from(events).where(eq(events.taskId, id)).all(),
    relay: db.select().from(relayMessages).where(eq(relayMessages.taskId, id)).all(),
  };
}

test("invalid assignment and directed handoff leave tasks, events and deliverables unchanged", () => {
  const owner = agentActor(agent());
  const task = createTask({ title: "atomic references" }, owner.id);
  for (const status of ["open", "assigned", "in_progress", "paused"] as const) {
    if (status === "assigned") actOnTask(task.id, { type: "assign", agentId: owner.id }, human);
    if (status === "in_progress") actOnTask(task.id, { type: "accept" }, owner);
    if (status === "paused") actOnTask(task.id, { type: "pause" }, owner);
    const before = snapshot(task.id);
    const published: string[] = [];
    const unsubscribe = onEvent("*", (event) => published.push(event.type));
    const result = actOnTask(
      task.id,
      status === "open" || status === "assigned"
        ? { type: "assign", agentId: "missing" }
        : { type: "handoff", to: "missing", note: "must not leak" },
      human,
    );
    unsubscribe();
    expect(result).toBeInstanceOf(TransitionError);
    expect(result).toMatchObject({ key: "agent.notFound" });
    expect(snapshot(task.id)).toEqual(before);
    expect(published).toEqual([]);
  }
  expect(actOnTask(task.id, { type: "handoff", to: null, note: "public" }, owner)).toMatchObject({
    status: "open",
  });
  expect(snapshot(task.id).relay).toEqual([
    expect.objectContaining({ kind: "deliverable", to: { kind: "broadcast" } }),
  ]);
});

test("human recovers a deleted assignee by releasing or replacing without granting agents recovery powers", () => {
  const publisher = agentActor(agent());
  const replacement = agentActor(agent());
  for (const recovery of ["release", "assign"] as const) {
    const original = agentActor(agent());
    const task = createTask({ title: recovery }, publisher.id);
    expect(actOnTask(task.id, { type: "assign", agentId: original.id }, publisher)).toMatchObject({
      status: "assigned",
    });
    for (const actor of [publisher, original, replacement, { kind: "system" } as const]) {
      for (const action of [
        { type: "release" } as const,
        { type: "assign", agentId: replacement.id } as const,
      ])
        expect(actOnTask(task.id, action, actor)).toMatchObject({ key: "auth.humanOnly" });
    }
    deleteAgent(original.id);
    if (recovery === "release") {
      expect(actOnTask(task.id, { type: "release" }, human)).toMatchObject({
        status: "open",
        assigneeId: null,
        leaseExpiresAt: null,
      });
    }
    expect(actOnTask(task.id, { type: "assign", agentId: replacement.id }, human)).toMatchObject({
      status: "assigned",
      assigneeId: replacement.id,
      leaseExpiresAt: null,
    });
    expect(actOnTask(task.id, { type: "accept" }, original)).toMatchObject({
      key: "transition.assigneeOnly",
    });
    expect(actOnTask(task.id, { type: "accept" }, replacement)).toMatchObject({
      status: "in_progress",
    });
  }
});

test("permissions and action legality are checked before target existence", () => {
  const task = createTask({ title: "permission order" }, "human");
  const other = agentActor(agent());
  expect(actOnTask(task.id, { type: "assign", agentId: "missing" }, other)).toMatchObject({
    key: "auth.humanOrPublisherOnly",
  });
  expect(actOnTask(task.id, { type: "handoff", to: "missing", note: "" }, human)).toMatchObject({
    key: "transition.notAllowed",
  });
});

test("system assignment uses target validation and remains limited to open tasks", () => {
  const task = createTask({ title: "system assignment" }, "human");
  const system: Actor = { kind: "system" };
  expect(actOnTask(task.id, { type: "assign", agentId: "missing" }, system)).toMatchObject({
    key: "agent.notFound",
  });
  expect(getTask(task.id)?.status).toBe("open");
  const target = agent();
  expect(actOnTask(task.id, { type: "assign", agentId: target.id }, system)).toMatchObject({
    status: "assigned",
  });
  expect(actOnTask(task.id, { type: "assign", agentId: target.id }, system)).toMatchObject({
    key: "auth.humanOnly",
  });
});
