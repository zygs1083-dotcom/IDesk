import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import type { z } from "zod";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { countBlockers } from "./count-blockers.ts";
import { taskClock } from "./task-clock.ts";

export type HealthFilter = "in_progress" | "silent" | "blocked" | "waiting";
export type HealthTasks = Record<HealthFilter, Set<string>>;
export type HealthQueryStatus = Record<"silent" | "waiting", "pending" | "error" | "success">;
export type PendingRequest = Pick<
  z.infer<typeof relayMessageSchema>,
  "kind" | "fromAgentId" | "taskId"
>;

export function boardHealth(
  scope: Task[],
  tasks: Task[],
  events: Map<string, TaskEvent[]>,
  pendingRequests: PendingRequest[],
  now: number,
): HealthTasks {
  const health: HealthTasks = {
    in_progress: new Set(),
    silent: new Set(),
    blocked: new Set(),
    waiting: new Set(),
  };
  const waiting = new Set(
    pendingRequests
      .filter(
        (message) =>
          message.kind === "request" &&
          message.fromAgentId !== "human" &&
          !message.fromAgentId.startsWith("p_"),
      )
      .map((message) => message.taskId),
  );
  for (const task of scope) {
    if (task.status === "in_progress") {
      health.in_progress.add(task.id);
      const taskEvents = events.get(task.id);
      const clock = taskEvents ? taskClock(taskEvents, now) : null;
      if (clock && clock.silentMinutes !== null) health.silent.add(task.id);
    }
    if (
      task.status !== "done" &&
      task.status !== "cancelled" &&
      countBlockers(task.blockedBy, tasks) > 0
    )
      health.blocked.add(task.id);
    if (waiting.has(task.id)) health.waiting.add(task.id);
  }
  return health;
}
