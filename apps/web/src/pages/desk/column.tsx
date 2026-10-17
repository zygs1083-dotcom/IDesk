import { useDroppable } from "@dnd-kit/core";
import { labels } from "@idesk/shared/labels";
import type { TaskStatus } from "@idesk/shared/task-status";
import type { ReactNode } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { StatusDot } from "./status-dot.tsx";

export function Column({
  status,
  count,
  legal,
  children,
}: {
  status: TaskStatus;
  count: number;
  legal: boolean;
  children: ReactNode;
}) {
  const { lang } = useLang();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      id={`task-column-${status}`}
      ref={setNodeRef}
      aria-label={labels(lang).status[status]}
      className={cn(
        "flex min-w-column flex-1 flex-col gap-3 rounded-panel bg-surface-2 p-3",
        isOver && legal && "outline-1 outline-accent",
      )}
    >
      <header
        data-ui="column-heading"
        className={cn("flex items-center gap-2 px-1 py-1", !legal && "text-text-3")}
      >
        <StatusDot status={status} muted={!legal} />
        <h2 className="text-section">{labels(lang).status[status]}</h2>
        <span
          className={cn("ml-auto text-label tabular-nums", legal ? "text-text-2" : "text-text-3")}
        >
          {count}
        </span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
