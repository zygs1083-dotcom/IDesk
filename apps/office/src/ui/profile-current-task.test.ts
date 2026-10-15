import { TASK_STATUSES } from "@idesk/shared/task-status";
import { expect, it } from "vitest";
import { isCurrentTask } from "./profile-current-task.ts";

it.each(TASK_STATUSES)("includes owned or joined %s work only when current", (status) => {
  const current = ["assigned", "in_progress", "paused"].includes(status);
  expect(isCurrentTask({ status, assigneeId: "a", recruit: null }, "a")).toBe(current);
  expect(isCurrentTask({ status, assigneeId: "b", recruit: null }, "a")).toBe(false);
  expect(isCurrentTask({ status, assigneeId: null, recruit: null }, "a")).toBe(false);
  expect(
    isCurrentTask({ status, assigneeId: null, recruit: { needed: 2, joined: ["a", "b"] } }, "a"),
  ).toBe(current);
  expect(
    isCurrentTask({ status, assigneeId: null, recruit: { needed: 2, joined: ["b"] } }, "a"),
  ).toBe(false);
});
