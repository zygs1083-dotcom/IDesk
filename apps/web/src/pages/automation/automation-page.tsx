import type {
  automationJobSchema,
  automationRunWithJobSchema,
  connectorSchema,
  pollResultSchema,
} from "@idesk/shared/automation-schemas";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { copyText } from "../../lib/clipboard.ts";
import { relativeTime } from "../../lib/format.ts";
import { useSession } from "../../lib/use-session.ts";
import { AutomationBoard } from "./automation-board.tsx";
import { AutomationFilters } from "./automation-filters.tsx";
import { failureText } from "./failure-text.ts";
import { matches, selectRuns } from "./filter-runs.ts";
import { nextRuns } from "./next-runs.ts";
import { useAutomationFilters } from "./use-automation-filters.ts";
import { useRunVisibility } from "./use-run-visibility.ts";

type Run = z.infer<typeof automationRunWithJobSchema>;
export function AutomationPage() {
  const { isAdmin } = useSession();
  const { lang, t } = useLang();
  const client = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [message, setMessage] = useState<string | null>(null);
  const connectorsQuery = useQuery({
    queryKey: ["automation", "connectors"],
    queryFn: () => request<z.infer<typeof connectorSchema>[]>("/connectors"),
  });
  const connectors = connectorsQuery.data ?? [];
  const { search, q, connector, range, setFilter, clearSearch } = useAutomationFilters(
    connectors,
    connectorsQuery.status,
  );
  const runs = useQuery({
    queryKey: ["automation", "runs", connector?.id],
    queryFn:
      connector === undefined
        ? skipToken
        : () => request<Run[]>(`/automation/runs?connectorId=${encodeURIComponent(connector.id)}`),
  });
  const jobs = useQuery({
    queryKey: ["automation", "jobs", connector?.id],
    queryFn:
      connector === undefined
        ? skipToken
        : () =>
            request<z.infer<typeof automationJobSchema>[]>(
              `/automation/jobs?connectorId=${encodeURIComponent(connector.id)}`,
            ),
  });
  const poll = useMutation({
    mutationFn: (id: string) =>
      request<z.infer<typeof pollResultSchema>>(`/connectors/${id}/poll`, { method: "POST" }),
    onSuccess: (result) => {
      if (!result.refreshed) setMessage(t("automation.pollTooSoon"));
      else void client.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (error) => setMessage(error.message),
  });
  const visibility = useRunVisibility(connector?.id, setMessage);
  const error = connectorsQuery.error ?? runs.error ?? jobs.error;
  const { runs: filteredRuns, hiddenCount } = selectRuns(
    runs.data ?? [],
    q,
    range,
    showHidden,
    now,
  );
  useEffect(() => {
    if (hiddenCount === 0) setShowHidden(false);
  }, [hiddenCount]);
  const upcoming = nextRuns(
    (jobs.data ?? []).filter((job) => matches(q, [job.name, job.group])),
    now,
  );
  const subtitle = connector
    ? connector.lastPolledAt === null
      ? t("automation.notPolled")
      : t("automation.lastPolled", {
          time: relativeTime(new Date(connector.lastPolledAt), lang),
        })
    : null;
  return (
    <div data-scene="automation" className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title={t("nav.automation")} {...(subtitle ? { subtitle } : {})}>
        {connector && (
          <>
            <span data-ui="header-note" className="pixel-legacy text-secondary text-text-2">
              {subtitle}
            </span>
            <Button disabled={!isAdmin || poll.isPending} onClick={() => poll.mutate(connector.id)}>
              {t("common.refresh")}
            </Button>
          </>
        )}
      </PageHeader>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {connectorsQuery.isSuccess && connectors.length === 0 && (
        <div data-ui="board-note" className="py-16 text-center text-secondary text-text-2">
          <p>{t("settings.noConnectors")}</p>
          {isAdmin && (
            <Link
              to="/settings/connectors"
              className="mt-3 inline-flex rounded-control border border-line bg-surface px-3 py-2 text-body text-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {t("settings.addConnector")}
            </Link>
          )}
        </div>
      )}
      {connector && (
        <>
          <AutomationFilters
            connectors={connectors}
            selected={connector.id}
            onSelect={(value) => setFilter("connector", value)}
            search={search}
            onSearch={(value) => setFilter("q", value)}
            onClearSearch={clearSearch}
            range={range}
            onRange={(value) => setFilter("range", value)}
            hiddenCount={hiddenCount}
            showHidden={showHidden}
            onShowHidden={() => setShowHidden(!showHidden)}
          />
          {connector.lastError !== null && (
            <div role="alert" className="pixel-legacy">
              <div className="h-px bg-status-failed" />
              <p className="pt-2 text-secondary text-status-failed">{connector.lastError}</p>
            </div>
          )}
          <AutomationBoard
            runs={filteredRuns}
            upcoming={upcoming}
            now={now}
            isAdmin={isAdmin}
            error={connector.lastError}
            onToggleHidden={visibility.mutate}
            onCopyFailure={async (run) => {
              setMessage(null);
              try {
                await copyText(failureText(run, connector.name, t));
                setMessage(t("common.copied"));
              } catch {
                setMessage(t("desk.copyFailed"));
              }
            }}
            pending={visibility.isPending}
          />
        </>
      )}
      <Toast message={message} onClose={() => setMessage(null)} />
    </div>
  );
}
