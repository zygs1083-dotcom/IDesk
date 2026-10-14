import type { Task } from "../../lib/types.ts";

export function countBlockers(blockedBy: string[], tasks: Pick<Task, "id" | "status">[]): number {
  return blockedBy.filter((id) =>
    tasks.some((task) => task.id === id && task.status !== "done" && task.status !== "cancelled"),
  ).length;
}
