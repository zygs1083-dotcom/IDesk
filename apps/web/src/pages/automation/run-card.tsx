import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { CardHeading } from "./card-heading.tsx";
import { duration } from "./duration.ts";
import { runTimes } from "./run-times.ts";

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
    success: t("common.success"),
    failed: t("common.failed"),
    canceled: t("automation.cancelled"),
  };
  const times = runTimes(run.startedAt, run.finishedAt, now);
  const metadata = [
    run.trigger,
    times.text,
    run.finishedAt === null && run.status !== "running"
      ? "—"
      : duration(run.startedAt, run.finishedAt, now, lang),
  ].filter((value) => value !== null);
  return (
    <article
      data-ui="card"
      className="rounded-card border border-line bg-surface p-3 transition-colors duration-hover ease-hover hover:bg-surface-2"
    >
      <CardHeading
        name={run.jobName}
        group={run.jobGroup}
        url={run.url}
        status={statusLabels[run.status]}
        color={statusColors[run.status]}
      />
      <p title={times.title || undefined} className="text-label text-text-2 tabular-nums">
        {metadata.join(" · ")}
      </p>
      {run.status === "failed" && run.error !== null && (
        <p title={run.error} className="mt-2 truncate text-label text-status-failed">
          {run.error}
        </p>
      )}
    </article>
  );
}
