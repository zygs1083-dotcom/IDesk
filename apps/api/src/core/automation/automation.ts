import { asc, desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { automationJobs, automationRuns } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";

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
    .select({
      ...getTableColumns(automationRuns),
      jobName: automationJobs.name,
      jobGroup: automationJobs.group,
    })
    .from(automationRuns)
    .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
    .where(eq(automationJobs.connectorId, connectorId))
    .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
    .all();
}

export function setRunHidden(id: string, hidden: boolean) {
  const run = db
    .select({
      ...getTableColumns(automationRuns),
      jobName: automationJobs.name,
      jobGroup: automationJobs.group,
    })
    .from(automationRuns)
    .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
    .where(eq(automationRuns.id, id))
    .get();
  if (!run) throw new HttpError(404, "automation.notFound");
  if (run.status === "waiting" || run.status === "running")
    throw new HttpError(409, "automation.runNotFinished");
  if ((run.hiddenAt !== null) === hidden) return run;
  const hiddenAt = hidden ? new Date() : null;
  db.update(automationRuns).set({ hiddenAt }).where(eq(automationRuns.id, id)).run();
  return { ...run, hiddenAt };
}
