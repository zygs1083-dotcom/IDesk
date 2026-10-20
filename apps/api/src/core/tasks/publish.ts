import type { AssistantChannel } from "@idesk/shared/assistant-schemas";
import type { Actor, TransitionError } from "@idesk/shared/task-machine";
import type { publishTaskSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import { createTask, type Task } from "./store.ts";
import { actOnTask } from "./transition.ts";

export function publishTask(
  input: Parameters<typeof createTask>[0],
  actor: Actor,
  dispatch?: z.infer<typeof publishTaskSchema>["dispatch"],
  personSource?: { personId: string; via: AssistantChannel },
): Task | TransitionError {
  const task = createTask(
    input,
    personSource?.personId ??
      (actor.kind === "agent" || actor.kind === "person" ? actor.id : "human"),
    personSource,
  );
  // 同步分派，让 auto-assign 的 microtask 看到任务已离开 open，避免抢先指派。
  // 人员确认草稿时的分派属于发布流程，不授予人员独立分派权限。
  const dispatchActor = actor.kind === "person" ? ({ kind: "human" } as const) : actor;
  return dispatch ? (actOnTask(task.id, dispatch, dispatchActor) as Task | TransitionError) : task;
}
