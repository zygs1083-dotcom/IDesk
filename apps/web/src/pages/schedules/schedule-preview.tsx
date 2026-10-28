import type { Lang } from "@idesk/shared/labels";
import { Cron } from "croner";
import type { Translate } from "../../i18n/translate.ts";
import { cn } from "../../lib/cn.ts";

export function formatScheduleTime(date: Date, timezone: string, lang: Lang, seconds = false) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hourCycle: "h23",
  })
    .format(date)
    .replaceAll("/", "-");
}

export function schedulePreview(
  cron: string,
  timezone: string,
  lang: Lang,
  now: Date,
): { times: string; timezone: string } | "invalid" | "empty" | null {
  const expression = cron.trim();
  const zone = timezone.trim();
  if (!expression || !zone) return null;
  try {
    const runs = new Cron(expression, { timezone: zone, paused: true }).nextRuns(3, now);
    if (!runs.length) return "empty";
    const seconds = runs.some((run) => run.getUTCSeconds() !== 0);
    return {
      times: runs
        .map((run) => formatScheduleTime(run, zone, lang, seconds))
        .join(lang === "zh" ? "、" : "; "),
      timezone: zone,
    };
  } catch {
    return "invalid";
  }
}

export function SchedulePreview({
  cron,
  timezone,
  enabled,
  lang,
  t,
}: {
  cron: string;
  timezone: string;
  enabled: boolean;
  lang: Lang;
  t: Translate;
}) {
  const preview = schedulePreview(cron, timezone, lang, new Date());
  if (preview === null) return null;
  return (
    <p
      className={cn(
        "break-words text-secondary",
        preview === "invalid" ? "text-status-failed" : "text-text-2",
      )}
    >
      {preview === "invalid"
        ? t("schedules.invalidPreview")
        : preview === "empty"
          ? t("schedules.noUpcomingRuns")
          : t(enabled ? "schedules.nextRuns" : "schedules.nextRunsOnceEnabled", preview)}
    </p>
  );
}
