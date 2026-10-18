import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { Eye, EyeOff } from "lucide-react";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { useSession } from "../../lib/use-session.ts";
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

export function RunCard({
  run,
  now,
  onToggleHidden,
  pending,
}: {
  run: Run;
  now: number;
  onToggleHidden: (run: Run) => void;
  pending: boolean;
}) {
  const { isAdmin } = useSession();
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
      className={cn(
        "rounded-card border border-line bg-surface p-3 transition-colors duration-hover ease-hover hover:bg-surface-2",
        run.hiddenAt !== null && "opacity-60",
      )}
    >
      <CardHeading
        actions={
          isAdmin &&
          run.status !== "waiting" &&
          run.status !== "running" && (
            <button
              type="button"
              disabled={pending}
              aria-label={t(run.hiddenAt === null ? "automation.hide" : "automation.unhide")}
              title={t(run.hiddenAt === null ? "automation.hide" : "automation.unhide")}
              onClick={() => onToggleHidden(run)}
              className="shrink-0 rounded-control text-text-3 hover:text-text-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {run.hiddenAt === null ? (
                <EyeOff size={16} strokeWidth={1.5} />
              ) : (
                <Eye size={16} strokeWidth={1.5} />
              )}
            </button>
          )
        }
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
