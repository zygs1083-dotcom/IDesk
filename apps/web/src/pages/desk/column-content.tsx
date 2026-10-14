import type { Agent, Task } from "../../lib/types.ts";
import { DraggableCard } from "./draggable-card.tsx";
import { groupByHost } from "./group-by-host.ts";

export function ColumnContent({
  tasks,
  blockers,
  agents,
  group,
  seen,
  agentName,
  handoffName,
  onOpen,
  shake,
}: {
  tasks: Task[];
  blockers: Map<string, number>;
  agents: Agent[];
  group: "flat" | "host";
  seen: Set<string>;
  agentName: (id: string | null) => string;
  handoffName: (task: Task) => string | undefined;
  onOpen: (id: string) => void;
  shake: string | null;
}) {
  function card(task: Task) {
    const handoff = handoffName(task);
    return (
      <DraggableCard
        key={task.id}
        task={task}
        blockers={blockers.get(task.id) as number}
        entering={!seen.has(task.id)}
        name={agentName(task.assigneeId ?? task.publisherId)}
        {...(handoff === undefined ? {} : { handoff })}
        onOpen={() => onOpen(task.id)}
        shake={shake === task.id}
      />
    );
  }
  if (group === "flat") return tasks.map(card);
  return groupByHost(tasks, agents).map(({ host, tasks }) => (
    <div
      key={host === null ? "unassigned" : `host:${host}`}
      className="flex flex-col gap-2 [&+&]:mt-2"
    >
      <h3 className="text-secondary text-text-2">{host === null ? "未指派" : host}</h3>
      {tasks.map(card)}
    </div>
  ));
}
