import type { PublicAgent } from "../../apps/api/src/core/agents/agents.ts";
import type { Task } from "../../apps/api/src/core/tasks/store.ts";

export function selectAgent(
  task: Pick<Task, "capabilities">,
  agents: Pick<PublicAgent, "id" | "status" | "capabilities" | "lastSeenAt">[],
  loads: ReadonlyMap<string, number>,
): string | undefined {
  return agents
    .filter(
      (agent) =>
        agent.status === "online" &&
        task.capabilities.every((capability) => agent.capabilities.includes(capability)),
    )
    .sort(
      (a, b) =>
        (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0) ||
        (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0),
    )[0]?.id;
}
