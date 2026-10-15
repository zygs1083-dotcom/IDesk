import { expect, test } from "vitest";
import { type Job, nextRuns } from "./next-runs.ts";

const job: Job = {
  id: "job",
  connectorId: "connector",
  externalId: "external",
  name: "Daily",
  group: null,
  enabled: true,
  url: null,
  lastRunAt: null,
  lastRunStatus: null,
  schedule: { cron: "0 9 * * *", timezone: "UTC" },
};
const now = Date.parse("2026-10-15T00:00:00Z");

test("sorts by next run with the schedule timezone", () => {
  const shanghai = {
    ...job,
    id: "shanghai",
    schedule: { cron: "0 9 * * *", timezone: "Asia/Shanghai" },
  };
  expect(
    nextRuns([job, shanghai], now).map(({ job, next }) => [job.id, next.toISOString()]),
  ).toEqual([
    ["shanghai", "2026-10-15T01:00:00.000Z"],
    ["job", "2026-10-15T09:00:00.000Z"],
  ]);
});

test("omits missing, invalid and exhausted schedules", () => {
  expect(
    nextRuns(
      [
        { ...job, schedule: null },
        { ...job, schedule: { cron: "bad", timezone: "UTC" } },
        { ...job, schedule: { cron: "0 9 * * *", timezone: "invalid" } },
        { ...job, schedule: { cron: "0 0 30 2 *", timezone: "UTC" } },
      ],
      now,
    ),
  ).toEqual([]);
});

test("recomputes after the previous next run has passed", () => {
  expect(nextRuns([job], Date.parse("2026-10-15T09:00:01Z"))[0]?.next.toISOString()).toBe(
    "2026-10-16T09:00:00.000Z",
  );
});
