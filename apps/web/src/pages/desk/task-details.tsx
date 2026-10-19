import { labels } from "@idesk/shared/labels";
import { Markdown } from "../../components/markdown.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { StatusDot } from "./status-dot.tsx";
import { TaskDependencies } from "./task-dependencies.tsx";
import { TaskExcerpt } from "./task-excerpt.tsx";
import { TaskInformation } from "./task-information.tsx";
import { TaskTimeline } from "./task-timeline.tsx";

export function TaskDetails({
  task,
  events,
  agentName,
  onError,
}: {
  task: Task;
  events: TaskEvent[];
  agentName: (id: string | null) => string;
  onError: (message: string) => void;
}) {
  const { lang, t } = useLang();
  return (
    <div className="task-details min-w-0 space-y-4">
      <div className="flex items-center gap-2 text-secondary text-text-2">
        <StatusDot status={task.status} />
        {labels(lang).status[task.status]}
      </div>
      <section className="space-y-2">
        <h3 className="text-section">{t("desk.requirements")}</h3>
        <TaskExcerpt lines={6}>
          <Markdown>{task.body}</Markdown>
        </TaskExcerpt>
      </section>
      <section className="space-y-2 border-t border-line pt-4">
        <h3 className="text-section">{t("desk.executionResult")}</h3>
        {task.result?.trim() ? (
          <TaskExcerpt lines={6}>
            <Markdown>{task.result}</Markdown>
          </TaskExcerpt>
        ) : (
          <p className="text-secondary text-text-2">
            {t(task.status === "done" ? "desk.noResultProvided" : "desk.noResultYet")}
          </p>
        )}
      </section>
      <div className="border-t border-line pt-4">
        <TaskInformation task={task} agentName={agentName} />
      </div>
      <TaskDependencies task={task} onError={onError} />
      <TaskTimeline events={events} agentName={agentName} />
    </div>
  );
}
