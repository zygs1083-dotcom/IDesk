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

export type RunRange = "today" | "all";

export function isRunToday(run: Pick<Run, "startedAt" | "finishedAt">, now: number): boolean {
  const timestamp = run.finishedAt ?? run.startedAt;
  if (timestamp === null) return false;
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return new Date(timestamp).getTime() >= midnight.getTime();
}

export function selectRuns(
  runs: Run[],
  q: string,
  range: RunRange,
  showHidden: boolean,
  now: number,
) {
  const latestSuccess = new Map<string, number>();
  for (const run of runs) {
    if (run.status !== "success" || run.startedAt === null) continue;
    const startedAt = new Date(run.startedAt).getTime();
    const latest = latestSuccess.get(run.jobId);
    if (latest === undefined || startedAt > latest) latestSuccess.set(run.jobId, startedAt);
  }
  const unrecovered = runs.filter((run) => {
    if (run.status !== "failed" || run.startedAt === null) return true;
    const success = latestSuccess.get(run.jobId);
    return success === undefined || success <= new Date(run.startedAt).getTime();
  });
  const inRange = filterRuns(unrecovered, q).filter(
    (run) =>
      range === "all" ||
      run.status === "waiting" ||
      run.status === "running" ||
      isRunToday(run, now),
  );
  return {
    runs: inRange.filter((run) => showHidden || run.hiddenAt === null),
    hiddenCount: inRange.filter((run) => run.hiddenAt !== null).length,
  };
}
