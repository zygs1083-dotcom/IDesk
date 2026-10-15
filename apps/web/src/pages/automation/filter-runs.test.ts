import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { filterRuns } from "./filter-runs.ts";

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
