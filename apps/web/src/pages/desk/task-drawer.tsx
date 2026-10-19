import { labels } from "@idesk/shared/labels";
import { TransitionError } from "@idesk/shared/task-machine";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Drawer } from "../../components/drawer.tsx";
import { Menu } from "../../components/menu.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { ActionDialog } from "./action-dialog.tsx";
import { actionSamples, type HumanAction, previewAction } from "./drop-action.ts";
import { EditTaskDialog } from "./edit-task-dialog.tsx";
import { TaskDetails } from "./task-details.tsx";
import { useTaskAction } from "./use-task-action.ts";
import "./task-drawer.css";

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { isAdmin } = useSession();
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
  const [editing, setEditing] = useState(false);
  const [parameter, setParameter] = useState<"assign" | "handoff" | "recruit" | "complete" | null>(
    null,
  );
  const { mutation, error, setError } = useTaskAction(() => setParameter(null));
  const actions =
    task && isAdmin
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
  const runAction = (action: HumanAction) => {
    if (!task) return;
    setError(null);
    if (
      action === "assign" ||
      action === "handoff" ||
      action === "recruit" ||
      action === "complete"
    )
      setParameter(action);
    else mutation.mutate({ task, action: actionSamples[action] });
  };
  const actionLabel = (action: HumanAction) =>
    task?.status === "assigned" && action === "release"
      ? t("desk.releaseToOpen")
      : task?.status === "assigned" && action === "assign"
        ? t("desk.reassign")
        : labels(lang).action[action];
  const firstAction = actions[0];
  return (
    <>
      <div className="task-drawer">
        <Drawer
          key={taskId}
          open
          onClose={onClose}
          title={task?.title ?? ""}
          footer={
            isAdmin &&
            task && (
              <>
                <Button onClick={() => setEditing(true)}>{t("common.edit")}</Button>
                {actions.length > 1 && (
                  <Menu
                    label={lang === "zh" ? "更多操作" : "More actions"}
                    trigger={lang === "zh" ? "更多" : "More"}
                    items={actions.slice(1).map((action) => ({
                      label: actionLabel(action),
                      onSelect: () => runAction(action),
                    }))}
                  />
                )}
                {firstAction && (
                  <Button
                    variant={firstAction === "cancel" ? "secondary" : "primary"}
                    disabled={mutation.isPending}
                    onClick={() => runAction(firstAction)}
                  >
                    {actionLabel(firstAction)}
                  </Button>
                )}
              </>
            )
          }
        >
          {(taskError || eventsError) && (
            <p role="alert" className="text-secondary text-status-failed">
              {(taskError ?? eventsError)?.message}
            </p>
          )}
          {task && (
            <TaskDetails task={task} events={events} agentName={agentName} onError={setError} />
          )}
          {!parameter && <Toast message={error} onClose={() => setError(null)} />}
        </Drawer>
      </div>
      <AnimatePresence>
        {isAdmin && editing && task && (
          <EditTaskDialog key="edit" task={task} onClose={() => setEditing(false)} />
        )}
        {isAdmin && parameter && task && (
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
