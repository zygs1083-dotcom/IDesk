import type { Lang } from "@idesk/shared/labels";
import type { Translate } from "./translate.ts";

export function relativeTime(minutes: number, lang: Lang, t: Translate): string {
  if (minutes < 1) return t("time.justNow");
  const hours = minutes >= 60;
  const count = hours ? Math.floor(minutes / 60) : minutes;
  if (lang === "en")
    return new Intl.RelativeTimeFormat("en").format(-count, hours ? "hour" : "minute");
  return t(hours ? "time.hoursAgo" : "time.minutesAgo", { count });
}
