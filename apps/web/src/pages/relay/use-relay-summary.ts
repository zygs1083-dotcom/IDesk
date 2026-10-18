import type { relaySummarySchema } from "@idesk/shared/relay-schemas";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "../../lib/api.ts";

export function useRelaySummary() {
  return useQuery({
    queryKey: ["relay", "summary"],
    queryFn: () => request<z.infer<typeof relaySummarySchema>>("/relay/summary"),
  });
}
