import { expect, test } from "vitest";
import { type TaskAction, type TaskState, TransitionError, transition } from "./task-machine.ts";
import { TASK_STATUSES } from "./task-status.ts";

const actions: TaskAction[] = [
  { type: "claim" },
  { type: "assign", agentId: "agent" },
  { type: "recruit", needed: 2 },
  { type: "cancel" },
  { type: "accept" },
  { type: "decline" },
  { type: "join" },
  { type: "cancel_recruit" },
  { type: "heartbeat" },
  { type: "complete", result: "result" },
  { type: "pause" },
  { type: "handoff", to: "agent", note: "note" },
  { type: "release" },
  { type: "lease_expired" },
  { type: "resume" },
  { type: "reopen" },
];
test.each(
  TASK_STATUSES.flatMap((status) =>
    actions.flatMap((action) => ["p_owner", "p_other"].map((id) => ({ status, action, id }))),
  ),
)("person $id / $status / $action.type", ({ status, action, id }) => {
  const task: TaskState = {
    status,
    publisherId: "p_owner",
    assigneeId: "p_owner",
    capabilities: [],
    recruit: { needed: 2, joined: [] },
    leaseExpiresAt: null,
    result: null,
    completedAt: null,
  };
  const result = transition(task, action, { kind: "person", id }, new Date());
  if (id === "p_owner" && action.type === "cancel" && !["done", "cancelled"].includes(status))
    expect(result).toMatchObject({ status: "cancelled" });
  else expect(result).toBeInstanceOf(TransitionError);
});
test.each(["assign", "recruit", "cancel_recruit"] as const)(
  "person publisher cannot gain %s permission",
  (type) => {
    const action = actions.find((a) => a.type === type) as TaskAction;
    const task: TaskState = {
      status: type === "cancel_recruit" ? "recruiting" : "open",
      publisherId: "p_owner",
      assigneeId: null,
      capabilities: [],
      recruit: { needed: 2, joined: [] },
      leaseExpiresAt: null,
      result: null,
      completedAt: null,
    };
    expect(transition(task, action, { kind: "person", id: "p_owner" }, new Date())).toMatchObject({
      key: "auth.humanOrPublisherOnly",
    });
  },
);
