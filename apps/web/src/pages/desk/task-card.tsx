import type { useDraggable } from "@dnd-kit/core";
import { labels } from "@idesk/shared/labels";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { StatusDot } from "./status-dot.tsx";
import { TaskCardClock } from "./task-card-clock.tsx";
import { TaskPrBadges } from "./task-pr-badges.tsx";

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
    "attributes" | "listeners" | "setNodeRef" | "setActivatorNodeRef" | "isDragging"
  >;
}) {
  const { lang, t } = useLang();
  const reduced = useReducedMotion();
  const { data: events = [] } = useQuery({
    queryKey: ["task", task.id, "events"],
    queryFn: () => request<TaskEvent[]>(`/tasks/${task.id}/events`),
  });
  const expiring =
    task.status === "in_progress" &&
    task.leaseExpiresAt !== null &&
    new Date(task.leaseExpiresAt).getTime() - Date.now() < 120000;
  return (
    <motion.div
      data-ui="card"
      data-dragging={drag?.isDragging ? "true" : undefined}
      data-status={task.status}
      ref={drag?.setNodeRef}
      layout={!reduced && !overlay}
      initial={reduced || !entering ? false : { opacity: 0 }}
      animate={{ opacity: 1, x: shake && !reduced ? [0, -6, 6, -4, 4, 0] : 0 }}
      transition={{
        opacity: { duration: reduced ? 0 : 0.2 },
        x: { duration: reduced ? 0 : 0.2 },
        layout: { type: "spring", stiffness: 500, damping: 35 },
      }}
      className={cn(
        "relative w-full rounded-card border border-line bg-surface p-3 text-left transition-colors duration-hover ease-hover hover:bg-surface-2 focus-within:outline-2 focus-within:outline-accent",
        drag?.isDragging && "opacity-0",
        overlay && "shadow-card",
      )}
    >
      <button
        type="button"
        ref={drag?.setActivatorNodeRef}
        {...drag?.attributes}
        {...drag?.listeners}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !drag?.isDragging) {
            event.preventDefault();
            onOpen();
          } else {
            drag?.listeners?.onKeyDown?.(event);
          }
        }}
        onClick={onOpen}
        className={cn(
          "block w-full cursor-pointer text-left after:absolute after:inset-0 focus-visible:outline-none",
          drag && "touch-none",
        )}
      >
        <span data-ui="card-title" className="mb-2 line-clamp-2 text-body">
          {blockers > 0 && (
            <span className="mr-2 inline-flex items-center gap-1 text-text-3 tabular-nums">
              <PixelIcon name="lock" fallback={<Lock size={16} strokeWidth={1.5} />} />
              <span aria-hidden="true">{blockers}</span>
              <span className="sr-only">{t("desk.blockers", { count: blockers })}</span>
            </span>
          )}
          {task.title}
        </span>
        {task.status === "recruiting" && task.recruit && (
          <span className="mb-2 block text-label text-text-2 tabular-nums">
            {task.recruit.joined.length} / {task.recruit.needed} {t("desk.joined")}
          </span>
        )}
        {task.status === "assigned" && handoff && (
          <span className="mb-2 block truncate text-label text-text-2">
            ← {handoff} {t("common.handoff")}
          </span>
        )}
        {(task.status === "in_progress" || task.status === "done") && (
          <TaskCardClock task={task} events={events} />
        )}
        <span className="flex items-center gap-2 text-label">
          <StatusDot status={task.status} />
          <span className="min-w-0 flex-1 truncate text-text-2">{name}</span>
          <span
            className={cn("shrink-0 tabular-nums", expiring ? "text-status-paused" : "text-text-2")}
          >
            {relativeTime(new Date(task.updatedAt), lang)}
          </span>
        </span>
      </button>
      <span className="mt-2 flex flex-wrap items-start gap-2">
        <span className="flex min-w-0 max-w-full items-baseline gap-2 text-label text-text-2">
          <span className="truncate">{task.capabilities.join(" · ")}</span>
          {(task.priority === "high" || task.priority === "urgent") && (
            <span className={cn("shrink-0", task.priority === "urgent" && "text-status-failed")}>
              ↑{labels(lang).priority[task.priority]}
            </span>
          )}
        </span>
        <TaskPrBadges result={task.result} events={events} />
      </span>
    </motion.div>
  );
}
