import type { eventSchema } from "@idesk/shared/task-schemas";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Drawer } from "../../components/drawer.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { StatusDot } from "../desk/status-dot.tsx";
import { CopyFailureDetails } from "./copy-failure-details.tsx";
import { failureText } from "./failure-text.ts";
import type { Schedule } from "./types.ts";

export function ScheduleHistory({
  schedule,
  onClose,
}: {
  schedule: Schedule;
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const history = useQuery({
    queryKey: ["schedules", schedule.id, "events"],
    queryFn: () => request<z.infer<typeof eventSchema>[]>(`/schedules/${schedule.id}/events`),
  });
  const current = useQuery({
    queryKey: ["schedules", schedule.id],
    queryFn: () => request<Schedule>(`/schedules/${schedule.id}`),
  });
  const events = history.data ?? [];
  const completed = new Set(
    events.filter((event) => event.type === "schedule.fired").map((event) => event.payload.runId),
  );
  const entries = events.filter(
    (event) => event.type === "schedule.fired" || !completed.has(event.payload.runId),
  );
  const date = (value: unknown) =>
    new Date(String(value)).toLocaleString(lang === "zh" ? "zh-CN" : "en");
  return (
    <Drawer
      open
      title={`${schedule.name} · ${t("schedules.history")}`}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      {history.isPending && <p className="text-secondary text-text-2">{t("common.loading")}</p>}
      {history.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {history.error.message}
        </p>
      )}
      {!history.isPending && !history.error && entries.length === 0 && (
        <p className="text-secondary text-text-2">{t("schedules.noHistory")}</p>
      )}
      <ol className="divide-y divide-line">
        {entries.map((event, index) => {
          const finished = event.type === "schedule.fired";
          const running = !finished && index === 0 && current.data?.running;
          const status = finished
            ? event.payload.status === "success"
              ? "done"
              : "paused"
            : running
              ? "in_progress"
              : "paused";
          return (
            <li key={event.id} className="space-y-2 py-4 text-secondary">
              {finished && event.payload.status === "failed" ? (
                <CopyFailureDetails
                  key={`${schedule.id}:${event.id}:${lang}`}
                  text={failureText(schedule, event, t)}
                />
              ) : (
                <p className="flex items-center gap-2">
                  <StatusDot status={status} />
                  {finished
                    ? t(event.payload.status === "success" ? "common.success" : "common.failed")
                    : t(running ? "schedules.running" : "schedules.interrupted")}
                </p>
              )}
              <p className="text-text-2">
                {t("schedules.startedAt")} ·{" "}
                {event.payload.startedAt ? date(event.payload.startedAt) : "—"}
              </p>
              {finished && (
                <>
                  <p className="text-text-2">
                    {t("schedules.finishedAt")} · {date(event.payload.finishedAt ?? event.ts)}
                  </p>
                  <p className="tabular-nums text-text-2">
                    {t("schedules.duration")} ·{" "}
                    {typeof event.payload.durationMs === "number"
                      ? `${event.payload.durationMs} ms`
                      : "—"}
                  </p>
                </>
              )}
              {typeof event.payload.error === "string" && (
                <p className="break-words text-status-failed">{event.payload.error}</p>
              )}
            </li>
          );
        })}
      </ol>
    </Drawer>
  );
}
