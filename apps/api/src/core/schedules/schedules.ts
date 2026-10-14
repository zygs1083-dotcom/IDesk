import type { createScheduleSchema, updateScheduleSchema } from "@idesk/shared/schedule-schemas";
import { Cron } from "croner";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { schedules } from "../../db/schema.ts";

export type Schedule = typeof schedules.$inferSelect;

export function nextScheduleRun(row: Pick<Schedule, "cron" | "timezone" | "enabled">): Date | null {
  if (!row.enabled) return null;
  return new Cron(row.cron, { timezone: row.timezone, paused: true }).nextRun();
}

export function listSchedules(): Schedule[] {
  return db.select().from(schedules).all();
}

export function getSchedule(id: string): Schedule | undefined {
  return db.select().from(schedules).where(eq(schedules.id, id)).get();
}

export function createSchedule(input: z.infer<typeof createScheduleSchema>): Schedule {
  return db
    .insert(schedules)
    .values({ ...input, nextRunAt: nextScheduleRun(input) })
    .returning()
    .get();
}

export function updateSchedule(
  id: string,
  input: z.infer<typeof updateScheduleSchema>,
): Schedule | undefined {
  const row = getSchedule(id);
  if (!row) return undefined;
  return db
    .update(schedules)
    .set({ ...input, nextRunAt: nextScheduleRun({ ...row, ...input }) })
    .where(eq(schedules.id, id))
    .returning()
    .get();
}

export function deleteSchedule(id: string): Schedule | undefined {
  return db.delete(schedules).where(eq(schedules.id, id)).returning().get();
}
