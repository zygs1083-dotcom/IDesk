import { queryOptions, useQuery } from "@tanstack/react-query";
import { useLang } from "../i18n/lang.tsx";
import { request } from "./api.ts";
import type { Agent } from "./types.ts";

export const agentsQueryOptions = queryOptions({
  queryKey: ["agents"],
  refetchInterval: 30_000,
  queryFn: () => request<Agent[]>("/agents"),
});

export function useAgents() {
  const { t } = useLang();
  const { data: agents = [], error, isPending } = useQuery(agentsQueryOptions);
  const names = new Map(agents.map((agent) => [agent.id, `${agent.name}@${agent.host}`]));
  function agentName(id: string | null): string {
    if (id === null || id === "human") return t("common.human");
    return names.get(id) ?? t("common.deletedAgent");
  }
  return { agents, agentName, error, isPending };
}
