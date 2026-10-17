import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors } from "../db/schema.ts";
import type { ExternalJob, ExternalRun } from "./types.ts";

export function storePoll(
  connector: typeof connectors.$inferSelect,
  now: Date,
  jobs: ExternalJob[],
  runs: ExternalRun[],
) {
  return db.transaction((tx) => {
    let count = 0;
    for (const job of jobs) {
      const existing = tx
        .select()
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.connectorId, connector.id),
            eq(automationJobs.externalId, job.externalId),
          ),
        )
        .get();
      if (
        !existing ||
        Object.entries(job).some(
          ([key, value]) =>
            JSON.stringify(existing[key as keyof typeof job]) !== JSON.stringify(value),
        )
      )
        count++;
      tx.insert(automationJobs)
        .values({ ...job, connectorId: connector.id })
        .onConflictDoUpdate({
          target: [automationJobs.connectorId, automationJobs.externalId],
          set: job,
        })
        .run();
    }
    count += tx
      .delete(automationJobs)
      .where(
        and(
          eq(automationJobs.connectorId, connector.id),
          notInArray(
            automationJobs.externalId,
            jobs.map((job) => job.externalId),
          ),
        ),
      )
      .run().changes;
    const storedJobs = tx
      .select()
      .from(automationJobs)
      .where(eq(automationJobs.connectorId, connector.id))
      .all();
    const jobIds = new Map(storedJobs.map((job) => [job.externalId, job.id]));
    for (const { jobExternalId, ...run } of runs) {
      const jobId = jobIds.get(jobExternalId);
      if (!jobId) continue;
      const existing = tx
        .select()
        .from(automationRuns)
        .where(and(eq(automationRuns.jobId, jobId), eq(automationRuns.externalId, run.externalId)))
        .get();
      if (
        !existing ||
        Object.entries(run).some(
          ([key, value]) =>
            JSON.stringify(existing[key as keyof typeof run]) !== JSON.stringify(value),
        )
      )
        count++;
      tx.insert(automationRuns)
        .values({ ...run, jobId })
        .onConflictDoUpdate({
          target: [automationRuns.jobId, automationRuns.externalId],
          set: run,
        })
        .run();
    }
    for (const job of storedJobs) {
      const history = tx
        .select()
        .from(automationRuns)
        .where(eq(automationRuns.jobId, job.id))
        .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
        .all();
      const removed = history
        .filter((run) => run.status !== "waiting" && run.status !== "running")
        .slice(50)
        .map((run) => run.id);
      if (removed.length)
        tx.delete(automationRuns).where(inArray(automationRuns.id, removed)).run();
      const latest = history[0];
      tx.update(automationJobs)
        .set({
          lastRunStatus: latest ? latest.status : null,
          lastRunAt: latest ? latest.startedAt : null,
        })
        .where(eq(automationJobs.id, job.id))
        .run();
    }
    tx.update(connectors)
      .set({ lastPolledAt: now, lastSucceededAt: now, lastError: null })
      .where(eq(connectors.id, connector.id))
      .run();
    return count;
  });
}
