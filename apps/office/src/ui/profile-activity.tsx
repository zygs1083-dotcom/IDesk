import { labels } from "@idesk/shared/labels";
import type { eventSchema } from "@idesk/shared/task-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";
import { isCurrentTask } from "./profile-current-task.ts";
import { ProfileEvent } from "./profile-event.tsx";
import type { Agent, Task } from "./use-office-data.ts";

type TaskEvent = z.infer<typeof eventSchema>;
export function ProfileActivity({
  agent,
  agentName,
  tasks,
}: {
  agent: Agent;
  agentName: (id: string | null) => string;
  tasks: Task[];
}) {
  const { lang, t } = useLang();
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      void request<TaskEvent[]>(`/events?agentId=${encodeURIComponent(agent.id)}`)
        .then((data) => {
          if (!disposed) setEvents(data.slice(0, 10));
        })
        .catch((reason: Error) => {
          if (!disposed) setError(reason.message);
        });
    };
    refresh();
    const unsubscribe = onRealtimeEvent((event) => {
      if (event.agentId === agent.id) refresh();
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [agent.id]);
  const current = tasks.filter((task) => isCurrentTask(task, agent.id));
  return (
    <>
      <h3>{t("panel.currentTasks")}</h3>
      {current.length ? (
        current.map((task) => (
          <a
            className="profile-task"
            key={task.id}
            href={`/desk?task=${encodeURIComponent(task.id)}`}
          >
            <span className="profile-task-title" title={task.title}>
              {task.title}
            </span>
            <span className="task-status">{labels(lang).status[task.status]}</span>
          </a>
        ))
      ) : (
        <p>{t("panel.emptyTasks")}</p>
      )}
      <h3>{t("panel.recentEvents")}</h3>
      <ol className="profile-events" aria-label={t("panel.recentEvents")}>
        {events.map((event) => (
          <ProfileEvent
            key={event.id}
            event={event}
            task={tasks.find((task) => task.id === event.taskId)}
            agentName={agentName}
          />
        ))}
      </ol>
      {!events.length && <p>{t("panel.emptyEvents")}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
