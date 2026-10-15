import type { Lang } from "@idesk/shared/labels";
import { translator } from "./translate.ts";

export function formatDuration(durationMs: number | null, lang: Lang): string {
  const t = translator(lang);
  if (durationMs === null) return "—";
  const minutes = Math.floor(durationMs / 60_000);
  if (minutes < 1) return t("time.underMinute");
  if (minutes < 60) return t("time.minutes", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    return remainder === 0
      ? t("time.hours", { hours })
      : t("time.hoursMinutes", { hours, minutes: remainder });
  }
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder === 0
    ? t("time.days", { days })
    : t("time.daysHours", { days, hours: remainder });
}
