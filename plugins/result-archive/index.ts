import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { agents, tasks } from "../../apps/api/src/db/schema.ts";
import type { Plugin } from "../../apps/api/src/plugins/types.ts";

type Task = typeof tasks.$inferSelect;

export function renderArchive(task: Task, assignee: string, publisher: string): string {
  return `---
title: ${JSON.stringify(task.title)}
assignee: ${JSON.stringify(assignee)}
publisher: ${JSON.stringify(publisher)}
tags: ${JSON.stringify(task.tags)}
completedAt: ${(task.completedAt as Date).toISOString()}
---

${task.body}

## 结果

${task.result}
`;
}

export default {
  id: "result-archive",
  name: "Result archive",
  version: "0.1.0",
  kind: "notifier",
  enabledByDefault: false,
  configSchema: z.object({}),
  setup(ctx) {
    const name = (id: string): string =>
      id === "human"
        ? "human"
        : (ctx.db.select().from(agents).where(eq(agents.id, id)).get()?.name ?? id);
    ctx.events.on("task.complete", (event) => {
      const task = ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, event.taskId as string))
        .get() as Task;
      // complete 只能从 in_progress 发生，该状态一定有负责人。
      const assignee = name(task.assigneeId as string);
      const completedAt = (task.completedAt as Date).toISOString();
      const directory = join(ctx.dataDir, completedAt.slice(0, 7));
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, `${completedAt.slice(0, 10)}-${task.id}.md`),
        renderArchive(task, assignee, name(task.publisherId)),
      );
    });
  },
} satisfies Plugin;
