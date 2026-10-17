import type { Actor } from "@idesk/shared/task-machine";
import type { updateTaskSchema } from "@idesk/shared/task-schemas";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";
import { validateDependencies } from "./dependencies.ts";

export function updateTask(id: string, input: z.infer<typeof updateTaskSchema>, actor: Actor) {
  const { task, events } = db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!current) throw new HttpError(404, "task.notFound");
    if (actor.kind !== "human" && !(actor.kind === "agent" && actor.id === current.publisherId))
      throw new HttpError(403, "auth.humanOrPublisherOnly");
    const { dueAt, blockedBy, ...fields } = input;
    const task = tx
      .update(tasks)
      .set({
        ...fields,
        ...(dueAt === undefined ? {} : { dueAt: dueAt === null ? null : new Date(dueAt) }),
        ...(blockedBy === undefined ? {} : { blockedBy: validateDependencies(tx, blockedBy, id) }),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
      .get();
    const author = actor.kind === "agent" ? { agentId: actor.id } : {};
    const events = [
      recordEvent(tx, {
        ...author,
        taskId: id,
        type: "task.updated",
        payload: { fields: Object.keys(input) },
      }),
    ];
    if (blockedBy !== undefined)
      events.push(
        recordEvent(tx, {
          ...author,
          taskId: id,
          type: "task.dependencies",
          payload: { blockedBy: task.blockedBy },
        }),
      );
    return { task, events };
  });
  for (const event of events) publishEvent(event);
  return task;
}
