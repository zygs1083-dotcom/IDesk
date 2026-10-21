import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { config } from "../../config.ts";
import { db } from "../../db/client.ts";
import {
  automationJobs,
  automationRuns,
  connectors,
  events,
  serverSamples,
  tasks,
} from "../../db/schema.ts";
import { listAgents } from "../agents/agents.ts";
import { listRelay, relaySummary } from "../relay/query.ts";
import { listSchedules } from "../schedules/schedules.ts";
import { listServers } from "../servers/servers.ts";

export function taskLink(id: string): string {
  return `${(config.IDESK_PUBLIC_URL ?? "").replace(/\/$/, "")}/desk?task=${encodeURIComponent(id)}`;
}

export function taskEvents(id: string) {
  return db
    .select({ type: events.type, ts: events.ts, agentId: events.agentId, payload: events.payload })
    .from(events)
    .where(eq(events.taskId, id))
    .orderBy(desc(events.id))
    .limit(10)
    .all();
}

export function agentSummary() {
  return listAgents().map(({ id, name, host, capabilities, status }) => ({
    id,
    name,
    host,
    capabilities,
    status,
    currentTasks: db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(eq(tasks.assigneeId, id), inArray(tasks.status, ["assigned", "in_progress", "paused"])),
      )
      .all(),
  }));
}

export function serverSummary() {
  return listServers().map(({ id, name, status }) => ({
    id,
    name,
    status,
    latest:
      db
        .select({
          ts: serverSamples.ts,
          cpu: serverSamples.cpu,
          memUsed: serverSamples.memUsed,
          memTotal: serverSamples.memTotal,
          diskUsed: serverSamples.diskUsed,
          diskTotal: serverSamples.diskTotal,
        })
        .from(serverSamples)
        .where(eq(serverSamples.serverId, id))
        .orderBy(desc(serverSamples.ts), desc(serverSamples.id))
        .limit(1)
        .get() ?? null,
  }));
}

export function automationSummary(filter: { connector?: string; failedOnly?: boolean }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db
    .select({ id: connectors.id, name: connectors.name, lastError: connectors.lastError })
    .from(connectors)
    .all()
    .filter(
      (row) => !filter.connector || row.id === filter.connector || row.name === filter.connector,
    )
    .map((row) => {
      const runs = db
        .select({
          status: automationRuns.status,
          name: automationJobs.name,
          startedAt: automationRuns.startedAt,
          finishedAt: automationRuns.finishedAt,
        })
        .from(automationRuns)
        .innerJoin(automationJobs, eq(automationRuns.jobId, automationJobs.id))
        .where(
          and(
            eq(automationJobs.connectorId, row.id),
            or(
              gte(automationRuns.startedAt, today),
              and(
                isNull(automationRuns.startedAt),
                inArray(automationRuns.status, ["waiting", "running"]),
              ),
            ),
          ),
        )
        .orderBy(desc(automationRuns.startedAt))
        .all();
      const counts = { waiting: 0, running: 0, success: 0, failed: 0 };
      for (const run of runs) if (run.status !== "canceled") counts[run.status]++;
      return {
        ...row,
        counts,
        failures: runs
          .filter((run) => run.status === "failed")
          .slice(0, 10)
          .map(({ name, startedAt, finishedAt }) => ({ name, startedAt, finishedAt })),
      };
    })
    .filter((row) => !filter.failedOnly || row.counts.failed > 0 || row.lastError !== null);
}

export function scheduleSummary() {
  return listSchedules().map(({ id, name, enabled, lastRunAt, lastStatus, nextRunAt }) => ({
    id,
    name,
    enabled,
    lastRunAt,
    lastStatus,
    nextRunAt,
  }));
}

export function humanInbox() {
  const viewer = { kind: "human" } as const;
  return {
    ...relaySummary(viewer),
    pending: listRelay(viewer, "inbox", undefined, { requestStatus: "pending", limit: 5 }).map(
      ({ id, subject }) => ({ id, title: subject }),
    ),
  };
}
