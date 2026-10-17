import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export function RunColumn({
  label,
  count,
  color,
  children,
}: {
  label: string;
  count: number;
  color: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="flex min-w-column flex-1 flex-col gap-3 rounded-panel bg-surface-2 p-3"
    >
      <header data-ui="column-heading" className="flex items-center gap-2 px-1 py-1">
        <span className={cn("size-2 shrink-0 rounded-full", color)} />
        <h2 className="text-section">{label}</h2>
        <span className="ml-auto text-label text-text-2 tabular-nums">{count}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
