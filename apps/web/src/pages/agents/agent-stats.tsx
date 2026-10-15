import type { agentStatsSchema } from "@idesk/shared/agent-schemas";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "../../lib/api.ts";
import { formatDuration } from "../../lib/format.ts";

export function AgentStats({ agentId }: { agentId: string }) {
  const { data, error } = useQuery({
    queryKey: ["agents", agentId, "stats"],
    queryFn: () =>
      request<z.infer<typeof agentStatsSchema>>(`/agents/${encodeURIComponent(agentId)}/stats`),
  });
  const values = [
    ["完成", data?.completed ?? "—"],
    ["7 天完成", data?.last7dCompleted ?? "—"],
    ["交接", data?.handoffs ?? "—"],
    ["平均耗时", formatDuration(data?.avgDurationMs ?? null)],
  ];
  return (
    <section className="space-y-2 md:col-span-2" aria-label="画像">
      <dl className="grid grid-cols-4 gap-4">
        {values.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dd className="order-first min-h-7 whitespace-nowrap text-title tabular-nums">
              {value}
            </dd>
            <dt className="text-secondary text-text-2">{label}</dt>
          </div>
        ))}
      </dl>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
    </section>
  );
}
