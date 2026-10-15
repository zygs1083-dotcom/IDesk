import { labels } from "@idesk/shared/labels";
import { TransitionError } from "@idesk/shared/task-machine";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Drawer } from "../../components/drawer.tsx";
import { Markdown } from "../../components/markdown.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { eventText } from "../../lib/event-text.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { ActionDialog } from "./action-dialog.tsx";
import { actionSamples, type HumanAction, previewAction } from "./drop-action.ts";
import { StatusDot } from "./status-dot.tsx";
import { TaskDependencies } from "./task-dependencies.tsx";
import { useTaskAction } from "./use-task-action.ts";

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { lang, t } = useLang();
  const { data: task, error: taskError } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => request<Task>(`/tasks/${taskId}`),
  });
  const { data: events = [], error: eventsError } = useQuery({
    queryKey: ["task", taskId, "events"],
    queryFn: () => request<TaskEvent[]>(`/tasks/${taskId}/events`),
  });
  const { agents, agentName } = useAgents();
  const [parameter, setParameter] = useState<"assign" | "handoff" | "recruit" | null>(null);
  const { mutation, error, setError } = useTaskAction(() => setParameter(null));
  const actions = task
    ? (
        [
          "complete",
          "pause",
          "resume",
          "handoff",
          "assign",
          "recruit",
          "release",
          "cancel_recruit",
          "reopen",
          "cancel",
        ] satisfies HumanAction[]
      ).filter(
        (action) =>
          !(previewAction(task, actionSamples[action], new Date()) instanceof TransitionError),
      )
    : [];
  return (
    <>
      <Drawer open onClose={onClose} title={task?.title ?? ""}>
        {(taskError || eventsError) && (
          <p role="alert" className="text-secondary text-status-failed">
            {(taskError ?? eventsError)?.message}
          </p>
        )}
        {task && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-secondary text-text-2">
              <StatusDot status={task.status} />
              {labels(lang).status[task.status]}
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <Button
                  key={action}
                  variant={index === 0 && action !== "cancel" ? "primary" : "secondary"}
                  disabled={mutation.isPending}
                  onClick={() => {
                    setError(null);
                    if (action === "assign" || action === "handoff" || action === "recruit")
                      setParameter(action);
                    else mutation.mutate({ task, action: actionSamples[action] });
                  }}
                >
                  {labels(lang).action[action]}
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              <Markdown>{task.body}</Markdown>
              {task.result !== null && <Markdown>{task.result}</Markdown>}
            </div>
            <dl className="space-y-3 border-y border-line py-4 text-secondary">
              <div className="flex gap-2">
                <dt className="w-18 shrink-0 text-text-2">{t("desk.assignee")}</dt>
                <dd className="min-w-0 flex-1 break-words">
                  {task.assigneeId === null ? t("desk.noAssignee") : agentName(task.assigneeId)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-18 shrink-0 text-text-2">{t("desk.publisher")}</dt>
                <dd className="min-w-0 flex-1 break-words">{agentName(task.publisherId)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-18 shrink-0 text-text-2">{t("common.capabilities")}</dt>
                <dd className="min-w-0 flex-1 break-words text-text-2">
                  {task.capabilities.join(" · ") || "—"}
                </dd>
              </div>
            </dl>
            <TaskDependencies task={task} onError={setError} />
            <section>
              <h3 className="mb-4 text-section">{t("desk.timeline")}</h3>
              <ol className="space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="space-y-1 border-l border-line pl-3">
                    <time className="text-label text-text-2 tabular-nums">
                      {relativeTime(new Date(event.ts), lang)}
                    </time>
                    <p className="whitespace-pre-wrap break-words text-secondary">
                      {eventText(event, agentName, lang)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
        {!parameter && <Toast message={error} onClose={() => setError(null)} />}
      </Drawer>
      <AnimatePresence>
        {parameter && task && (
          <ActionDialog
            key={parameter}
            action={parameter}
            agents={agents}
            pending={mutation.isPending}
            error={error}
            onDismissError={() => setError(null)}
            onClose={() => {
              setParameter(null);
              setError(null);
            }}
            onSubmit={(action) => mutation.mutate({ task, action })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
