import type { automationJobSchema } from "@idesk/shared/automation-schemas";
import { Cron } from "croner";
import type { z } from "zod";

export type Job = z.infer<typeof automationJobSchema>;

export function nextRuns(jobs: Job[], now: number): { job: Job; next: Date }[] {
  const upcoming: { job: Job; next: Date }[] = [];
  for (const job of jobs) {
    if (!job.schedule) continue;
    // Croner reports invalid expressions and timezones by throwing.
    try {
      const next = new Cron(job.schedule.cron, {
        timezone: job.schedule.timezone,
        paused: true,
      }).nextRun(new Date(now));
      if (next) upcoming.push({ job, next });
    } catch {}
  }
  return upcoming.sort((a, b) => a.next.getTime() - b.next.getTime());
}
