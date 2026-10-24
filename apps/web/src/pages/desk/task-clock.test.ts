import { expect, test } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { completedDuration, taskClock } from "./task-clock.ts";
import { detailTask } from "./task-detail.fixtures.ts";

const now = new Date("2026-10-24T12:00:00Z").getTime();
function event(type: string, minutesAgo: number, payload: TaskEvent["payload"] = {}): TaskEvent {
  return {
    id: `${type}-${minutesAgo}`,
    type: `task.${type}`,
    ts: new Date(now - minutesAgo * 60_000).toISOString(),
    taskId: "task",
    agentId: "agent",
    payload,
  };
}

test.each([
  ["claim", "open"],
  ["accept", "assigned"],
  ["join", "recruiting"],
  ["resume", "paused"],
])("%s starts the clock on entry from %s", (action, from) => {
  expect(taskClock([event(action, 8, { from, to: "in_progress" })], now)).toEqual({
    elapsedMs: 8 * 60_000,
    silentMinutes: null,
  });
});

test("resume uses the latest entry, while heartbeats do not reset silence", () => {
  const events = [
    event("claim", 90, { from: "open", to: "in_progress" }),
    event("pause", 50, { from: "in_progress", to: "paused" }),
    event("resume", 20, { from: "paused", to: "in_progress" }),
    event("heartbeat", 1, { from: "in_progress", to: "in_progress" }),
  ];
  expect(taskClock(events, now)).toEqual({ elapsedMs: 20 * 60_000, silentMinutes: 20 });
});

test("the last report determines silence without changing elapsed time", () => {
  const events = [
    event("claim", 90, { from: "open", to: "in_progress" }),
    event("reported", 40, { message: "First report" }),
    event("reported", 20, { message: "Latest report" }),
    event("heartbeat", 1, { from: "in_progress", to: "in_progress" }),
  ];
  expect(taskClock(events, now)).toEqual({ elapsedMs: 90 * 60_000, silentMinutes: 20 });
});

test.each([
  [15, null],
  [16, 16],
  [20.9, 20],
])("silence at %s minutes follows the strict threshold and rounds down", (minutes, expected) => {
  expect(taskClock([event("claim", minutes, { from: "open", to: "in_progress" })], now)).toEqual({
    elapsedMs: minutes * 60_000,
    silentMinutes: expected,
  });
});

test("a report before resume measures silence from the current entry", () => {
  expect(
    taskClock(
      [
        event("reported", 30, { message: "Before pause" }),
        event("resume", 20, { from: "paused", to: "in_progress" }),
      ],
      now,
    ),
  ).toEqual({ elapsedMs: 20 * 60_000, silentMinutes: 20 });
});

test.each([
  ["claim", "open"],
  ["accept", "assigned"],
  ["join", "recruiting"],
])("completed duration starts at the first %s and includes pauses and handoffs", (action, from) => {
  const task = { ...detailTask, completedAt: new Date(now).toISOString() };
  const events = [
    event(action, 90, { from, to: "in_progress" }),
    event("pause", 60, { from: "in_progress", to: "paused" }),
    event("resume", 45, { from: "paused", to: "in_progress" }),
    event("handoff", 30, { from: "in_progress", to: "assigned" }),
    event("accept", 10, { from: "assigned", to: "in_progress" }),
    event("complete", 0, { from: "in_progress", to: "done" }),
  ];
  expect(completedDuration(task, events)).toBe(90 * 60_000);
  expect(taskClock(events, now)?.elapsedMs).toBe(10 * 60_000);
});

test("completed duration requires a first start and a completed task with an endpoint", () => {
  const start = event("claim", 90, { from: "open", to: "in_progress" });
  expect(completedDuration(detailTask, [])).toBeNull();
  expect(
    completedDuration(detailTask, [event("resume", 10, { from: "paused", to: "in_progress" })]),
  ).toBeNull();
  expect(
    completedDuration(detailTask, [event("join", 10, { from: "recruiting", to: "recruiting" })]),
  ).toBeNull();
  expect(completedDuration({ ...detailTask, status: "in_progress" }, [start])).toBeNull();
  expect(completedDuration({ ...detailTask, completedAt: null }, [start])).toBeNull();
});

test("completed duration ends at completedAt even when later events arrive", () => {
  const task = { ...detailTask, completedAt: new Date(now - 5 * 60_000).toISOString() };
  const events = [
    event("claim", 90, { from: "open", to: "in_progress" }),
    event("complete", 5, { from: "in_progress", to: "done" }),
    event("reported", 1, { message: "Post-completion note" }),
  ];
  expect(completedDuration(task, events)).toBe(85 * 60_000);
});

test("no entry event leaves the clock absent", () => {
  expect(taskClock([], now)).toBeNull();
  expect(
    taskClock([event("heartbeat", 1, { from: "in_progress", to: "in_progress" })], now),
  ).toBeNull();
});
