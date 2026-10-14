import { type TaskAction, TransitionError, transition } from "@idesk/shared/task-machine";
import type { TaskStatus } from "@idesk/shared/task-status";
import type { Task } from "./types.ts";

export const actionSamples = {
  release: { type: "release" },
  cancel_recruit: { type: "cancel_recruit" },
  reopen: { type: "reopen" },
  assign: { type: "assign", agentId: "x" },
  handoff: { type: "handoff", to: "x", note: "" },
  recruit: { type: "recruit", needed: 2 },
  resume: { type: "resume" },
  pause: { type: "pause" },
  complete: { type: "complete", result: "" },
  cancel: { type: "cancel" },
} satisfies Record<string, TaskAction>;
export type HumanAction = keyof typeof actionSamples;
const candidates: Record<TaskStatus, readonly HumanAction[]> = {
  open: ["release", "cancel_recruit", "reopen"],
  assigned: ["assign", "handoff"],
  recruiting: ["recruit"],
  in_progress: ["resume"],
  paused: ["pause"],
  done: ["complete"],
  cancelled: [],
};

export function previewAction(task: Task, action: TaskAction, now: Date): Task | TransitionError {
  const next = transition(
    {
      ...task,
      leaseExpiresAt: task.leaseExpiresAt === null ? null : new Date(task.leaseExpiresAt),
      completedAt: task.completedAt === null ? null : new Date(task.completedAt),
    },
    action,
    { kind: "human" },
    now,
  );
  if (next instanceof TransitionError) return next;
  return {
    ...next,
    leaseExpiresAt: next.leaseExpiresAt?.toISOString() ?? null,
    completedAt: next.completedAt?.toISOString() ?? null,
    updatedAt: now.toISOString(),
  };
}

export function dropAction(task: Task, target: TaskStatus, now: Date): HumanAction | null {
  for (const action of candidates[target]) {
    const next = previewAction(task, actionSamples[action], now);
    if (!(next instanceof TransitionError) && next.status === target) return action;
  }
  return null;
}
