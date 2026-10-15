import type { Task } from "./use-office-data.ts";

export function isCurrentTask(
  task: Pick<Task, "assigneeId" | "recruit" | "status">,
  agentId: string,
): boolean {
  return (
    (task.assigneeId === agentId || task.recruit?.joined.includes(agentId) === true) &&
    ["in_progress", "paused", "assigned"].includes(task.status)
  );
}
