import type { Agent, Task } from "../../lib/types.ts";

export function groupByHost(
  tasks: Task[],
  agents: Agent[],
): { host: string | null; tasks: Task[] }[] {
  const hosts = new Map(agents.map((agent) => [agent.id, agent.host]));
  const groups = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const owner = task.assigneeId ?? task.publisherId;
    const host = owner === "human" ? null : (hosts.get(owner) ?? null);
    const group = groups.get(host);
    if (group) group.push(task);
    else groups.set(host, [task]);
  }
  return Array.from(groups, ([host, tasks]) => ({ host, tasks })).sort((a, b) => {
    if (a.host === null) return 1;
    if (b.host === null) return -1;
    return a.host.localeCompare(b.host);
  });
}
