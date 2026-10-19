import type { eventSchema } from "@idesk/shared/task-schemas";
import { useId, useState } from "react";
import type { z } from "zod";
import { useLang } from "../i18n/lang.tsx";
import { relativeTime } from "../i18n/relative-time.ts";
import { profileEventSummary } from "./profile-event-summary.ts";
import type { Task } from "./use-office-data.ts";

export function ProfileEvent({
  event,
  task,
  agentName,
}: {
  event: z.infer<typeof eventSchema>;
  task: Task | undefined;
  agentName: (id: string | null) => string;
}) {
  const { lang, t } = useLang();
  const summary = profileEventSummary(event, t, agentName);
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(event.ts)) / 60_000));
  const reportId = useId();
  const [expanded, setExpanded] = useState(false);
  const message = event.type === "task.reported" ? String(event.payload.message) : null;
  return (
    <li className="profile-event">
      <div className="profile-event-heading">
        <p className="profile-event-summary" title={summary}>
          {summary}
        </p>
        <time dateTime={event.ts} title={new Date(event.ts).toLocaleString(lang)}>
          {relativeTime(minutes, lang, t)}
        </time>
      </div>
      {event.taskId && (
        <a className="profile-event-task" href={`/desk?task=${encodeURIComponent(event.taskId)}`}>
          <span>{t("profile.relatedTask")}</span>
          <span className="profile-task-title" title={task?.title ?? event.taskId}>
            {task?.title ?? event.taskId.slice(0, 8)}
          </span>
        </a>
      )}
      {message !== null && (
        <div className="profile-report">
          <p
            className={`profile-report-body${expanded ? "" : " profile-report-preview"}`}
            id={reportId}
          >
            {message}
          </p>
          <button
            type="button"
            className="profile-report-toggle"
            aria-controls={reportId}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {t(expanded ? "profile.collapseReport" : "profile.expandReport")}
          </button>
        </div>
      )}
    </li>
  );
}
