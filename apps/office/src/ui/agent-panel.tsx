import type { eventSchema } from "@idesk/shared/task-schemas";
import { TASK_STATUS_LABEL } from "@idesk/shared/task-status";
import { useEffect, useState } from "react";
import type { z } from "zod";
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
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
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
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      disposed = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [agent.id]);
  const current = tasks.filter(
    (task) =>
      (task.assigneeId === agent.id || task.recruit?.joined.includes(agent.id)) &&
      ["in_progress", "paused", "assigned"].includes(task.status),
  );
  return (
    <PixelPanel title="智能体档案" onClose={onClose}>
      <div className="agent-identity">
        <Avatar kind={agent.kind} />
        <div>
          <h3>{agent.name}</h3>
          <p>{statusText(agent, tasks)}</p>
        </div>
      </div>
      <dl>
        <dt>类型</dt>
        <dd>{agent.kind}</dd>
        <dt>主机</dt>
        <dd>{agent.host}</dd>
        <dt>能力</dt>
        <dd>{agent.capabilities.join(" · ") || "暂无"}</dd>
      </dl>
      <h3>当前任务</h3>
      {current.length ? (
        current.map((task) => (
          <p key={task.id}>
            {task.title}
            <span className="task-status">{TASK_STATUS_LABEL[task.status]}</span>
          </p>
        ))
      ) : (
        <p>暂无当前任务</p>
      )}
      <h3>最近事件</h3>
      {events.map((event) => {
        const minutes = Math.max(0, Math.floor((now - Date.parse(event.ts)) / 60_000));
        return (
          <p className="event-row" key={event.id}>
            <span>{event.type}</span>
            <time dateTime={event.ts}>
              {minutes < 1
                ? "刚刚"
                : minutes < 60
                  ? `${minutes} 分钟前`
                  : `${Math.floor(minutes / 60)} 小时前`}
            </time>
          </p>
        );
      })}
      {!events.length && <p>暂无事件</p>}
      {error && <p role="alert">{error}</p>}
    </PixelPanel>
  );
}
