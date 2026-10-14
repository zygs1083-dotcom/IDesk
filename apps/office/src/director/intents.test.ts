import { expect, test } from "vitest";
import type { OfficeEvent, Task } from "./events.ts";
import { intentions } from "./intents.ts";

const task: Task = {
  id: "t",
  title: "fix",
  body: "",
  status: "in_progress",
  priority: "normal",
  tags: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: "a",
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: null,
  createdAt: "2026-10-15T00:00:00Z",
  updatedAt: "2026-10-15T00:00:00Z",
  completedAt: null,
};
const plan = (
  type: string,
  payload: OfficeEvent["payload"] = {},
  current = task,
  agentId: string | null = "a",
) => {
  const event: OfficeEvent = {
    id: "e",
    type,
    payload,
    taskId: task.id,
    agentId,
    ts: task.createdAt,
  };
  return intentions[type]?.({ event, task: current, previous: task });
};

test("claim and accept take a card and return the actor to typing", () => {
  expect(plan("task.claim")).toEqual([{ kind: "claim", task, agentId: "a" }]);
  expect(plan("task.accept", {}, { ...task, assigneeId: "b" }, "b")).toEqual([
    { kind: "claim", task: { ...task, assigneeId: "b" }, agentId: "b" },
  ]);
});
test.each(["b", null])(
  "handoff uses payload sender and recipient (%s), including human initiated handoffs",
  (to) => {
    expect(plan("task.handoff", { handoffFrom: "a", handoffTo: to }, task, null)).toEqual([
      { kind: "handoff", task, agentId: "a", to },
    ]);
  },
);
test("completion, pause and resume select the responsible character", () => {
  expect(plan("task.complete", {}, task, null)).toEqual([{ kind: "complete", task, agentId: "a" }]);
  expect(plan("task.pause")).toEqual([{ kind: "pause", task, agentId: "a" }]);
  expect(plan("task.resume")).toEqual([{ kind: "resume", task, agentId: "a" }]);
});
test("release and expired lease return the card using the previous assignee", () => {
  const released = { ...task, status: "open" as const, assigneeId: null };
  expect(plan("task.lease_expired", {}, released, null)).toEqual([
    { kind: "return", task: released, agentId: "a" },
  ]);
  expect(plan("task.release", {}, released)).toEqual([
    { kind: "return", task: released, agentId: "a" },
  ]);
});
test("only the join event that fills a recruit moves the team into the meeting room", () => {
  const full = { ...task, recruit: { needed: 3, joined: ["a", "b", "c"] } };
  expect(plan("task.join", { to: "in_progress" }, full, "c")).toEqual([
    { kind: "meeting", task: full },
  ]);
  expect(plan("task.join", { to: "recruiting" }, full, "b")).toEqual([
    { kind: "claim", task: full, agentId: "b" },
  ]);
  expect(plan("task.complete", {}, full)).toEqual([
    { kind: "complete", task: full, agentId: "a" },
    { kind: "disband", task: full },
  ]);
  expect(plan("task.cancel", {}, full)).toEqual([
    { kind: "cancel", task: full },
    { kind: "disband", task: full },
  ]);
});
test.each([
  { kind: "agent", id: "b" },
  { kind: "capability", value: "code" },
  { kind: "broadcast" },
])("relay preserves $kind recipients and human origin", (to) => {
  expect(plan("relay.sent", { to }, task, null)).toEqual([{ kind: "relay", agentId: "human", to }]);
});
test("unknown event types are ignored", () => {
  expect(plan("agent.registered")).toBeUndefined();
});
