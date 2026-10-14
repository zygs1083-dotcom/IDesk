import { useQuery } from "@tanstack/react-query";
import { request } from "./api.ts";
import type { Agent } from "./types.ts";

export function useAgents() {
  const {
    data: agents = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: () => request<Agent[]>("/agents"),
  });
  const names = new Map(agents.map((agent) => [agent.id, `${agent.name}@${agent.host}`]));
  function agentName(id: string | null): string {
    if (id === null || id === "human") return "人";
    return names.get(id) ?? id.slice(0, 8);
  }
  return { agents, agentName, error, isPending };
}
