import type { Agent, Task } from "./use-office-data.ts";

export function statusText(agent: Agent, tasks: Task[]): string {
  if (agent.status === "offline") return "离线";
  const owned = tasks.filter(
    (task) => task.assigneeId === agent.id || task.recruit?.joined.includes(agent.id),
  );
  const active = owned.find((task) => task.status === "in_progress");
  const title = (text: string) =>
    [...text].length > 12 ? `${[...text].slice(0, 12).join("")}…` : text;
  if (active) return `在做：${title(active.title)}`;
  if (owned.some((task) => task.status === "paused")) return "休息中";
  const assigned = owned.find((task) => task.status === "assigned");
  if (assigned) return `待接受：${title(assigned.title)}`;
  return "空闲";
}
