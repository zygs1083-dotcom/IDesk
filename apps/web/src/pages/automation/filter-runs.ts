import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { z } from "zod";

type Run = z.infer<typeof automationRunWithJobSchema>;

export function matches(query: string, values: (string | null)[]): boolean {
  const normalized = query.trim().toLowerCase();
  return !normalized || values.some((value) => value?.toLowerCase().includes(normalized));
}

export function filterRuns(runs: Run[], q: string): Run[] {
  if (!q.trim()) return runs;
  return runs.filter((run) => matches(q, [run.jobName, run.jobGroup, run.trigger]));
}
