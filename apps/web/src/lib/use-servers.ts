import {
  type publicServerSchema,
  type SERVER_RANGES,
  SERVER_SAMPLE_SECONDS,
  type serverMetricsSchema,
} from "@idesk/shared/server-schemas";
import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "./api.ts";

export type Server = z.infer<typeof publicServerSchema>;
export type ServerMetrics = z.infer<typeof serverMetricsSchema>;
export type ServerRange = (typeof SERVER_RANGES)[number];

export const serversQueryOptions = queryOptions({
  queryKey: ["servers"],
  queryFn: () => request<Server[]>("/servers"),
  refetchInterval: SERVER_SAMPLE_SECONDS * 1000,
});

export function useServers() {
  return useQuery(serversQueryOptions);
}

function metricsQueryOptions(serverId: string, range: ServerRange) {
  return queryOptions({
    queryKey: ["servers", serverId, "metrics", range],
    queryFn: () => request<ServerMetrics>(`/servers/${serverId}/metrics?range=${range}`),
    enabled: Boolean(serverId),
    refetchInterval: SERVER_SAMPLE_SECONDS * 1000,
  });
}

export function useServerMetrics(serverId: string, range: ServerRange) {
  return useQuery(metricsQueryOptions(serverId, range));
}

export function useServersMetrics(serverIds: string[], range: ServerRange) {
  return useQueries({ queries: serverIds.map((id) => metricsQueryOptions(id, range)) });
}
