import type { Lang } from "@idesk/shared/labels";
import { translator } from "../../i18n/translate.ts";
export function duration(
  startedAt: string | null,
  finishedAt: string | null,
  now: number,
  lang: Lang,
): string {
  const t = translator(lang);
  if (startedAt === null) return "—";
  const seconds = Math.floor(
    ((finishedAt === null ? now : new Date(finishedAt).getTime()) - new Date(startedAt).getTime()) /
      1000,
  );
  if (seconds < 60) return t("time.seconds", { seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("time.minutesSeconds", { minutes, seconds: seconds % 60 });
  return t("time.hoursMinutes", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}
