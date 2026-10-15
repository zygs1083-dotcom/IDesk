import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { listAgents } from "../../apps/api/src/core/agents/agents.ts";
import { firstBlocker } from "../../apps/api/src/core/tasks/dependencies.ts";
import { tasks } from "../../apps/api/src/db/schema.ts";
import type { Plugin } from "../../apps/api/src/plugins/types.ts";
import { selectAgent } from "./select-agent.ts";

const configSchema = z.object({
  tag: z.string().default("").meta({ title: "只处理带此标签的任务" }),
});

export default {
  id: "auto-assign",
  name: "Auto assign",
  version: "0.1.0",
  kind: "action",
  enabledByDefault: false,
  configSchema,
  setup(ctx) {
    const { tag } = ctx.config as z.infer<typeof configSchema>;
    ctx.events.on("task.created", (event) => {
      // 让 task.created 先于 task.assign 广播
      queueMicrotask(() => {
        const task = ctx.db
          .select()
          .from(tasks)
          .where(eq(tasks.id, event.taskId as string))
          .get() as typeof tasks.$inferSelect;
        if (task.status !== "open" || firstBlocker(ctx.db, task)) return;
        if (tag && !task.tags.includes(tag)) return;
        const loads = ctx.db
          .select({ agentId: tasks.assigneeId, load: count() })
          .from(tasks)
          .where(inArray(tasks.status, ["assigned", "in_progress", "paused"]))
          .groupBy(tasks.assigneeId)
          .all();
        const agentId = selectAgent(
          task,
          listAgents(),
          new Map(loads.map((row) => [row.agentId as string, row.load])),
        );
        if (agentId !== undefined) ctx.tasks.act(task.id, { type: "assign", agentId });
      });
    });
  },
} satisfies Plugin;
