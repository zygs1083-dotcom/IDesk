import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="glass sticky top-0 z-10 border-b border-line px-6 h-14 flex items-center gap-4 shrink-0">
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <span className="text-[13px] text-ink-3 truncate">{subtitle}</span>}
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  );
}
