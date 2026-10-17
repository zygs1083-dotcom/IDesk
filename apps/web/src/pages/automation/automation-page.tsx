import type {
  automationJobSchema,
  automationRunWithJobSchema,
  connectorSchema,
  pollResultSchema,
} from "@idesk/shared/automation-schemas";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { ColumnJump } from "../../components/column-jump.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { relativeTime } from "../../lib/format.ts";
import { useSession } from "../../lib/use-session.ts";
import { filterRuns, matches } from "./filter-runs.ts";
import { JobCard } from "./job-card.tsx";
import { nextRuns } from "./next-runs.ts";
import { RunCard } from "./run-card.tsx";
import { RunColumn } from "./run-column.tsx";

type Run = z.infer<typeof automationRunWithJobSchema>;

const runColumns: Record<Run["status"], "waiting" | "running" | "completed" | "failed"> = {
  waiting: "waiting",
  running: "running",
  success: "completed",
  failed: "failed",
  canceled: "completed",
};
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
  const error = connectorsQuery.error ?? runs.error ?? jobs.error;
  const filteredRuns = filterRuns(runs.data ?? [], q);
  const upcoming = nextRuns(
    (jobs.data ?? []).filter((job) => matches(q, [job.name, job.group])),
    now,
  );
  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeader title={t("nav.automation")}>
        {connector && (
          <>
            <span className="text-secondary text-text-2">
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
        <div className="py-16 text-center text-secondary text-text-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 overflow-x-auto">
              <Segmented
                label={t("common.connectors")}
                options={connectors.map((item) => ({ value: item.id, label: item.name }))}
                value={connector.id}
                onChange={setSelected}
              />
            </div>
            <label className="flex min-w-0 flex-1 sidebar:max-w-60 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2">
              <Search size={16} strokeWidth={1.5} />
              <input
                aria-label={t("automation.search")}
                placeholder={t("automation.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 w-full bg-transparent text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
              />
            </label>
          </div>
          {connector.lastError !== null && (
            <div role="alert">
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
            aria-label={t("automation.board")}
            className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-3"
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
                >
                  {items.map((run) => (
                    <RunCard key={run.id} run={run} now={now} />
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
