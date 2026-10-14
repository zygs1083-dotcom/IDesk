import { Cron } from "croner";
import { runSchedule } from "../core/schedules/run.ts";
import { listSchedules, type Schedule } from "../core/schedules/schedules.ts";

const crons = new Map<string, Cron>();

export function unscheduleSchedule(id: string): void {
  crons.get(id)?.stop();
  crons.delete(id);
}

export function syncSchedule(row: Schedule): void {
  unscheduleSchedule(row.id);
  if (row.enabled) {
    crons.set(
      row.id,
      new Cron(row.cron, { timezone: row.timezone }, () => void runSchedule(row.id)),
    );
  }
}

export function startSchedules(): void {
  for (const row of listSchedules()) syncSchedule(row);
}

export function stopSchedules(): void {
  for (const id of crons.keys()) unscheduleSchedule(id);
}
