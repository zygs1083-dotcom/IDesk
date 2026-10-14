import type { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { priorityLabels } from "./priority-label.ts";
import { StatusDot } from "./status-dot.tsx";
import type { Task } from "./types.ts";

export function TaskCard({
  task,
  name,
  handoff,
  onOpen,
  overlay = false,
  shake = false,
  drag,
}: {
  task: Task;
  name: string;
  handoff?: string;
  onOpen: () => void;
  overlay?: boolean;
  shake?: boolean;
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
      {...(!reduced && !overlay ? { layoutId: task.id } : {})}
      animate={{ x: shake && !reduced ? [0, -6, 6, -4, 4, 0] : 0 }}
      transition={
        shake ? { duration: reduced ? 0 : 0.2 } : { type: "spring", stiffness: 500, damping: 35 }
      }
      className={cn(
        "w-full touch-none rounded-card border border-line bg-surface p-3 text-left transition-colors duration-hover ease-hover hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent",
        drag?.isDragging && "opacity-0",
        overlay && "shadow-card",
      )}
    >
      <span className="mb-3 block line-clamp-2 text-body">{task.title}</span>
      <span className="mb-2 flex items-baseline justify-between gap-2 text-label text-text-2">
        <span className="truncate">{task.capabilities.join(" · ")}</span>
        {(task.priority === "high" || task.priority === "urgent") && (
          <span className={cn("shrink-0", task.priority === "urgent" && "text-status-failed")}>
            ↑{priorityLabels[task.priority]}
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
