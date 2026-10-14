import {
  type Actor,
  type TaskAction,
  TransitionError,
  transition,
} from "@idesk/shared/task-machine";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { type Event, publishEvent, recordEvent } from "../events/bus.ts";
import { writeRelay } from "../relay/relay.ts";
import type { Task } from "./store.ts";

function applyAction(
  id: string,
  action: TaskAction,
  actor: Actor,
  eventOverride?: { type: string; payload: Record<string, unknown> },
): Task | TransitionError | undefined {
  const now = new Date();
  const recorded: Event[] = [];
  const result = db.transaction((tx) => {
    const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) return undefined;
    if (
      task.status === "open" &&
      ["claim", "assign", "recruit"].includes(action.type) &&
      task.blockedBy.length
    ) {
      const dependencies = tx.select().from(tasks).where(inArray(tasks.id, task.blockedBy)).all();
      const blocked = task.blockedBy
        .map((id) => dependencies.find((item) => item.id === id))
        .find((item) => item && item.status !== "done" && item.status !== "cancelled");
      if (blocked)
        return new TransitionError(task.status, action.type, `被「${blocked.title}」阻塞`);
    }
    const next = transition(task, action, actor, now);
    if (next instanceof TransitionError) return next;
    const updated = tx
      .update(tasks)
      .set({ ...next, updatedAt: now })
      .where(eq(tasks.id, id))
      .returning()
      .get();
    recorded.push(
      recordEvent(tx, {
        taskId: id,
        ...(actor.kind === "agent" ? { agentId: actor.id } : {}),
        type: eventOverride?.type ?? `task.${action.type}`,
        payload: eventOverride?.payload ?? {
          from: task.status,
          to: next.status,
          ...(action.type === "handoff"
            ? { handoffFrom: task.assigneeId, handoffTo: action.to }
            : {}),
        },
      }),
    );
    if (action.type === "handoff") {
      const { event } = writeRelay(
        tx,
        {
          to: action.to === null ? { kind: "broadcast" } : { kind: "agent", id: action.to },
          kind: "deliverable",
          taskId: id,
          subject: task.title,
          body: action.note,
        },
        actor.kind === "agent" ? actor.id : "human",
      );
      recorded.push(event);
    }
    return updated;
  });
  for (const event of recorded) publishEvent(event);
  return result;
}

export function actOnTask(
  id: string,
  action: TaskAction,
  actor: Actor,
): Task | TransitionError | undefined {
  return applyAction(id, action, actor);
}

export function reportProgress(
  id: string,
  actor: Actor,
  message: string,
): Task | TransitionError | undefined {
  return applyAction(id, { type: "heartbeat" }, actor, {
    type: "task.reported",
    payload: { message },
  });
}
