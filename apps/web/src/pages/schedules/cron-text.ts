import type { Lang } from "@idesk/shared/labels";
import { translator } from "../../i18n/translate.ts";

const weekdayKeys = [
  "schedules.sunday",
  "schedules.monday",
  "schedules.tuesday",
  "schedules.wednesday",
  "schedules.thursday",
  "schedules.friday",
  "schedules.saturday",
  "schedules.sunday",
] as const;

export function cronText(cron: string, lang: Lang): string {
  const t = translator(lang);
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [minute, hour, day, month, weekday] = parts as [string, string, string, string, string];
  if (month !== "*") return cron;
  if (day === "*" && weekday === "*" && hour === "*") {
    if (minute === "*") return t("schedules.everyMinute");
    if (/^\*\/[1-9]\d*$/.test(minute))
      return t("schedules.everyMinutes", { minutes: minute.slice(2) });
    if (/^\d+$/.test(minute) && Number(minute) < 60)
      return t("schedules.hourly", {
        minute: Number(minute),
        paddedMinute: minute.padStart(2, "0"),
      });
  }
  if (!/^\d+$/.test(minute) || Number(minute) > 59) return cron;
  if (!/^\d+$/.test(hour) || Number(hour) > 23) return cron;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (day === "*") {
    if (weekday === "*") return t("schedules.daily", { time });
    if (weekday === "1-5") return t("schedules.weekdays", { time });
    if (/^[0-7]$/.test(weekday)) {
      return t("schedules.weekly", {
        weekday: t(weekdayKeys[Number(weekday) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7]),
        time,
      });
    }
  }
  if (weekday === "*" && /^\d+$/.test(day) && Number(day) >= 1 && Number(day) <= 31) {
    return t("schedules.monthly", { day: Number(day), time });
  }
  return cron;
}
