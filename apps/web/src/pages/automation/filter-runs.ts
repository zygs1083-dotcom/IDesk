import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { z } from "zod";

type Run = z.infer<typeof automationRunWithJobSchema>;

export function filterRuns(runs: Run[], q: string): Run[] {
  const query = q.trim().toLowerCase();
  if (query === "") return runs;
  return runs.filter(
    (run) =>
      run.jobName.toLowerCase().includes(query) ||
      run.jobGroup?.toLowerCase().includes(query) ||
      run.trigger?.toLowerCase().includes(query),
  );
}
