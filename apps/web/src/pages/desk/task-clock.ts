import type { Task, TaskEvent } from "../../lib/types.ts";

const SILENCE_THRESHOLD_MS = 15 * 60_000;

export function completedDuration(task: Task, events: TaskEvent[]) {
  if (task.status !== "done" || task.completedAt === null) return null;
  const start = events.find(
    (event) =>
      ["task.claim", "task.accept", "task.join"].includes(event.type) &&
      event.payload.to === "in_progress" &&
      event.payload.from !== "in_progress",
  );
  if (!start) return null;
  return new Date(task.completedAt).getTime() - new Date(start.ts).getTime();
}

export function taskClock(events: TaskEvent[], now: number) {
  const start = events.findLast(
    (event) => event.payload.to === "in_progress" && event.payload.from !== "in_progress",
  );
  if (!start) return null;
  const startedAt = new Date(start.ts).getTime();
  const report = events.findLast((event) => event.type === "task.reported");
  const silenceMs = now - (report ? Math.max(startedAt, new Date(report.ts).getTime()) : startedAt);
  return {
    elapsedMs: now - startedAt,
    silentMinutes: silenceMs > SILENCE_THRESHOLD_MS ? Math.floor(silenceMs / 60_000) : null,
  };
}
