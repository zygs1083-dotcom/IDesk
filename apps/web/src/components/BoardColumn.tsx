import type { ReactNode } from "react";

export function BoardColumn({ title, count, icon, accent, onAdd, children }: { title: string; count: number; icon: ReactNode; accent?: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col flex-1 min-w-[250px] max-w-[360px] h-full rounded-2xl bg-surface-2/70 border border-line/60">
      <header className="flex items-center gap-2 px-3.5 h-11 shrink-0">
        <span className="grid place-items-center">{icon}</span>
        <span className="font-semibold text-[14px]" style={accent ? { color: accent } : undefined}>{title}</span>
        <span className="text-[12px] text-ink-3 font-medium">{count}</span>
        {onAdd && (
          <button onClick={onAdd} className="ml-auto size-7 rounded-md grid place-items-center text-ink-3 hover:bg-surface-3 hover:text-ink transition-colors" title="添加">＋</button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 flex flex-col gap-2">
        {count === 0 ? <div className="text-center text-[13px] text-ink-3 py-6">暂无事项</div> : children}
      </div>
    </section>
  );
}
