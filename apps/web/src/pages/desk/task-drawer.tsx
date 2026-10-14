import { ACTION_LABEL, TransitionError } from "@idesk/shared/task-machine";
import { TASK_STATUS_LABEL } from "@idesk/shared/task-status";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/button.tsx";
import { Drawer } from "../../components/drawer.tsx";
import { Toast } from "../../components/toast.tsx";
import { request } from "../../lib/api.ts";
import { eventText } from "../../lib/event-text.ts";
import { relativeTime } from "../../lib/format.ts";
import { ActionDialog } from "./action-dialog.tsx";
import { actionSamples, type HumanAction, previewAction } from "./drop-action.ts";
import { StatusDot } from "./status-dot.tsx";
import type { Task, TaskEvent } from "./types.ts";
import { useAgents } from "./use-agents.ts";
import { useTaskAction } from "./use-task-action.ts";

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => request<Task>(`/tasks/${taskId}`),
  });
  const { data: events = [] } = useQuery({
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
        {task && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-secondary text-text-2">
              <StatusDot status={task.status} />
              {TASK_STATUS_LABEL[task.status]}
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
                  {ACTION_LABEL[action]}
                </Button>
              ))}
            </div>
            <div className="space-y-3 break-words text-body [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-2 [&_code]:rounded-tag [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-section [&_h2]:text-section [&_h3]:text-section [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-control [&_pre]:bg-surface-2 [&_pre]:p-3 [&_ul]:list-disc">
              <ReactMarkdown>{task.body}</ReactMarkdown>
              {task.result !== null && <ReactMarkdown>{task.result}</ReactMarkdown>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-4 text-secondary">
              <dt className="text-text-2">负责人</dt>
              <dd>{task.assigneeId === null ? "未指定" : agentName(task.assigneeId)}</dd>
              <dt className="text-text-2">发布者</dt>
              <dd>{agentName(task.publisherId)}</dd>
              <dt className="text-text-2">能力</dt>
              <dd className="text-text-2">{task.capabilities.join(" · ") || "—"}</dd>
            </dl>
            <section>
              <h3 className="mb-4 text-section">时间线</h3>
              <ol className="space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="space-y-1 border-l border-line pl-3">
                    <time className="text-label text-text-2 tabular-nums">
                      {relativeTime(new Date(event.ts))}
                    </time>
                    <p className="whitespace-pre-wrap break-words text-secondary">
                      {eventText(event, agentName)}
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
