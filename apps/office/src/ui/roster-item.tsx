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
  const { t } = useLang();
  const status = statusText(agent, tasks, t);
  const description = t("roster.member", { agent: agent.name, status });
  return (
    <button
      type="button"
      className={`roster-item ${agent.status === "offline" ? "offline" : ""}`}
      onClick={() => onSelect(agent.id)}
      aria-label={description}
      title={description}
    >
      <Avatar kind={agent.kind} />
      <span className="roster-copy">
        <strong>{agent.name}</strong>
        <span>{status}</span>
      </span>
    </button>
  );
}

import { useLang } from "../i18n/lang.tsx";
