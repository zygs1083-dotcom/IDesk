import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { ReactNode } from "react";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";

export function RunColumn({
  id,
  label,
  count,
  color,
  error,
  children,
}: {
  id: string;
  label: string;
  count: number;
  color: string;
  error: string | null;
  children: ReactNode;
}) {
  const { lang } = useLang();
  return (
    <section
      data-ui="task-folder"
      data-run-rack=""
      id={id}
      aria-label={label}
      className="flex min-h-0 min-w-column flex-1 flex-col gap-3 rounded-panel bg-surface-2 p-3"
    >
      <header data-ui="column-heading" className="flex shrink-0 items-center gap-2 px-1 py-1">
        <span data-ui="status-dot" className={cn("size-2 shrink-0 rounded-full", color)} />
        <h2 className="text-section">{label}</h2>
        <span data-ui="column-count" className="ml-auto text-label text-text-2 tabular-nums">
          {count}
        </span>
      </header>
      {error && (
        <p
          data-ui="run-error"
          role="alert"
          className="pixel-only text-secondary text-status-failed"
        >
          {error}
        </p>
      )}
      <div
        data-ui="run-cards"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1 [&>*]:shrink-0"
      >
        {count === 0 ? (
          <p data-ui="column-empty" className="pixel-only">
            {lang === "zh" ? "空" : "Empty"}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export const runColumns: Record<
  z.infer<typeof automationRunWithJobSchema>["status"],
  "waiting" | "running" | "completed" | "failed"
> = {
  waiting: "waiting",
  running: "running",
  success: "completed",
  failed: "failed",
  canceled: "completed",
};
