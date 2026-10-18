import { and, eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { events, tasks } from "../../db/schema.ts";
import { registerAgent } from "../agents/agents.ts";
import { expireLeases } from "./lease.ts";
import { createTask, getTask } from "./store.ts";
import { actOnTask } from "./transition.ts";

test("expired leases return tasks to open as system while current leases remain", () => {
  const { agent } = registerAgent({ name: "lease", kind: "codex", host: "test", capabilities: [] });
  const actor = { kind: "agent" as const, id: agent.id, capabilities: agent.capabilities };
  const expired = createTask({ title: "expired" }, "human");
  const current = createTask({ title: "current" }, "human");
  actOnTask(expired.id, { type: "claim" }, actor);
  const running = actOnTask(current.id, { type: "claim" }, actor);
  db.update(tasks)
    .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
    .where(eq(tasks.id, expired.id))
    .run();
  expect(expireLeases(new Date())).toEqual([getTask(expired.id)]);
  expect(getTask(expired.id)).toMatchObject({
    status: "open",
    assigneeId: null,
    leaseExpiresAt: null,
  });
  expect(getTask(current.id)).toEqual(running);
  expect(
    db
      .select()
      .from(events)
      .where(and(eq(events.taskId, expired.id), eq(events.type, "task.lease_expired")))
      .all(),
  ).toEqual([expect.objectContaining({ agentId: null })]);
  expect(expireLeases(new Date())).toEqual([]);
});
