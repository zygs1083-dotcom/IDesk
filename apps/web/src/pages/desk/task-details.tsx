import { labels } from "@idesk/shared/labels";
import { Markdown } from "../../components/markdown.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { formatDuration } from "../../lib/format.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { CopyTaskLink } from "./copy-task-link.tsx";
import { CopyTaskMarkdown } from "./copy-task-markdown.tsx";
import { StatusDot } from "./status-dot.tsx";
import { completedDuration } from "./task-clock.ts";
import { TaskDependencies } from "./task-dependencies.tsx";
import { TaskExcerpt } from "./task-excerpt.tsx";
import { TaskInformation } from "./task-information.tsx";
import { TaskPrBadges } from "./task-pr-badges.tsx";
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
  const total = completedDuration(task, events);
  return (
    <div className="task-details min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-secondary text-text-2">
        <StatusDot status={task.status} />
        {labels(lang).status[task.status]}
        {total !== null && (
          <span className="text-label tabular-nums">
            {t("desk.totalDuration", { duration: formatDuration(total, lang) })}
          </span>
        )}
        <div key={`${task.id}:${lang}`} className="ml-auto flex max-w-full items-center gap-2">
          <CopyTaskLink task={task} onError={onError} />
          <CopyTaskMarkdown task={task} onError={onError} />
        </div>
      </div>
      <section className="space-y-2">
        <h3 className="text-section">{t("desk.requirements")}</h3>
        <TaskExcerpt lines={6}>
          <Markdown key={task.id}>{task.body}</Markdown>
        </TaskExcerpt>
      </section>
      <section className="space-y-2 border-t border-line pt-4">
        <h3 className="text-section">{t("desk.executionResult")}</h3>
        <TaskPrBadges result={task.result} events={events} />
        {task.result?.trim() ? (
          <TaskExcerpt lines={6}>
            <Markdown key={task.id}>{task.result}</Markdown>
          </TaskExcerpt>
        ) : (
          <p className="text-secondary text-text-2">
            {t(task.status === "done" ? "desk.noResultProvided" : "desk.noResultYet")}
          </p>
        )}
      </section>
      <div className="border-t border-line pt-4">
        <TaskInformation task={task} agentName={agentName} onError={onError} />
      </div>
      <TaskDependencies task={task} onError={onError} />
      <TaskTimeline key={task.id} events={events} agentName={agentName} />
    </div>
  );
}
