import { BOARD_COLUMNS, TASK_STATUSES, type TaskStatus } from "@idesk/shared/task-status";
import { describe, expect, it } from "vitest";
import type { Task } from "../../lib/types.ts";
import { dropAction, previewAction } from "./drop-action.ts";

const now = new Date("2026-10-14T12:00:00Z");
const task: Task = {
  id: "task",
  title: "Task",
  body: "",
  status: "open",
  priority: "normal",
  tags: [],
  blockedBy: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: "agent",
  recruit: { needed: 3, joined: ["agent"] },
  leaseExpiresAt: now.toISOString(),
  result: null,
  dueAt: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  completedAt: null,
};
const expected: Record<TaskStatus, Partial<Record<TaskStatus, string>>> = {
  open: { assigned: "assign", recruiting: "recruit" },
  recruiting: { open: "cancel_recruit" },
  assigned: { open: "release", assigned: "assign" },
  in_progress: { open: "release", assigned: "handoff", paused: "pause", done: "complete" },
  paused: { open: "release", assigned: "handoff", in_progress: "resume" },
  done: { open: "reopen" },
  cancelled: {},
};
describe("human board drops", () => {
  for (const status of TASK_STATUSES) {
    for (const target of BOARD_COLUMNS) {
      it(`${status} → ${target}`, () => {
        expect(dropAction({ ...task, status }, target, now)).toBe(expected[status][target] ?? null);
      });
    }
  }
});

it("previews recovery of an assigned task with a deleted assignee", () => {
  const assigned = { ...task, status: "assigned" as const, assigneeId: "deleted" };
  expect(previewAction(assigned, { type: "release" }, now)).toMatchObject({
    status: "open",
    assigneeId: null,
    leaseExpiresAt: null,
  });
  expect(previewAction(assigned, { type: "assign", agentId: "replacement" }, now)).toMatchObject({
    status: "assigned",
    assigneeId: "replacement",
    leaseExpiresAt: null,
  });
  expect(assigned.assigneeId).toBe("deleted");
});
