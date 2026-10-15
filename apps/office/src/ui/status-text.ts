import type { Agent, Task } from "./use-office-data.ts";

export function statusText(agent: Agent, tasks: Task[], t: Translate): string {
  if (agent.status === "offline") return t("status.offline");
  const owned = tasks.filter(
    (task) => task.assigneeId === agent.id || task.recruit?.joined.includes(agent.id),
  );
  const active = owned.find((task) => task.status === "in_progress");
  const title = (text: string) =>
    [...text].length > 12 ? `${[...text].slice(0, 12).join("")}…` : text;
  if (active) return t("status.active", { title: title(active.title) });
  if (owned.some((task) => task.status === "paused")) return t("status.paused");
  const assigned = owned.find((task) => task.status === "assigned");
  if (assigned) return t("status.assigned", { title: title(assigned.title) });
  return t("status.idle");
}

import type { Translate } from "../i18n/translate.ts";
