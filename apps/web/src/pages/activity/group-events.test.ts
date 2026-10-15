import type { eventSchema } from "@idesk/shared/task-schemas";
import { expect, it } from "vitest";
import type { z } from "zod";
import { groupEvents } from "./group-events.ts";

function event(id: string, date: Date): z.infer<typeof eventSchema> {
  return {
    id,
    ts: date.toISOString(),
    type: "task.created",
    taskId: null,
    agentId: null,
    payload: {},
  };
}

it("groups local days across midnight while preserving reverse chronological order", () => {
  const events = [
    event("a", new Date(2026, 9, 14, 12)),
    event("b", new Date(2026, 9, 14, 0)),
    event("c", new Date(2026, 9, 13, 23, 59)),
    event("d", new Date(2026, 9, 3)),
  ];
  const groups = groupEvents(events, "zh", new Date(2026, 9, 14, 15));
  expect(groups.map((group) => [group.label, group.events.map((event) => event.id)])).toEqual([
    ["今天", ["a", "b"]],
    ["昨天", ["c"]],
    ["10 月 3 日", ["d"]],
  ]);
});

it("distinguishes years and handles the previous day at a year boundary", () => {
  const groups = groupEvents(
    [event("a", new Date(2025, 11, 31)), event("b", new Date(2024, 11, 31))],
    "zh",
    new Date(2026, 0, 1),
  );
  expect(groups.map((group) => group.label)).toEqual(["昨天", "2024 年 12 月 31 日"]);
});

it("returns no groups for an empty event list", () => {
  expect(groupEvents([], "zh")).toEqual([]);
});

it("formats English date groups with years only across year boundaries", () => {
  const groups = groupEvents(
    [
      event("a", new Date(2026, 9, 15)),
      event("b", new Date(2026, 9, 14)),
      event("c", new Date(2026, 9, 3)),
      event("d", new Date(2025, 9, 3)),
    ],
    "en",
    new Date(2026, 9, 15, 15),
  );
  expect(groups.map((group) => group.label)).toEqual([
    "Today",
    "Yesterday",
    "Oct 3",
    "Oct 3, 2025",
  ]);
});
