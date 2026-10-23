import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { formatDuration } from "../../lib/format.ts";
import type { TaskEvent } from "../../lib/types.ts";
import { taskClock } from "./task-clock.ts";

export function TaskCardClock({ taskId }: { taskId: string }) {
  const { lang, t } = useLang();
  const [now, setNow] = useState(Date.now);
  const { data: events } = useQuery({
    queryKey: ["task", taskId, "events"],
    queryFn: () => request<TaskEvent[]>(`/tasks/${taskId}/events`),
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const clock = events ? taskClock(events, now) : null;
  if (!clock) return null;
  return (
    <span
      className={cn(
        "mb-2 block text-label tabular-nums",
        clock.silentMinutes !== null ? "text-status-paused" : "text-text-2",
      )}
    >
      {t("desk.running", { duration: formatDuration(clock.elapsedMs, lang) })}
      {clock.silentMinutes !== null && ` · ${t("desk.silent", { minutes: clock.silentMinutes })}`}
    </span>
  );
}
