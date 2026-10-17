import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { request } from "../../lib/api.ts";
import type { TaskEvent } from "../../lib/types.ts";

export function activityQueryOptions(type: string, agentId: string) {
  return infiniteQueryOptions({
    queryKey: ["events", { type, agentId }],
    initialPageParam: "",
    gcTime: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "100" });
      if (pageParam) params.set("before", pageParam);
      if (type !== "all") params.set("typePrefix", type);
      if (agentId) params.set("agentId", agentId);
      return request<TaskEvent[]>(`/events?${params}`);
    },
    getNextPageParam: (page) => (page.length === 100 ? page.at(-1)?.id : undefined),
  });
}

export function useActivity(type: string, agentId: string) {
  const query = useInfiniteQuery(activityQueryOptions(type, agentId));
  const events = [...new Map(query.data?.pages.flat().map((event) => [event.id, event])).values()];
  return { ...query, events };
}
