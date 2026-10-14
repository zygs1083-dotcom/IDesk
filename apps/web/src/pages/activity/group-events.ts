import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";

type Event = z.infer<typeof eventSchema>;

export function groupEvents(
  events: Event[],
  now = new Date(),
): { day: string; label: string; events: Event[] }[] {
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
          ? "今天"
          : midnight.getTime() === yesterday.getTime()
            ? "昨天"
            : `${date.getFullYear() === now.getFullYear() ? "" : `${date.getFullYear()} 年 `}${date.getMonth() + 1} 月 ${date.getDate()} 日`;
      group = { day, label, events: [] };
      groups.set(day, group);
    }
    group.events.push(event);
  }
  return [...groups.values()];
}
