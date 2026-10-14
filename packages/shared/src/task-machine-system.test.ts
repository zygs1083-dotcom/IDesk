import { expect, it } from "vitest";
import { type TaskAction, type TaskState, TransitionError, transition } from "./task-machine.ts";
import type { TaskStatus } from "./task-status.ts";

const now = new Date("2026-10-14T00:00:00Z");
function task(status: TaskStatus): TaskState {
  return {
    status,
    publisherId: "owner",
    assigneeId: null,
    capabilities: [],
    recruit: null,
    leaseExpiresAt: null,
    result: null,
    completedAt: null,
  };
}

it.each([
  { action: { type: "assign", agentId: "next" }, status: "open", permitted: true },
  { action: { type: "recruit", needed: 2 }, status: "open", permitted: false },
  { action: { type: "cancel_recruit" }, status: "recruiting", permitted: false },
  { action: { type: "cancel" }, status: "open", permitted: false },
] satisfies { action: TaskAction; status: TaskStatus; permitted: boolean }[])(
  "system / $action.type",
  ({ action, status, permitted }) => {
    expect(
      transition(task(status), action, { kind: "system" }, now) instanceof TransitionError,
    ).toBe(!permitted);
  },
);
