import { useLang } from "../../i18n/lang.tsx";
import { useRelaySummary } from "./use-relay-summary.ts";

export function RelayBadge() {
  const { t } = useLang();
  const { data } = useRelaySummary();
  if (!data) return null;
  return (
    <span className="ml-auto flex items-center gap-1">
      {data.unread > 0 && (
        <span
          data-ui="relay-unread"
          className="rounded-full border border-line px-1.5 text-label tabular-nums"
        >
          {data.unread > 99 ? "99+" : data.unread}
        </span>
      )}
      {data.pendingRequests > 0 && (
        <span
          data-ui="relay-pending"
          role="img"
          aria-label={t("relay.pendingCount", { count: data.pendingRequests })}
          title={t("relay.pendingCount", { count: data.pendingRequests })}
          className="size-2 rounded-full border border-current bg-accent"
        />
      )}
    </span>
  );
}
