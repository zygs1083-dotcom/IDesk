import { expect, test } from "vitest";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { boardHealth, type PendingRequest } from "./board-health-state.ts";
import { detailTask } from "./task-detail.fixtures.ts";

const now = new Date("2026-10-24T12:00:00Z").getTime();
function task(id: string, status: Task["status"], blockedBy: string[] = []): Task {
  return { ...detailTask, id, status, blockedBy };
}
function event(minutesAgo: number, type: string, payload: TaskEvent["payload"]): TaskEvent {
  return {
    id: `${type}-${minutesAgo}`,
    taskId: "running",
    agentId: "agent",
    ts: new Date(now - minutesAgo * 60_000).toISOString(),
    type,
    payload,
  };
}
const claim = (minutesAgo: number) =>
  event(minutesAgo, "task.claim", { from: "open", to: "in_progress" });

test("counts overlapping health groups across statuses and resolves dependencies outside the scope", () => {
  const scope = [
    task("running", "in_progress"),
    task("quiet", "in_progress"),
    task("no-events", "in_progress"),
    task("open", "open", ["dependency"]),
    task("paused", "paused", ["dependency"]),
    task("done", "done", ["dependency"]),
    task("cancelled", "cancelled", ["dependency"]),
    task("unblocked", "open", ["done", "cancelled", "missing"]),
  ];
  const health = boardHealth(
    scope,
    [...scope, task("dependency", "assigned")],
    new Map([
      ["running", [claim(8)]],
      ["quiet", [claim(20)]],
      ["paused", [claim(20)]],
    ]),
    [],
    now,
  );
  expect([...health.in_progress]).toEqual(["running", "quiet", "no-events"]);
  expect([...health.silent]).toEqual(["quiet"]);
  expect([...health.blocked]).toEqual(["open", "paused"]);
});

test("silence begins strictly after fifteen minutes, never from absent or report-only events", () => {
  const scope = [task("running", "in_progress")];
  const events = new Map([["running", [claim(15)]]]);
  expect(boardHealth(scope, scope, events, [], now).silent.size).toBe(0);
  expect(boardHealth(scope, scope, events, [], now + 1).silent.has("running")).toBe(true);
  events.set("running", []);
  expect(boardHealth(scope, scope, events, [], now).silent.size).toBe(0);
  events.set("running", [event(20, "task.reported", { message: "old report" })]);
  expect(boardHealth(scope, scope, events, [], now).silent.size).toBe(0);
});

test("pause and resume restart silence even when the only report belongs to an older run", () => {
  const scope = [task("running", "in_progress")];
  const events = new Map([
    [
      "running",
      [
        claim(60),
        event(50, "task.reported", { message: "old report" }),
        event(40, "task.pause", { from: "in_progress", to: "paused" }),
        event(10, "task.resume", { from: "paused", to: "in_progress" }),
      ],
    ],
  ]);
  expect(boardHealth(scope, scope, events, [], now).silent.size).toBe(0);
  expect(boardHealth(scope, scope, events, [], now + 6 * 60_000).silent.has("running")).toBe(true);
  events.get("running")?.push(event(1, "task.reported", { message: "fresh report" }));
  expect(boardHealth(scope, scope, events, [], now).silent.size).toBe(0);
});

test("updated task status, dependency status and task events immediately change membership", () => {
  const running = task("running", "in_progress", ["dependency"]);
  const dependency = task("dependency", "open");
  const events = new Map([[running.id, [claim(20)]]]);
  expect(boardHealth([running], [running, dependency], events, [], now).blocked.size).toBe(1);
  expect(boardHealth([running], [running, dependency], events, [], now).silent.size).toBe(1);
  for (const status of ["done", "cancelled"] as const) {
    expect(
      boardHealth([running], [running, { ...dependency, status }], events, [], now).blocked.size,
    ).toBe(0);
  }
  const done = { ...running, status: "done" as const };
  const health = boardHealth([done], [done, dependency], events, [], now);
  expect(health.in_progress.size).toBe(0);
  expect(health.silent.size).toBe(0);
  expect(health.blocked.size).toBe(0);
});

test("pending agent requests count tasks once and exclude human requests and missing task links", () => {
  const scope = [task("waiting", "in_progress"), task("human-request", "open")];
  const pending: PendingRequest[] = [
    { kind: "request", fromAgentId: "agent", taskId: "waiting" },
    { kind: "request", fromAgentId: "other-agent", taskId: "waiting" },
    { kind: "request", fromAgentId: "human", taskId: "human-request" },
    { kind: "request", fromAgentId: "p_person", taskId: "human-request" },
    { kind: "note", fromAgentId: "agent", taskId: "human-request" },
    { kind: "request", fromAgentId: "agent", taskId: null },
    { kind: "request", fromAgentId: "agent", taskId: "outside-search" },
  ];
  expect([...boardHealth(scope, scope, new Map(), pending, now).waiting]).toEqual(["waiting"]);
  expect(boardHealth(scope, scope, new Map(), [], now).waiting.size).toBe(0);
});
