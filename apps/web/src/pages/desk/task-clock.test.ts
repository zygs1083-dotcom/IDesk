import { expect, test } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { taskClock } from "./task-clock.ts";

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

test("no entry event leaves the clock absent", () => {
  expect(taskClock([], now)).toBeNull();
  expect(
    taskClock([event("heartbeat", 1, { from: "in_progress", to: "in_progress" })], now),
  ).toBeNull();
});
