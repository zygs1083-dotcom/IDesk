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
import { ColumnJump } from "../../components/column-jump.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { relativeTime } from "../../lib/format.ts";
import { useSession } from "../../lib/use-session.ts";
import { AutomationFilters } from "./automation-filters.tsx";
import { matches, type RunRange, selectRuns } from "./filter-runs.ts";
import { JobCard } from "./job-card.tsx";
import { nextRuns } from "./next-runs.ts";
import { RunCard } from "./run-card.tsx";
import { RunColumn, runColumns } from "./run-column.tsx";
import { useRunVisibility } from "./use-run-visibility.ts";

type Run = z.infer<typeof automationRunWithJobSchema>;
export function AutomationPage() {
  const { isAdmin } = useSession();
  const { lang, t } = useLang();
  const columns = [
    { id: "waiting", label: t("automation.waiting"), color: "bg-status-open" },
    { id: "running", label: t("automation.running"), color: "bg-status-in-progress" },
    { id: "completed", label: t("automation.done"), color: "bg-status-done" },
    { id: "failed", label: t("common.failed"), color: "bg-status-failed" },
  ] as const;
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<RunRange>(() =>
    localStorage.getItem("automation.range") === "all" ? "all" : "today",
  );
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const [message, setMessage] = useState<string | null>(null);
  const connectorsQuery = useQuery({
    queryKey: ["automation", "connectors"],
    queryFn: () => request<z.infer<typeof connectorSchema>[]>("/connectors"),
  });
  const connectors = connectorsQuery.data ?? [];
  const connector = connectors.find((item) => item.id === selected) ?? connectors[0];
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
              {connector.lastPolledAt === null
                ? t("automation.notPolled")
                : t("automation.lastPolled", {
                    time: relativeTime(new Date(connector.lastPolledAt), lang),
                  })}
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
            onSelect={setSelected}
            search={search}
            onSearch={setSearch}
            range={range}
            onRange={(value) => {
              setRange(value);
              localStorage.setItem("automation.range", value);
            }}
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
          <ColumnJump
            options={columns.map((column) => ({
              id: `automation-column-${column.id}`,
              label: column.label,
            }))}
          />
          <section
            data-ui="task-wall"
            data-console=""
            aria-label={t("automation.board")}
            className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-3"
          >
            {columns.map((column) => {
              const items = filteredRuns.filter((run) => runColumns[run.status] === column.id);
              return (
                <RunColumn
                  key={column.id}
                  id={`automation-column-${column.id}`}
                  label={column.label}
                  count={items.length + (column.id === "waiting" ? upcoming.length : 0)}
                  color={column.color}
                  error={column.id === "waiting" ? connector.lastError : null}
                >
                  {items.map((run) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      now={now}
                      onToggleHidden={visibility.mutate}
                      pending={visibility.isPending}
                    />
                  ))}
                  {column.id === "waiting" &&
                    upcoming.map((item) => <JobCard key={item.job.id} {...item} now={now} />)}
                </RunColumn>
              );
            })}
          </section>
        </>
      )}
      <Toast message={message} onClose={() => setMessage(null)} />
    </div>
  );
}
