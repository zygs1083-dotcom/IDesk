import type { Actor, TransitionError } from "@idesk/shared/task-machine";
import type { publishTaskSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import { createTask, type Task } from "./store.ts";
import { actOnTask } from "./transition.ts";

export function publishTask(
  input: Parameters<typeof createTask>[0],
  actor: Actor,
  dispatch?: z.infer<typeof publishTaskSchema>["dispatch"],
): Task | TransitionError {
  const task = createTask(input, actor.kind === "agent" ? actor.id : "human");
  // 同步分派，让 auto-assign 的 microtask 看到任务已离开 open，避免抢先指派。
  return dispatch ? (actOnTask(task.id, dispatch, actor) as Task | TransitionError) : task;
}
