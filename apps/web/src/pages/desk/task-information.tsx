import { useLang } from "../../i18n/lang.tsx";
import type { Task } from "../../lib/types.ts";
import { CopyTaskId } from "./copy-task-id.tsx";

export function TaskInformation({
  task,
  agentName,
  onError,
}: {
  task: Task;
  agentName: (id: string | null) => string;
  onError?: (message: string) => void;
}) {
  const { lang, t } = useLang();
  const tags = task.tags.filter((tag) => tag.trim());
  const overdue =
    task.dueAt &&
    new Date(task.dueAt).getTime() < Date.now() &&
    task.status !== "done" &&
    task.status !== "cancelled";
  return (
    <section className="space-y-2">
      <h3 className="text-section">{t("desk.basicInfo")}</h3>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-secondary">
        <dt className="self-center text-text-2">{t("desk.taskId")}</dt>
        <dd className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 whitespace-break-spaces [overflow-wrap:anywhere]">
            {task.id}
          </span>
          <CopyTaskId key={`${task.id}:${lang}`} taskId={task.id} onError={onError} />
        </dd>
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
        {tags.length > 0 && (
          <>
            <dt className="text-text-2">{t("common.tags")}</dt>
            <dd className="flex min-w-0 flex-wrap items-start gap-1 text-text-2">
              {tags.map((tag, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Read-only tags can repeat and have no item state.
                  key={`${index}:${tag}`}
                  className="max-w-full whitespace-break-spaces rounded-control border border-line bg-surface-2 px-1.5 py-0.5 [overflow-wrap:anywhere]"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </>
        )}
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
