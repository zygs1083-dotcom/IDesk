import type { Lang } from "@idesk/shared/labels";
import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import { translator } from "../../i18n/translate.ts";
import { monthDay } from "../../lib/format.ts";

type Event = z.infer<typeof eventSchema>;

export function groupEvents(
  events: Event[],
  lang: Lang,
  now = new Date(),
): { day: string; label: string; events: Event[] }[] {
  const t = translator(lang);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const groups = new Map<string, { day: string; label: string; events: Event[] }>();
  for (const event of events) {
    const date = new Date(event.ts);
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    let group = groups.get(day);
    if (!group) {
      const label =
        midnight.getTime() === today.getTime()
          ? t("time.today")
          : midnight.getTime() === yesterday.getTime()
            ? t("time.yesterday")
            : monthDay(date, lang, now);
      group = { day, label, events: [] };
      groups.set(day, group);
    }
    group.events.push(event);
  }
  return [...groups.values()];
}
