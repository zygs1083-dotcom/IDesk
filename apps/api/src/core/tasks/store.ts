import type { TaskPriority, TaskStatus } from "@idesk/shared/task-status";
import { and, desc, eq, gt, lt, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";
import { validateDependencies } from "./dependencies.ts";

export type Task = typeof tasks.$inferSelect;
// 不筛状态时，已完成/已取消的任务只保留最近 7 天，看板和 AI 的默认列表都不用背历史
export const TERMINAL_WINDOW_MS = 7 * 86400000;

export function createTask(
  input: {
    title: string;
    body?: string;
    priority?: TaskPriority;
    tags?: string[];
    capabilities?: string[];
    dueAt?: Date;
    blockedBy?: string[];
  },
  publisherId: string,
): Task {
  const now = new Date();
  const { task, event } = db.transaction((tx) => {
    const blockedBy = validateDependencies(tx, input.blockedBy ?? []);
    const task = tx
      .insert(tasks)
      .values({ ...input, blockedBy, publisherId, createdAt: now, updatedAt: now })
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "task.created",
      taskId: task.id,
      payload: { title: task.title, status: task.status },
      ...(publisherId === "human" ? {} : { agentId: publisherId }),
    });
    return { task, event };
  });
  publishEvent(event);
  return task;
}

export function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, "\\$&");
}

export function listTasks(filter: {
  q?: string;
  status?: TaskStatus;
  capability?: string;
  assigneeId?: string;
  limit?: number;
  cursor?: string;
}): Task[] {
  const [cursorTime, cursorId] = filter.cursor?.split("|") ?? [];
  const pattern = filter.q === undefined ? undefined : `%${escapeLike(filter.q)}%`;
  return db
    .select()
    .from(tasks)
    .where(
      and(
        cursorTime === undefined || cursorId === undefined
          ? undefined
          : or(
              lt(tasks.updatedAt, new Date(Number(cursorTime))),
              and(eq(tasks.updatedAt, new Date(Number(cursorTime))), lt(tasks.id, cursorId)),
            ),
        pattern === undefined
          ? undefined
          : sql`(${tasks.title} LIKE ${pattern} ESCAPE '\\'
              OR ${tasks.body} LIKE ${pattern} ESCAPE '\\'
              OR ${tasks.result} LIKE ${pattern} ESCAPE '\\')`,
        filter.status === undefined
          ? or(
              notInArray(tasks.status, ["done", "cancelled"]),
              gt(tasks.updatedAt, new Date(Date.now() - TERMINAL_WINDOW_MS)),
            )
          : eq(tasks.status, filter.status),
        filter.assigneeId === undefined ? undefined : eq(tasks.assigneeId, filter.assigneeId),
        filter.capability === undefined
          ? undefined
          : sql`exists (
      select 1 from json_each(${tasks.capabilities}) where value = ${filter.capability}
    )`,
      ),
    )
    .orderBy(desc(tasks.updatedAt), desc(tasks.id))
    .limit(filter.limit ?? -1)
    .all();
}

export function getTask(id: string): Task | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}
