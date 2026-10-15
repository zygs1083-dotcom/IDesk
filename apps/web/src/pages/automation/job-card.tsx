import { useLang } from "../../i18n/lang.tsx";
import { CardHeading } from "./card-heading.tsx";
import type { Job } from "./next-runs.ts";
import { nextRunTime } from "./run-times.ts";

export function JobCard({ job, next, now }: { job: Job; next: Date; now: number }) {
  const { t } = useLang();
  return (
    <article className="rounded-card border border-line bg-surface p-3 transition-colors duration-hover ease-hover hover:bg-surface-2">
      <CardHeading
        name={job.name}
        group={job.group}
        url={job.url}
        status={t("automation.waiting")}
        color="bg-status-open"
      />
      <p
        title={`${job.schedule?.cron} (${job.schedule?.timezone})`}
        className="text-label text-text-2 tabular-nums"
      >
        {t("automation.nextRun", { time: nextRunTime(next, now) })}
      </p>
    </article>
  );
}
