import { useLang } from "../../i18n/lang.tsx";
import type { Task } from "../../lib/types.ts";

export function TaskInformation({
  task,
  agentName,
}: {
  task: Task;
  agentName: (id: string | null) => string;
}) {
  const { lang, t } = useLang();
  const overdue =
    task.dueAt &&
    new Date(task.dueAt).getTime() < Date.now() &&
    task.status !== "done" &&
    task.status !== "cancelled";
  return (
    <section className="space-y-2">
      <h3 className="text-section">{t("desk.basicInfo")}</h3>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-secondary">
        <dt className="text-text-2">{t("desk.assignee")}</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere]">
          {task.assigneeId === null ? t("desk.noAssignee") : agentName(task.assigneeId)}
        </dd>
        <dt className="text-text-2">{t("desk.publisher")}</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere]">{agentName(task.publisherId)}</dd>
        <dt className="text-text-2">{t("common.capabilities")}</dt>
        <dd className="min-w-0 text-text-2 [overflow-wrap:anywhere]">
          {task.capabilities.join(" · ") || "—"}
        </dd>
        {task.dueAt && (
          <>
            <dt className="text-text-2">{t("desk.dueAt")}</dt>
            <dd className={overdue ? "text-status-paused" : "text-text-2"}>
              {new Date(task.dueAt).toLocaleString(lang)}
              {overdue && ` · ${t("desk.overdue")}`}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
