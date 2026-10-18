import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { describe, expect, it, test } from "vitest";
import type { z } from "zod";
import { filterRuns, isRunToday, matches, selectRuns } from "./filter-runs.ts";

const run: z.infer<typeof automationRunWithJobSchema> = {
  id: "run",
  jobId: "job",
  externalId: "external",
  jobName: "Daily Import",
  jobGroup: "Warehouse",
  status: "waiting",
  trigger: "Schedule",
  startedAt: null,
  finishedAt: null,
  hiddenAt: null,
  url: null,
  error: null,
};
const other = { ...run, id: "other", jobName: "Backup", jobGroup: null, trigger: null };
const runs = [run, other];

describe("filterRuns", () => {
  it.each(["", "   "])("returns the original array for an empty query: %j", (q) => {
    expect(filterRuns(runs, q)).toBe(runs);
  });

  it.each(["Import", "Warehouse", "Schedule"])("matches workflow, project or trigger: %s", (q) => {
    expect(filterRuns(runs, q)).toEqual([run]);
  });

  it.each(["  DAILY  ", "wAREHOUSE", "sCHEDULE"])(
    "ignores case and surrounding whitespace: %s",
    (q) => {
      expect(filterRuns(runs, q)).toEqual([run]);
    },
  );

  it("does not match null projects or triggers", () => {
    expect(filterRuns([other], "Warehouse")).toEqual([]);
    expect(filterRuns([other], "Schedule")).toEqual([]);
    expect(filterRuns(runs, "missing")).toEqual([]);
  });
});

test("matches run and job fields, including nulls and blank queries", () => {
  expect(matches(" warehouse ", [run.jobName, run.jobGroup, run.trigger])).toBe(true);
  expect(matches("daily", ["Daily Import", "Warehouse"])).toBe(true);
  expect(matches("schedule", ["Daily Import", "Warehouse"])).toBe(false);
  expect(matches("missing", [null, null])).toBe(false);
  expect(matches(" ", [null])).toBe(true);
});

const today = new Date(2026, 9, 18).getTime();
const yesterday = new Date(2026, 9, 17, 23, 59).toISOString();
const midnight = new Date(today).toISOString();

test("local date uses finish time first, falls back to start, and changes at midnight", () => {
  expect(isRunToday(run, today)).toBe(false);
  expect(isRunToday({ startedAt: yesterday, finishedAt: null }, today)).toBe(false);
  expect(isRunToday({ startedAt: midnight, finishedAt: null }, today)).toBe(true);
  expect(isRunToday({ startedAt: yesterday, finishedAt: midnight }, today)).toBe(true);
  expect(isRunToday({ startedAt: midnight, finishedAt: yesterday }, today)).toBe(false);
  const prior = { startedAt: yesterday, finishedAt: null };
  expect(isRunToday(prior, today - 1)).toBe(true);
  expect(isRunToday(prior, today)).toBe(false);
});

test("range, hidden visibility and search combine while active runs ignore range", () => {
  const done = { ...run, status: "success" as const, finishedAt: midnight };
  const hidden = { ...done, id: "hidden", hiddenAt: midnight };
  const old = { ...hidden, id: "old", finishedAt: yesterday };
  const failed = { ...done, id: "failed", status: "failed" as const, finishedAt: yesterday };
  const canceled = { ...done, id: "canceled", status: "canceled" as const, finishedAt: yesterday };
  const running = { ...run, status: "running" as const };
  const all = [run, running, done, hidden, old, failed, canceled];
  expect(selectRuns(all, "import", "today", false, today)).toEqual({
    runs: [run, running, done],
    hiddenCount: 1,
  });
  expect(selectRuns(all, "import", "today", true, today)).toEqual({
    runs: [run, running, done, hidden],
    hiddenCount: 1,
  });
  expect(selectRuns(all, "", "all", false, today)).toEqual({
    runs: [run, running, done, failed, canceled],
    hiddenCount: 2,
  });
  expect(selectRuns(all, "", "all", true, today).runs).toEqual(all);
  expect(selectRuns(all, "missing", "all", true, today)).toEqual({ runs: [], hiddenCount: 0 });
});
