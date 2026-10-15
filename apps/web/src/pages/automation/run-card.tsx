import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { ExternalLink } from "lucide-react";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { duration } from "./duration.ts";

type Run = z.infer<typeof automationRunWithJobSchema>;
const statusColors: Record<Run["status"], string> = {
  waiting: "bg-status-open",
  running: "bg-status-in-progress",
  success: "bg-status-done",
  failed: "bg-status-failed",
  canceled: "bg-status-open",
};

export function RunCard({ run, now }: { run: Run; now: number }) {
  const { lang, t } = useLang();
  const statusLabels: Record<Run["status"], string> = {
    waiting: t("automation.waiting"),
    running: t("automation.running"),
    success: t("automation.success"),
    failed: t("automation.failed"),
    canceled: t("automation.cancelled"),
  };
  const metadata = [
    run.trigger,
    run.startedAt === null ? "—" : relativeTime(new Date(run.startedAt), lang, new Date(now)),
    run.finishedAt === null && run.status !== "running"
      ? "—"
      : duration(run.startedAt, run.finishedAt, now, lang),
  ].filter((value) => value !== null);
  return (
    <article className="rounded-card border border-line bg-surface p-3 transition-colors duration-hover ease-hover hover:bg-surface-2">
      <div className="mb-2 flex items-start gap-2">
        <span
          title={statusLabels[run.status]}
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusColors[run.status])}
        />
        <h3 className="min-w-0 flex-1 line-clamp-2 text-body">{run.jobName}</h3>
        {run.url !== null && (
          <a
            href={run.url}
            target="_blank"
            rel="noreferrer"
            aria-label={t("automation.open", { p1: run.jobName })}
            className="shrink-0 rounded-control text-text-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
          </a>
        )}
      </div>
      {run.jobGroup !== null && (
        <p title={run.jobGroup} className="mb-2 truncate text-label text-text-2">
          {run.jobGroup}
        </p>
      )}
      <p className="text-label text-text-2 tabular-nums">{metadata.join(" · ")}</p>
      {run.status === "failed" && run.error !== null && (
        <p title={run.error} className="mt-2 truncate text-label text-status-failed">
          {run.error}
        </p>
      )}
    </article>
  );
}
