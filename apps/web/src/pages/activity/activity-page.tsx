import { useQuery } from "@tanstack/react-query";
import { Bot, ListTodo, Send } from "lucide-react";
import { useState } from "react";
import { Segmented } from "../../components/segmented.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { eventText } from "../../lib/event-text.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { groupEvents } from "./group-events.ts";

export function ActivityPage() {
  const [type, setType] = useState("all");
  const [agentId, setAgentId] = useState("");
  const {
    data: events = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["events", { agentId }],
    queryFn: () =>
      request<TaskEvent[]>(`/events${agentId ? `?agentId=${encodeURIComponent(agentId)}` : ""}`),
  });
  const { agents, agentName } = useAgents();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => request<Task[]>("/tasks"),
  });
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  const groups = groupEvents(
    events.filter((event) => type === "all" || event.type.startsWith(`${type}.`)),
  );
  return (
    <div className="space-y-6">
      <PageHeader title="活动" />
      <div className="flex flex-wrap items-center gap-3 whitespace-nowrap text-secondary">
        <Segmented
          label="类型"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "全部" },
            { value: "task", label: "任务" },
            { value: "relay", label: "传递区" },
            { value: "agent", label: "智能体" },
          ]}
        />
        <label className="flex items-center gap-2 text-text-2">
          智能体
          <select
            className="rounded-control border border-line bg-surface px-3 py-2 text-text"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
          >
            <option value="">全部</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agentName(agent.id)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && groups.length === 0 && (
        <p className="py-16 text-center text-secondary text-text-2">还没有活动</p>
      )}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.day} className="space-y-2">
            <h2 className="text-label text-text-2">{group.label}</h2>
            <ol className="divide-y divide-line">
              {group.events.map((event) => {
                const Icon = event.type.startsWith("relay.")
                  ? Send
                  : event.type.startsWith("agent.")
                    ? Bot
                    : ListTodo;
                return (
                  <li key={event.id} className="flex items-center gap-4 py-3">
                    <time
                      dateTime={event.ts}
                      className="w-12 shrink-0 text-secondary tabular-nums text-text-2"
                    >
                      {new Date(event.ts).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </time>
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0 text-text-2"
                    />
                    <p className="truncate text-body">
                      {eventText(event, agentName)}
                      {event.taskId &&
                        ` ${taskTitles.get(event.taskId) ?? event.taskId.slice(0, 8)}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
