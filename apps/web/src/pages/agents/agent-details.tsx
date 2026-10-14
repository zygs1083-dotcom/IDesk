import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/api.ts";
import { eventText } from "../../lib/event-text.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";

export function AgentDetails({ agentId }: { agentId: string }) {
  const { agentName } = useAgents();
  const tasks = useQuery({
    queryKey: ["tasks", "assignee", agentId],
    queryFn: () => request<Task[]>(`/tasks?assignee=${encodeURIComponent(agentId)}`),
    enabled: Boolean(agentId),
  });
  const events = useQuery({
    queryKey: ["events", "agent", agentId],
    queryFn: () => request<TaskEvent[]>(`/events?agentId=${encodeURIComponent(agentId)}`),
    enabled: Boolean(agentId),
  });
  const current = tasks.data?.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const taskTitles = new Map(tasks.data?.map((task) => [task.id, task.title]));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-2">
        <h2 className="text-label text-text-2">当前任务</h2>
        {tasks.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {tasks.error.message}
          </p>
        )}
        {current?.map((task) => (
          <p key={task.id} className="truncate text-secondary">
            {task.title}
          </p>
        ))}
        {current?.length === 0 && <p className="text-secondary text-text-2">没有当前任务</p>}
      </section>
      <section className="space-y-2">
        <h2 className="text-label text-text-2">最近事件</h2>
        {events.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {events.error.message}
          </p>
        )}
        {events.data?.slice(0, 5).map((event) => (
          <div key={event.id} className="flex gap-3 text-secondary">
            <span className="shrink-0 tabular-nums text-text-2">
              {relativeTime(new Date(event.ts))}
            </span>
            <span className="truncate">
              {eventText(event, agentName)}
              {event.taskId && ` ${taskTitles.get(event.taskId) ?? event.taskId.slice(0, 8)}`}
            </span>
          </div>
        ))}
        {events.data?.length === 0 && <p className="text-secondary text-text-2">没有最近事件</p>}
      </section>
    </div>
  );
}
