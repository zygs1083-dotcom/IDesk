import type { Actor } from "@idesk/shared/task-machine";
import { eq, inArray } from "drizzle-orm";
import { type Db, db, type Tx } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";
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

export function updateDependencies(id: string, ids: string[], actor: Actor) {
  const { task, event } = db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!current) throw new HttpError(404, "task.notFound");
    if (actor.kind !== "human" && !(actor.kind === "agent" && actor.id === current.publisherId))
      throw new HttpError(403, "auth.humanOrPublisherOnly");
    const blockedBy = validateDependencies(tx, ids, id);
    const task = tx
      .update(tasks)
      .set({ blockedBy, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning()
      .get();
    const event = recordEvent(tx, {
      taskId: id,
      ...(actor.kind === "agent" ? { agentId: actor.id } : {}),
      type: "task.dependencies",
      payload: { blockedBy },
    });
    return { task, event };
  });
  publishEvent(event);
  return task;
}
