import { inArray } from "drizzle-orm";
import type { Db, Tx } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import type { Task } from "./store.ts";

export function firstBlocker(tx: Tx | Db, task: Task): Task | undefined {
  if (!task.blockedBy.length) return undefined;
  const dependencies = tx.select().from(tasks).where(inArray(tasks.id, task.blockedBy)).all();
  return task.blockedBy
    .map((id) => dependencies.find((item) => item.id === id))
    .find((item) => item && item.status !== "done" && item.status !== "cancelled");
}

export function validateDependencies(tx: Tx, ids: string[], selfId?: string): string[] {
  const blockedBy = [...new Set(ids)];
  if (selfId !== undefined && blockedBy.includes(selfId))
    throw new HttpError(400, "task.selfDependency");
  if (blockedBy.length) {
    const found = tx.select({ id: tasks.id }).from(tasks).where(inArray(tasks.id, blockedBy)).all();
    const missing = blockedBy.find((id) => !found.some((task) => task.id === id));
    if (missing !== undefined) throw new HttpError(400, "task.dependencyNotFound", { id: missing });
  }
  return blockedBy;
}
