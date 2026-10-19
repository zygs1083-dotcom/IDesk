import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { expect, test } from "vitest";
import type { z } from "zod";
import { selectRuns } from "./filter-runs.ts";

type Run = z.infer<typeof automationRunWithJobSchema>;
const now = new Date(2026, 9, 19, 12).getTime();
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();
const failure: Run = {
  id: "failure",
  jobId: "connector-a/project-a/workflow",
  externalId: "instance-1",
  jobName: "Import",
  jobGroup: "Warehouse",
  status: "failed",
  trigger: "START_PROCESS",
  startedAt: at(19, 8),
  finishedAt: at(19, 9),
  hiddenAt: null,
  url: null,
  error: "Failed",
};
const success: Run = {
  ...failure,
  id: "success",
  externalId: "instance-2",
  status: "success",
  startedAt: at(19, 10),
  finishedAt: at(19, 11),
  error: null,
};

test("newer success removes older failures, retains subsequent failures and leaves history unchanged", () => {
  const nextFailure = { ...failure, id: "next-failure", startedAt: at(19, 12) };
  const renamedSuccess = { ...success, jobName: "Renamed workflow", jobGroup: "Renamed project" };
  const runs = [nextFailure, failure, renamedSuccess];
  const before = structuredClone(runs);
  expect(selectRuns(runs, "", "all", true, now)).toEqual({
    runs: [nextFailure, renamedSuccess],
    hiddenCount: 0,
  });
  expect(runs).toEqual(before);
  expect(selectRuns([...runs].reverse(), "", "all", false, now).runs).toEqual([
    renamedSuccess,
    nextFailure,
  ]);
});

test.each(["waiting", "running", "canceled", "failed"] as const)(
  "a newer %s instance does not recover a failure",
  (status) => {
    const newer = { ...success, status };
    expect(selectRuns([failure, newer], "", "all", false, now).runs).toEqual([failure, newer]);
  },
);

test.each([
  { startedAt: at(19, 8), finishedAt: at(19, 12) },
  { startedAt: at(19, 7), finishedAt: at(19, 12) },
  { startedAt: null, finishedAt: at(19, 12) },
])("success at $startedAt does not override a failure based on its finish time", (times) => {
  const other = { ...success, ...times };
  expect(selectRuns([failure, other], "", "all", false, now).runs).toEqual([failure, other]);
});

test("a failure without a start time stays visible", () => {
  const undated = { ...failure, startedAt: null };
  expect(selectRuns([success, undated], "", "all", false, now).runs).toEqual([success, undated]);
});

test("the latest success is used even when an older success is later in the input", () => {
  const oldSuccess = { ...success, id: "old-success", startedAt: at(19, 7) };
  expect(selectRuns([success, failure, oldSuccess], "", "all", false, now).runs).toEqual([
    success,
    oldSuccess,
  ]);
});

test.each([
  { jobId: "connector-a/project-b/workflow", jobGroup: "Warehouse B" },
  { jobId: "connector-b/project-a/workflow", jobGroup: "Warehouse" },
  { jobId: "connector-a/project-a/other-workflow", jobGroup: "Warehouse" },
])("same-name workflow $jobId does not recover another workflow", (identity) => {
  const other = { ...success, ...identity };
  expect(selectRuns([failure, other], "", "all", false, now).runs).toEqual([failure, other]);
});

test("success excluded by search, day or manual hiding still recovers an earlier failure", () => {
  const priorFailure = { ...failure, startedAt: at(17, 8), finishedAt: at(19, 9) };
  const priorSuccess = {
    ...success,
    trigger: "SCHEDULER",
    startedAt: at(18, 8),
    finishedAt: at(18, 9),
    hiddenAt: at(18, 10),
  };
  for (const range of ["today", "all"] as const) {
    for (const showHidden of [false, true]) {
      expect(
        selectRuns([priorFailure, priorSuccess], "START_PROCESS", range, showHidden, now),
      ).toEqual({ runs: [], hiddenCount: 0 });
    }
  }
  expect(selectRuns([priorFailure, priorSuccess], "", "today", true, now)).toEqual({
    runs: [],
    hiddenCount: 0,
  });
  expect(selectRuns([priorFailure, priorSuccess], "", "all", false, now)).toEqual({
    runs: [],
    hiddenCount: 1,
  });
  expect(selectRuns([priorFailure, priorSuccess], "", "all", true, now)).toEqual({
    runs: [priorSuccess],
    hiddenCount: 1,
  });
});

test("recovered hidden failures are excluded from the hidden count as well as displayed cards", () => {
  const hiddenFailure = { ...failure, hiddenAt: at(19, 9) };
  for (const showHidden of [false, true]) {
    expect(selectRuns([hiddenFailure, success], "", "all", showHidden, now)).toEqual({
      runs: [success],
      hiddenCount: 0,
    });
  }
});
