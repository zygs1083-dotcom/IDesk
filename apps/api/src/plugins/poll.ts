import { and, eq, inArray } from "drizzle-orm";
import { emitEvent } from "../core/events/bus.ts";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors } from "../db/schema.ts";
import { storePoll } from "./poll-store.ts";
import { connectorPlugin } from "./registry.ts";

export const polling = new Map<string, { done: number; total: number }>();
const inFlight = new Map<string, Promise<void>>();

export function pollConnector(connector: typeof connectors.$inferSelect, now: Date): Promise<void> {
  const pending = inFlight.get(connector.id);
  if (pending) return pending;
  const promise = poll(connector.id, now).finally(() => {
    inFlight.delete(connector.id);
    polling.delete(connector.id);
  });
  inFlight.set(connector.id, promise);
  return promise;
}

async function poll(id: string, now: Date): Promise<void> {
  const connector = db.select().from(connectors).where(eq(connectors.id, id)).get();
  if (!connector?.enabled || (connector.lastPolledAt !== null && now < connector.lastPolledAt))
    return;
  const plugin = connectorPlugin(connector.pluginId);
  if (!plugin) return;
  const active = db
    .select({
      externalId: automationRuns.externalId,
      jobExternalId: automationJobs.externalId,
      startedAt: automationRuns.startedAt,
    })
    .from(automationRuns)
    .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
    .where(
      and(
        eq(automationJobs.connectorId, id),
        inArray(automationRuns.status, ["waiting", "running"]),
      ),
    )
    .all();
  let since = connector.lastSucceededAt ?? new Date(now.getTime() - 7 * 86_400_000);
  for (const run of active)
    if (run.startedAt !== null && run.startedAt < since) since = run.startedAt;
  // Ignore results fetched using a configuration that was changed or deleted while awaiting I/O.
  const isCurrent = () => {
    const current = db.select().from(connectors).where(eq(connectors.id, id)).get();
    return (
      current?.enabled &&
      current.pluginId === connector.pluginId &&
      JSON.stringify(current.config) === JSON.stringify(connector.config)
    );
  };
  const progress = (done: number, total: number) => polling.set(id, { done, total });
  progress(0, 0);
  let changed = 0;
  try {
    const config = plugin.configSchema.parse(connector.config);
    const jobs = await plugin.listJobs(config, { progress });
    if (!isCurrent()) return;
    const runs = await plugin.listRuns(config, {
      since,
      limit: 50,
      progress,
      jobs,
      activeRuns: active.filter((run) => jobs.some((job) => job.externalId === run.jobExternalId)),
    });
    if (!isCurrent()) return;
    changed = storePoll(connector, now, jobs, runs);
  } catch (error) {
    if (!isCurrent()) return;
    db.update(connectors)
      .set({ lastError: error instanceof Error ? error.message : String(error), lastPolledAt: now })
      .where(eq(connectors.id, id))
      .run();
  }
  emitEvent({
    type: "connector.polled",
    payload: { connectorId: id, name: connector.name, changed },
  });
}

export async function pollDueConnectors(now: Date): Promise<void> {
  const enabled = db.select().from(connectors).where(eq(connectors.enabled, true)).all();
  for (const connector of enabled) {
    if (
      connector.lastPolledAt === null ||
      now.getTime() - connector.lastPolledAt.getTime() >= connector.pollIntervalSec * 1000
    )
      await pollConnector(connector, now);
  }
}
