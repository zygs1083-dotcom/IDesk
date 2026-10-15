import { labels } from "@idesk/shared/labels";
import type { eventSchema } from "@idesk/shared/task-schemas";

import { useEffect, useState } from "react";
import type { z } from "zod";
import { useLang } from "../i18n/lang.tsx";
import { relativeTime } from "../i18n/relative-time.ts";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";
import { Avatar } from "./avatar.tsx";
import { PixelPanel } from "./pixel-panel.tsx";
import { statusText } from "./status-text.ts";
import type { Agent, Task } from "./use-office-data.ts";

type TaskEvent = z.infer<typeof eventSchema>;
export function AgentPanel({
  agent,
  tasks,
  onClose,
}: {
  agent: Agent;
  tasks: Task[];
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      void request<TaskEvent[]>(`/events?agentId=${encodeURIComponent(agent.id)}`)
        .then((data) => {
          if (!disposed) setEvents(data.slice(0, 5));
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
  const current = tasks.filter(
    (task) =>
      (task.assigneeId === agent.id || task.recruit?.joined.includes(agent.id)) &&
      ["in_progress", "paused", "assigned"].includes(task.status),
  );
  return (
    <PixelPanel title={t("panel.agent")} onClose={onClose}>
      <div className="agent-identity">
        <Avatar kind={agent.kind} />
        <div>
          <h3>{agent.name}</h3>
          <p>{statusText(agent, tasks, t)}</p>
        </div>
      </div>
      <dl>
        <dt>{t("panel.type")}</dt>
        <dd>{agent.kind}</dd>
        <dt>{t("panel.host")}</dt>
        <dd>{agent.host}</dd>
        <dt>{t("common.capabilities")}</dt>
        <dd>{agent.capabilities.join(" · ") || t("common.none")}</dd>
      </dl>
      <h3>{t("panel.currentTasks")}</h3>
      {current.length ? (
        current.map((task) => (
          <p key={task.id}>
            {task.title}
            <span className="task-status">{labels(lang).status[task.status]}</span>
          </p>
        ))
      ) : (
        <p>{t("panel.emptyTasks")}</p>
      )}
      <h3>{t("panel.recentEvents")}</h3>
      {events.map((event) => {
        const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(event.ts)) / 60_000));
        return (
          <p className="event-row" key={event.id}>
            <span>{event.type}</span>
            <time dateTime={event.ts}>{relativeTime(minutes, lang, t)}</time>
          </p>
        );
      })}
      {!events.length && <p>{t("panel.emptyEvents")}</p>}
      {error && <p role="alert">{error}</p>}
    </PixelPanel>
  );
}
