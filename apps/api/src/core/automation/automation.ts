import { asc, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { automationJobs, automationRuns } from "../../db/schema.ts";

export function listJobs(connectorId?: string) {
  return db
    .select()
    .from(automationJobs)
    .where(connectorId === undefined ? undefined : eq(automationJobs.connectorId, connectorId))
    .orderBy(asc(automationJobs.name))
    .all();
}
export function listRuns(jobId: string) {
  if (!db.select().from(automationJobs).where(eq(automationJobs.id, jobId)).get()) return undefined;
  return db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.jobId, jobId))
    .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
    .limit(50)
    .all();
}

export function listRunsForConnector(connectorId: string) {
  return db
    .select({ ...getTableColumns(automationRuns), jobName: automationJobs.name })
    .from(automationRuns)
    .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
    .where(eq(automationJobs.connectorId, connectorId))
    .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
    .all();
}
