import type { Lang } from "@idesk/shared/labels";
import { translator } from "../i18n/translate.ts";

export function monthDay(date: Date, lang: Lang, now = new Date()): string {
  if (lang === "en")
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    }).format(date);
  const t = translator(lang);
  const text = t("time.monthDay", { month: date.getMonth() + 1, day: date.getDate() });
  return date.getFullYear() === now.getFullYear()
    ? text
    : t("time.yearMonthDay", { year: date.getFullYear(), monthDay: text });
}

export function relativeTime(date: Date, lang: Lang, now = new Date()): string {
  const t = translator(lang);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return t("time.justNow");
  if (minutes < 60)
    return lang === "en"
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-minutes, "minute")
      : t("time.minutesAgo", { minutes });

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day === today.getTime()) return time;
  today.setDate(today.getDate() - 1);
  if (day === today.getTime()) return t("time.yesterdayAt", { time });
  return monthDay(date, lang, now);
}

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
