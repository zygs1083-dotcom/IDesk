import { count } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { listAgents } from "../../apps/api/src/core/agents/agents.ts";
import { events, relayMessages, tasks } from "../../apps/api/src/db/schema.ts";
import type { Plugin } from "../../apps/api/src/plugins/types.ts";
import { TASK_STATUSES } from "../../packages/shared/src/task-status.ts";

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}

export default {
  id: "metrics",
  name: "Metrics",
  kind: "action",
  version: "0.1.0",
  configSchema: z.object({}),
  setup(ctx) {
    const app = new Hono();
    app.get("/prometheus", (c) => {
      const taskCounts = new Map(
        ctx.db
          .select({ status: tasks.status, total: count() })
          .from(tasks)
          .groupBy(tasks.status)
          .all()
          .map(({ status, total }) => [status, total]),
      );
      const agentCounts = { online: 0, offline: 0 };
      for (const agent of listAgents()) agentCounts[agent.status]++;
      const eventCounts = ctx.db
        .select({ type: events.type, total: count() })
        .from(events)
        .groupBy(events.type)
        .orderBy(events.type)
        .all();
      const relayCount = ctx.db.select({ total: count() }).from(relayMessages).get() as {
        total: number;
      };
      const body = [
        "# TYPE idesk_tasks gauge",
        ...TASK_STATUSES.map(
          (status) => `idesk_tasks{status="${status}"} ${taskCounts.get(status) ?? 0}`,
        ),
        "# TYPE idesk_agents gauge",
        `idesk_agents{status="online"} ${agentCounts.online}`,
        `idesk_agents{status="offline"} ${agentCounts.offline}`,
        "# TYPE idesk_events_total counter",
        ...eventCounts.map(
          ({ type, total }) => `idesk_events_total{type="${escapeLabel(type)}"} ${total}`,
        ),
        "# TYPE idesk_relay_messages_total counter",
        `idesk_relay_messages_total ${relayCount.total}`,
        "",
      ].join("\n");
      return c.text(body, 200, { "Content-Type": "text/plain; version=0.0.4" });
    });
    ctx.registerRoutes(app);
  },
} satisfies Plugin;
