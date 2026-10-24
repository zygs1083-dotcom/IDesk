import { useEffect, useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { formatDuration } from "../../lib/format.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { completedDuration, taskClock } from "./task-clock.ts";

export function TaskCardClock({ task, events }: { task: Task; events: TaskEvent[] }) {
  const { lang, t } = useLang();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (task.status !== "in_progress") return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [task.status]);
  const total = completedDuration(task, events);
  if (total !== null) {
    return (
      <span className="mb-2 block text-label text-text-2 tabular-nums">
        {t("desk.totalDuration", { duration: formatDuration(total, lang) })}
      </span>
    );
  }
  const clock = task.status === "in_progress" ? taskClock(events, now) : null;
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
