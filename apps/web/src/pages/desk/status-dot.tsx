import type { TaskStatus } from "@idesk/shared/task-status";
import { cn } from "../../lib/cn.ts";

const color: Record<TaskStatus, string> = {
  open: "bg-status-open",
  recruiting: "bg-status-recruiting",
  assigned: "bg-status-assigned",
  in_progress: "bg-status-in-progress",
  paused: "bg-status-paused",
  done: "bg-status-done",
  cancelled: "bg-status-open",
};
export function StatusDot({ status, muted = false }: { status: TaskStatus; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", muted ? "bg-text-3" : color[status])}
    />
  );
}
