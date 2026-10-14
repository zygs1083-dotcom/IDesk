import type { TaskPriority, TaskStatus } from "@idesk/shared/task-status";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";

export type Task = typeof tasks.$inferSelect;

export function createTask(
  input: {
    title: string;
    body?: string;
    priority?: TaskPriority;
    tags?: string[];
    capabilities?: string[];
    dueAt?: Date;
  },
  publisherId: string,
): Task {
  const now = new Date();
  const { task, event } = db.transaction((tx) => {
    const task = tx
      .insert(tasks)
      .values({ ...input, publisherId, createdAt: now, updatedAt: now })
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "task.created",
      taskId: task.id,
      ...(publisherId === "human" ? {} : { agentId: publisherId }),
      payload: {},
    });
    return { task, event };
  });
  publishEvent(event);
  return task;
}

export function listTasks(filter: {
  status?: TaskStatus;
  capability?: string;
  assigneeId?: string;
}): Task[] {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        filter.status === undefined ? undefined : eq(tasks.status, filter.status),
        filter.assigneeId === undefined ? undefined : eq(tasks.assigneeId, filter.assigneeId),
        filter.capability === undefined
          ? undefined
          : sql`exists (
      select 1 from json_each(${tasks.capabilities}) where value = ${filter.capability}
    )`,
      ),
    )
    .orderBy(desc(tasks.updatedAt))
    .all();
}

export function getTask(id: string): Task | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}
