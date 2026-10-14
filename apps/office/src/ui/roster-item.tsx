import { Avatar } from "./avatar.tsx";
import { statusText } from "./status-text.ts";
import type { Agent, Task } from "./use-office-data.ts";

export function RosterItem({
  agent,
  tasks,
  onSelect,
}: {
  agent: Agent;
  tasks: Task[];
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`roster-item ${agent.status === "offline" ? "offline" : ""}`}
      onClick={() => onSelect(agent.id)}
      title={`${agent.name} · ${statusText(agent, tasks)}`}
    >
      <Avatar kind={agent.kind} />
      <span className="roster-copy">
        <strong>{agent.name}</strong>
        <span>{statusText(agent, tasks)}</span>
      </span>
    </button>
  );
}
