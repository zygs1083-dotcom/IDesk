import type { Lang } from "@idesk/shared/labels";
import { translator } from "../../i18n/translate.ts";
export function cronText(cron: string, lang: Lang): string {
  const t = translator(lang);
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [minute, hour, day, month, weekday] = parts as [string, string, string, string, string];
  if (month !== "*") return cron;
  if (day === "*" && weekday === "*" && hour === "*") {
    if (minute === "*") return t("schedules.everyMinute");
    if (/^\*\/[1-9]\d*$/.test(minute)) return t("schedules.everyMinutes", { p1: minute.slice(2) });
    if (/^\d+$/.test(minute) && Number(minute) < 60)
      return t("schedules.hourlyAt", {
        p1: lang === "en" ? minute.padStart(2, "0") : Number(minute),
      });
  }
  if (!/^\d+$/.test(minute) || Number(minute) > 59) return cron;
  if (!/^\d+$/.test(hour) || Number(hour) > 23) return cron;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (day === "*") {
    if (weekday === "*") return t("schedules.daily", { p1: time });
    if (weekday === "1-5") return t("schedules.weekdays", { p1: time });
    if (/^[0-7]$/.test(weekday)) {
      return t("schedules.weekly", {
        p1: t(
          (
            [
              "schedules.sunday",
              "schedules.monday",
              "schedules.tuesday",
              "schedules.wednesday",
              "schedules.thursday",
              "schedules.friday",
              "schedules.saturday",
              "schedules.sunday",
            ] as const
          )[Number(weekday) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7],
        ),
        p2: time,
      });
    }
  }
  if (weekday === "*" && /^\d+$/.test(day) && Number(day) >= 1 && Number(day) <= 31) {
    return t("schedules.monthlyOnDay", { p1: Number(day), p2: time });
  }
  return cron;
}
