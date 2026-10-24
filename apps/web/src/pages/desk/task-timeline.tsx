import { useId, useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { eventText } from "../../lib/event-text.ts";
import { relativeTime } from "../../lib/format.ts";
import type { TaskEvent } from "../../lib/types.ts";
import { TaskExcerpt } from "./task-excerpt.tsx";

export function TaskTimeline({
  events,
  agentName,
}: {
  events: TaskEvent[];
  agentName: (id: string | null) => string;
}) {
  const { lang, t } = useLang();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(-10);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-section">{t("desk.timeline")}</h3>
        {events.length > 10 && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            className="min-h-6 text-accent text-label focus-visible:outline-accent"
            onClick={() => setExpanded(!expanded)}
          >
            {t(expanded ? "desk.showLatestEvents" : "desk.showEarlierEvents", {
              count: events.length - 10,
            })}
          </button>
        )}
      </div>
      <ol id={id} className="space-y-3">
        {visibleEvents.map((event) => {
          const reported = event.type === "task.reported";
          const summary = reported
            ? t("desk.reported", { agent: agentName(event.agentId) })
            : eventText(event, agentName, lang);
          return (
            <li key={event.id} className="min-w-0 space-y-1 border-l border-line pl-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <p className="line-clamp-2 text-secondary [overflow-wrap:anywhere]" title={summary}>
                  {summary}
                </p>
                <time
                  dateTime={event.ts}
                  title={new Date(event.ts).toLocaleString(lang)}
                  className="text-label text-text-2 tabular-nums"
                >
                  {relativeTime(new Date(event.ts), lang)}
                </time>
              </div>
              {reported && (
                <TaskExcerpt lines={2}>
                  <p className="whitespace-pre-wrap">{String(event.payload.message)}</p>
                </TaskExcerpt>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
