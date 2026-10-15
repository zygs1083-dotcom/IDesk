import { labels } from "@idesk/shared/labels";
import type { eventSchema } from "@idesk/shared/task-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { useLang } from "../i18n/lang.tsx";
import { relativeTime } from "../i18n/relative-time.ts";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";
import { eventText } from "./event-text.ts";
import { isCurrentTask } from "./profile-current-task.ts";
import type { Agent, Task } from "./use-office-data.ts";

type TaskEvent = z.infer<typeof eventSchema>;
export function ProfileActivity({
  agent,
  agents,
  tasks,
}: {
  agent: Agent;
  agents: Agent[];
  tasks: Task[];
}) {
  const { lang, t } = useLang();
  const agentName = (id: string | null) =>
    id === null || id === "human"
      ? t("common.human")
      : (agents.find((item) => item.id === id)?.name ?? t("common.deletedAgent"));
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
            {task.title}
            <span className="task-status">{labels(lang).status[task.status]}</span>
          </a>
        ))
      ) : (
        <p>{t("panel.emptyTasks")}</p>
      )}
      <h3>{t("panel.recentEvents")}</h3>
      {events.map((event) => {
        const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(event.ts)) / 60_000));
        return (
          <p className="event-row" key={event.id}>
            <span>
              {eventText(event, t, agentName)}
              {event.taskId &&
                ` ${tasks.find((task) => task.id === event.taskId)?.title ?? event.taskId.slice(0, 8)}`}
            </span>
            <time dateTime={event.ts}>{relativeTime(minutes, lang, t)}</time>
          </p>
        );
      })}
      {!events.length && <p>{t("panel.emptyEvents")}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
