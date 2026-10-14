import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { automationJobs, automationRuns } from "../../db/schema.ts";

export function listJobs(connectorId?: string) {
  return db
    .select()
    .from(automationJobs)
    .where(connectorId === undefined ? undefined : eq(automationJobs.connectorId, connectorId))
    .orderBy(asc(automationJobs.name))
    .all()
    .map((row) => ({
      ...row,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
    }));
}
export function listRuns(jobId: string) {
  if (!db.select().from(automationJobs).where(eq(automationJobs.id, jobId)).get()) return undefined;
  return db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.jobId, jobId))
    .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
    .limit(50)
    .all()
    .map((row) => ({
      ...row,
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
    }));
}
