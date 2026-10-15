import type { Lang } from "@idesk/shared/labels";
import { translator } from "../i18n/translate.ts";
export function relativeTime(date: Date, lang: Lang, now = new Date()): string {
  const t = translator(lang);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return t("common.justNow");
  if (minutes < 60)
    return lang === "en"
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-minutes, "minute")
      : t("common.minutesAgo", { p1: minutes });

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day === today.getTime()) return time;
  today.setDate(today.getDate() - 1);
  if (day === today.getTime()) return t("common.yesterday", { p1: time });

  if (lang === "en")
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    }).format(date);
  const monthDay = t("time.monthDay", { p1: date.getMonth() + 1, p2: date.getDate() });
  return date.getFullYear() === now.getFullYear()
    ? monthDay
    : t("time.yearMonthDay", { p1: date.getFullYear(), p2: monthDay });
}

export function formatDuration(durationMs: number | null, lang: Lang): string {
  const t = translator(lang);
  if (durationMs === null) return "—";
  const minutes = Math.floor(durationMs / 60_000);
  if (minutes < 1) return t("time.underMinute");
  if (minutes < 60) return t("common.min", { p1: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    return remainder === 0
      ? t("common.h", { p1: hours })
      : t("common.hMin", { p1: hours, p2: remainder });
  }
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder === 0
    ? t("common.d", { p1: days })
    : t("common.dH", { p1: days, p2: remainder });
}
