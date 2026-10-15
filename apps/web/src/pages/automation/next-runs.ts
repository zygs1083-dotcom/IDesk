import type { automationJobSchema } from "@idesk/shared/automation-schemas";
import { Cron } from "croner";
import type { z } from "zod";

export type Job = z.infer<typeof automationJobSchema>;

export type Upcoming = { job: Job; schedule: NonNullable<Job["schedule"]>; next: Date };

export function nextRuns(jobs: Job[], now: number): Upcoming[] {
  const upcoming: Upcoming[] = [];
  for (const job of jobs) {
    const { schedule } = job;
    if (!schedule) continue;
    // croner 对无法解析的表达式和时区直接抛错，这里把它们当成没有定时
    try {
      const next = new Cron(schedule.cron, { timezone: schedule.timezone, paused: true }).nextRun(
        new Date(now),
      );
      if (next) upcoming.push({ job, schedule, next });
    } catch {}
  }
  return upcoming.sort((a, b) => a.next.getTime() - b.next.getTime());
}
