import { useAgents, useEvents } from "../lib/queries.ts";
import { EVENT_LABELS, fmtDateTime } from "../lib/format.ts";
import { PageHeader } from "../components/PageHeader.tsx";

export function ActivityPage() {
  const events = useEvents();
  const agents = useAgents();
  const nameOf = (id: string | null, kind: string) => kind === "human" ? "所有者" : kind === "system" ? "系统" : (agents.data?.find((a) => a.id === id)?.name ?? kind);
  return (
    <>
      <PageHeader title="活动" subtitle="所有事件的实时流" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="card max-w-3xl mx-auto divide-y divide-line" style={{ borderRadius: 16 }}>
          {(events.data ?? []).length === 0 && <div className="p-8 text-center text-ink-3 text-[13px]">还没有事件</div>}
          {events.data?.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-baseline gap-3 text-[14px]">
              <span className="font-medium">{nameOf(e.actorId, e.actorKind)}</span>
              <span className="text-ink-2">{EVENT_LABELS[e.type] ?? e.type}</span>
              {typeof e.payload.title === "string" && <span className="text-ink truncate">{e.payload.title}</span>}
              {typeof e.payload.subject === "string" && <span className="text-ink truncate">{e.payload.subject}</span>}
              {typeof e.payload.message === "string" && <span className="text-ink-2 truncate">“{e.payload.message}”</span>}
              <span className="ml-auto text-[12px] text-ink-3 shrink-0">{fmtDateTime(e.ts)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
