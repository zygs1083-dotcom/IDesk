import {
  type publicServerSchema,
  type SERVER_RANGES,
  SERVER_SAMPLE_SECONDS,
  type serverMetricsSchema,
} from "@idesk/shared/server-schemas";
import { queryOptions, useQuery } from "@tanstack/react-query";
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

export function useServerMetrics(serverId: string, range: ServerRange) {
  return useQuery({
    queryKey: ["servers", serverId, "metrics", range],
    queryFn: () => request<ServerMetrics>(`/servers/${serverId}/metrics?range=${range}`),
    enabled: Boolean(serverId),
    refetchInterval: SERVER_SAMPLE_SECONDS * 1000,
  });
}
