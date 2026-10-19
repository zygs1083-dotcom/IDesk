import type { agentStatsSchema } from "@idesk/shared/agent-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { formatDuration } from "../i18n/duration.ts";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";

export function ProfileStats({ agentId }: { agentId: string }) {
  const { lang, t } = useLang();
  const [stats, setStats] = useState<z.infer<typeof agentStatsSchema>>();
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      void request<z.infer<typeof agentStatsSchema>>(`/agents/${encodeURIComponent(agentId)}/stats`)
        .then((data) => {
          if (!disposed) setStats(data);
        })
        .catch((reason: Error) => {
          if (!disposed) setError(reason.message);
        });
    };
    refresh();
    const unsubscribe = onRealtimeEvent((event) => {
      if (event.agentId === agentId || event.type.startsWith("task.")) refresh();
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [agentId]);
  const values = [
    [t("profile.completed"), stats?.completed ?? "—"],
    [t("profile.completedWeek"), stats?.last7dCompleted ?? "—"],
    [t("profile.handoffs"), stats?.handoffs ?? "—"],
    [t("profile.averageDuration"), formatDuration(stats?.avgDurationMs ?? null, lang)],
  ] as const;
  return (
    <section aria-label={t("profile.stats")}>
      <dl className="profile-stats">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt title={label}>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
