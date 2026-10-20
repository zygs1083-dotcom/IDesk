import { queryOptions, useQuery } from "@tanstack/react-query";
import { useLang } from "../i18n/lang.tsx";
import { request } from "./api.ts";
import type { Agent } from "./types.ts";
import { usePeople } from "./use-people.ts";

export const agentsQueryOptions = queryOptions({
  queryKey: ["agents"],
  refetchInterval: 30_000,
  queryFn: () => request<Agent[]>("/agents"),
});

export function useAgents() {
  const { t } = useLang();
  const { data: agents = [], error, isPending } = useQuery(agentsQueryOptions);
  const { data: people = [] } = usePeople();
  const names = new Map(agents.map((agent) => [agent.id, `${agent.name}@${agent.host}`]));
  const personNames = new Map(people.map((person) => [person.id, person.name]));
  function agentName(id: string | null): string {
    if (id === null || id === "human") return t("common.human");
    if (id.startsWith("p_")) return personNames.get(id) ?? t("people.deleted");
    return names.get(id) ?? t("common.deletedAgent");
  }
  return { agents, people, agentName, error, isPending };
}
