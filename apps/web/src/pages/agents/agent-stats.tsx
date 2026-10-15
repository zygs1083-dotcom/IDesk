import type { agentStatsSchema } from "@idesk/shared/agent-schemas";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { formatDuration } from "../../lib/format.ts";

export function AgentStats({ agentId }: { agentId: string }) {
  const { lang, t } = useLang();
  const { data, error } = useQuery({
    queryKey: ["agents", agentId, "stats"],
    queryFn: () =>
      request<z.infer<typeof agentStatsSchema>>(`/agents/${encodeURIComponent(agentId)}/stats`),
  });
  const values = [
    [t("agents.complete"), data?.completed ?? "—"],
    [t("agents.completedIn7Days"), data?.last7dCompleted ?? "—"],
    [t("agents.handoff"), data?.handoffs ?? "—"],
    [t("agents.averageDuration"), formatDuration(data?.avgDurationMs ?? null, lang)],
  ];
  return (
    <section className="space-y-2 md:col-span-2" aria-label={t("agents.profile")}>
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
