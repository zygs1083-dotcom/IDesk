import type { useDraggable } from "@dnd-kit/core";
import { TASK_PRIORITY_LABEL } from "@idesk/shared/task-status";
import { Lock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Task } from "../../lib/types.ts";
import { StatusDot } from "./status-dot.tsx";

export function TaskCard({
  task,
  blockers,
  name,
  handoff,
  onOpen,
  overlay = false,
  shake = false,
  entering = false,
  drag,
}: {
  task: Task;
  blockers: number;
  name: string;
  handoff?: string;
  onOpen: () => void;
  overlay?: boolean;
  shake?: boolean;
  entering?: boolean;
  drag?: Pick<
    ReturnType<typeof useDraggable>,
    "attributes" | "listeners" | "setNodeRef" | "isDragging"
  >;
}) {
  const reduced = useReducedMotion();
  const expiring =
    task.status === "in_progress" &&
    task.leaseExpiresAt !== null &&
    new Date(task.leaseExpiresAt).getTime() - Date.now() < 120000;
  return (
    <motion.button
      ref={drag?.setNodeRef}
      type="button"
      {...drag?.attributes}
      {...drag?.listeners}
      onClick={onOpen}
      layout={!reduced && !overlay}
      initial={reduced || !entering ? false : { opacity: 0 }}
      animate={{ opacity: 1, x: shake && !reduced ? [0, -6, 6, -4, 4, 0] : 0 }}
      transition={{
        opacity: { duration: reduced ? 0 : 0.2 },
        x: { duration: reduced ? 0 : 0.2 },
        layout: { type: "spring", stiffness: 500, damping: 35 },
      }}
      className={cn(
        "w-full touch-none rounded-card border border-line bg-surface p-3 text-left transition-colors duration-hover ease-hover hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent",
        drag?.isDragging && "opacity-0",
        overlay && "shadow-card",
      )}
    >
      <span className="mb-3 block line-clamp-2 text-body">
        {blockers > 0 && (
          <span className="mr-2 inline-flex items-center gap-1 text-text-3 tabular-nums">
            <Lock size={16} strokeWidth={1.5} aria-hidden="true" />
            {blockers}
            <span className="sr-only"> 个未完成依赖</span>
          </span>
        )}
        {task.title}
      </span>
      <span className="mb-2 flex items-baseline justify-between gap-2 text-label text-text-2">
        <span className="truncate">{task.capabilities.join(" · ")}</span>
        {(task.priority === "high" || task.priority === "urgent") && (
          <span className={cn("shrink-0", task.priority === "urgent" && "text-status-failed")}>
            ↑{TASK_PRIORITY_LABEL[task.priority]}
          </span>
        )}
      </span>
      {task.status === "recruiting" && task.recruit && (
        <span className="mb-2 block text-label text-text-2 tabular-nums">
          {task.recruit.joined.length} / {task.recruit.needed} 已加入
        </span>
      )}
      {task.status === "assigned" && handoff && (
        <span className="mb-2 block truncate text-label text-text-2">← {handoff} 交接</span>
      )}
      <span className="flex items-center gap-2 text-label">
        <StatusDot status={task.status} />
        <span className="min-w-0 flex-1 truncate text-text-2">{name}</span>
        <span
          className={cn("shrink-0 tabular-nums", expiring ? "text-status-paused" : "text-text-2")}
        >
          {relativeTime(new Date(task.updatedAt))}
        </span>
      </span>
    </motion.button>
  );
}
