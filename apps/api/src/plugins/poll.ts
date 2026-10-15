import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { emitEvent } from "../core/events/bus.ts";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors } from "../db/schema.ts";
import { connectorPlugin } from "./registry.ts";
import type { ExternalJob, ExternalRun } from "./types.ts";

export const polling = new Map<string, { done: number; total: number }>();

export async function pollConnector(
  connector: typeof connectors.$inferSelect,
  now: Date,
): Promise<void> {
  const plugin = connectorPlugin(connector.pluginId);
  if (!plugin) return;
  const active = db
    .select({ startedAt: automationRuns.startedAt })
    .from(automationRuns)
    .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
    .where(
      and(
        eq(automationJobs.connectorId, connector.id),
        inArray(automationRuns.status, ["waiting", "running"]),
      ),
    )
    .orderBy(asc(automationRuns.startedAt))
    .limit(1)
    .get();
  const since = active ? active.startedAt : connector.lastPolledAt;
  let jobs: ExternalJob[];
  let runs: ExternalRun[];
  const progress = (done: number, total: number) => polling.set(connector.id, { done, total });
  progress(0, 0);
  try {
    const config = plugin.configSchema.parse(connector.config);
    jobs = await plugin.listJobs(config, { progress });
    runs = await plugin.listRuns(config, { since, limit: 50, progress, jobs });
  } catch (error) {
    db.update(connectors)
      .set({ lastError: error instanceof Error ? error.message : String(error), lastPolledAt: now })
      .where(eq(connectors.id, connector.id))
      .run();
    return;
  } finally {
    polling.delete(connector.id);
  }
  const changed = db.transaction((tx) => {
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
      if (!existing) count++;
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
      if (!existing || existing.status !== run.status) count++;
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
      const removed = history.slice(50).map((run) => run.id);
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
      .set({ lastPolledAt: now, lastError: null })
      .where(eq(connectors.id, connector.id))
      .run();
    return count;
  });
  if (changed > 0)
    emitEvent({ type: "connector.polled", payload: { connectorId: connector.id, changed } });
}

export async function pollDueConnectors(now: Date): Promise<void> {
  const enabled = db.select().from(connectors).where(eq(connectors.enabled, true)).all();
  for (const connector of enabled) {
    if (
      connector.lastPolledAt === null ||
      now.getTime() - connector.lastPolledAt.getTime() >= connector.pollIntervalSec * 1000
    ) {
      await pollConnector(connector, now);
    }
  }
}
