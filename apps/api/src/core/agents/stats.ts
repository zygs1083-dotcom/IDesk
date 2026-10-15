import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { agents, events } from "../../db/schema.ts";
import { TERMINAL_WINDOW_MS } from "../tasks/store.ts";

type DurationEvent = Pick<typeof events.$inferSelect, "ts" | "taskId" | "type">;

export function averageDurationMs(input: DurationEvent[]): number | null {
  const ordered = [...input].sort(
    (a, b) =>
      a.ts.getTime() - b.ts.getTime() ||
      Number(b.type === "task.complete") - Number(a.type === "task.complete"),
  );
  const starts = new Map<string, number>();
  let total = 0;
  let matched = 0;
  for (const event of ordered) {
    if (event.taskId === null) continue;
    const ts = event.ts.getTime();
    if (event.type === "task.complete") {
      const start = starts.get(event.taskId);
      if (start !== undefined && start < ts) {
        total += ts - start;
        matched++;
      }
    } else if (["task.claim", "task.accept", "task.join"].includes(event.type)) {
      starts.set(event.taskId, ts);
    }
  }
  return matched === 0 ? null : Math.round(total / matched);
}

export function getAgentStats(agentId: string) {
  if (!db.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId)).get()) {
    return undefined;
  }
  const counts = db
    .select({
      type: events.type,
      total: count(),
      recent: sql<number>`sum(case when ${events.ts} >= ${Date.now() - TERMINAL_WINDOW_MS} then 1 else 0 end)`,
    })
    .from(events)
    .where(
      and(
        eq(events.agentId, agentId),
        inArray(events.type, ["task.complete", "task.handoff", "task.reported"]),
      ),
    )
    .groupBy(events.type)
    .all();
  const totals = new Map(counts.map((row) => [row.type, row]));
  const durationEvents = db
    .select({ ts: events.ts, taskId: events.taskId, type: events.type })
    .from(events)
    .where(
      and(
        eq(events.agentId, agentId),
        inArray(events.type, ["task.complete", "task.claim", "task.accept", "task.join"]),
      ),
    )
    .orderBy(asc(events.ts))
    .all();
  return {
    completed: totals.get("task.complete")?.total ?? 0,
    last7dCompleted: totals.get("task.complete")?.recent ?? 0,
    handoffs: totals.get("task.handoff")?.total ?? 0,
    reported: totals.get("task.reported")?.total ?? 0,
    avgDurationMs: averageDurationMs(durationEvents),
  };
}
