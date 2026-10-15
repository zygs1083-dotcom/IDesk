import { expect, it } from "vitest";
import { labels } from "./labels.ts";
import {
  type Actor,
  type TaskAction,
  type TaskState,
  TransitionError,
  transition,
} from "./task-machine.ts";
import { TASK_STATUSES, type TaskStatus } from "./task-status.ts";

const now = new Date("2026-10-14T00:00:00Z");
const lease = new Date(now.getTime() + 10 * 60_000);
const agent: Actor = { kind: "agent", id: "owner", capabilities: ["coding", "gpu"] };
const human: Actor = { kind: "human" };
const system: Actor = { kind: "system" };
const other: Actor = { ...agent, id: "other" };
function task(status: TaskStatus = "open"): TaskState {
  return {
    status,
    publisherId: "owner",
    assigneeId: "owner",
    capabilities: ["coding"],
    recruit: { needed: 3, joined: ["first"] },
    leaseExpiresAt: new Date(now.getTime() - 1000),
    result: "old",
    completedAt: now,
  };
}
const actions: TaskAction[] = [
  { type: "claim" },
  { type: "assign", agentId: "next" },
  { type: "recruit", needed: 3 },
  { type: "cancel" },
  { type: "accept" },
  { type: "decline" },
  { type: "join" },
  { type: "cancel_recruit" },
  { type: "heartbeat" },
  { type: "complete", result: "result" },
  { type: "pause" },
  { type: "handoff", to: "next", note: "note" },
  { type: "release" },
  { type: "lease_expired" },
  { type: "resume" },
  { type: "reopen" },
];
const allowed: Record<TaskStatus, Partial<Record<TaskAction["type"], TaskStatus>>> = {
  open: { claim: "in_progress", assign: "assigned", recruit: "recruiting", cancel: "cancelled" },
  assigned: { accept: "in_progress", decline: "open", cancel: "cancelled" },
  recruiting: { join: "recruiting", cancel_recruit: "open", cancel: "cancelled" },
  in_progress: {
    heartbeat: "in_progress",
    complete: "done",
    pause: "paused",
    handoff: "assigned",
    release: "open",
    lease_expired: "open",
    cancel: "cancelled",
  },
  paused: { resume: "in_progress", handoff: "assigned", release: "open", cancel: "cancelled" },
  done: { reopen: "open" },
  cancelled: {},
};
function ok(result: TaskState | TransitionError): TaskState {
  expect(result).not.toBeInstanceOf(TransitionError);
  return result as TaskState;
}
it.each(TASK_STATUSES.flatMap((status) => actions.map((action) => ({ status, action }))))(
  "$status / $action.type",
  ({ status, action }) => {
    const actor =
      action.type === "lease_expired" ? system : action.type === "reopen" ? human : agent;
    const result = transition(task(status), action, actor, now);
    const expected = allowed[status][action.type];
    if (expected) expect(ok(result).status).toBe(expected);
    else {
      expect(result).toBeInstanceOf(TransitionError);
      expect((result as TransitionError).message).toContain(labels("zh").status[status]);
    }
  },
);
it("claim sets the owner and a ten-minute lease, preserving other fields", () => {
  const original = task();
  expect(ok(transition(original, { type: "claim" }, agent, now))).toEqual({
    ...original,
    status: "in_progress",
    assigneeId: "owner",
    leaseExpiresAt: lease,
  });
});
it("recruiting starts when the third member joins and retains the team", () => {
  const second = ok(transition(task("recruiting"), { type: "join" }, agent, now));
  expect(second.status).toBe("recruiting");
  const third = ok(transition(second, { type: "join" }, { ...agent, id: "third" }, now));
  expect(third).toEqual({
    ...second,
    status: "in_progress",
    recruit: { needed: 3, joined: ["first", "owner", "third"] },
    assigneeId: "first",
    leaseExpiresAt: lease,
  });
  expect(transition(second, { type: "join" }, agent, now)).toBeInstanceOf(TransitionError);
});
it.each(["in_progress", "paused"] as const)("%s hands off to an assignee or open", (status) => {
  for (const to of ["next", null]) {
    const original = task(status);
    expect(ok(transition(original, { type: "handoff", to, note: "context" }, agent, now))).toEqual({
      ...original,
      status: to === null ? "open" : "assigned",
      assigneeId: to,
      leaseExpiresAt: null,
    });
  }
});
it.each(["claim", "join"] as const)("%s requires every capability", (type) => {
  const status = { claim: "open", join: "recruiting" } as const;
  const original = { ...task(status[type]), capabilities: ["coding", "gpu"] };
  const limited: Actor = { ...agent, capabilities: ["coding"] };
  expect(transition(original, { type }, limited, now)).toBeInstanceOf(TransitionError);
});
it("only the owner or a human can complete", () => {
  const original = task("in_progress");
  expect(transition(original, { type: "complete", result: "new" }, other, now)).toBeInstanceOf(
    TransitionError,
  );
  expect(ok(transition(original, { type: "complete", result: "new" }, human, now))).toEqual({
    ...original,
    status: "done",
    result: "new",
    completedAt: now,
    leaseExpiresAt: null,
  });
});
it("only humans reopen and completion fields are cleared", () => {
  expect(transition(task("done"), { type: "reopen" }, agent, now)).toBeInstanceOf(TransitionError);
  expect(ok(transition(task("done"), { type: "reopen" }, human, now))).toEqual({
    ...task("done"),
    status: "open",
    assigneeId: null,
    result: null,
    completedAt: null,
  });
});
it("only the system expires leases and may also assign tasks", () => {
  for (const actor of [human, agent])
    expect(transition(task("in_progress"), { type: "lease_expired" }, actor, now)).toBeInstanceOf(
      TransitionError,
    );
  const expired = ok(transition(task("in_progress"), { type: "lease_expired" }, system, now));
  expect(expired).toMatchObject({ status: "open", assigneeId: null, leaseExpiresAt: null });
  for (const action of actions.filter(
    (action) => action.type !== "lease_expired" && action.type !== "assign",
  )) {
    for (const status of TASK_STATUSES)
      expect(transition(task(status), action, system, now)).toBeInstanceOf(TransitionError);
  }
});
it("does not mutate inputs and preserves additional fields", () => {
  const original = { ...task("recruiting"), id: "task-id", updatedAt: now };
  const before = structuredClone(original);
  const result = transition(original, { type: "join" }, agent, now);
  expect(result).not.toBe(original);
  expect(original).toEqual(before);
  expect(result).toMatchObject({ id: "task-id", updatedAt: now });
});
it("agent actions reject humans", () => {
  for (const action of actions.filter((a) =>
    ["claim", "accept", "decline", "join", "heartbeat"].includes(a.type),
  )) {
    for (const status of TASK_STATUSES.filter((s) => allowed[s][action.type])) {
      expect(transition(task(status), action, human, now)).toBeInstanceOf(TransitionError);
    }
  }
});
it.each(["assign", "recruit", "cancel_recruit", "cancel"] as const)(
  "%s requires the publisher or a human",
  (type) => {
    const action = actions.find((action) => action.type === type) as TaskAction;
    const original = task(type === "cancel_recruit" ? "recruiting" : "open");
    expect(transition(original, action, other, now)).toBeInstanceOf(TransitionError);
    expect(transition(original, action, human, now)).not.toBeInstanceOf(TransitionError);
  },
);
it.each(["accept", "decline"] as const)("%s requires the assignee", (type) => {
  const original = task("assigned");
  expect(transition(original, { type }, other, now)).toBeInstanceOf(TransitionError);
});
it("recruit requires at least two members", () => {
  expect(transition(task(), { type: "recruit", needed: 1 }, human, now)).toBeInstanceOf(
    TransitionError,
  );
  expect(ok(transition(task(), { type: "recruit", needed: 2 }, human, now)).recruit).toEqual({
    needed: 2,
    joined: [],
  });
});
it.each(["done", "cancelled"] as const)("%s cannot be cancelled", (status) => {
  expect(transition(task(status), { type: "cancel" }, human, now)).toBeInstanceOf(TransitionError);
});
