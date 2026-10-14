import type { Task } from "../lib/api.ts";
import { PRIORITY_META, countdown, timeAgo } from "../lib/format.ts";
import { AgentAvatar } from "./AgentAvatar.tsx";

export function TaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const p = PRIORITY_META[task.priority] ?? PRIORITY_META[1];
  const lease = task.status === "in_progress" ? countdown(task.leaseExpiresAt) : null;
  return (
    <button onClick={() => onOpen(task.id)} className="card w-full text-left p-3 hover:shadow-float hover:-translate-y-px transition-all fade-in group" style={{ borderRadius: 12 }}>
      <div className="flex items-start gap-2">
        {task.priority >= 2 && <span className="mt-[7px] size-1.5 rounded-full shrink-0" style={{ background: p.color }} title={p.label} />}
        <div className="font-medium leading-snug text-[14px] flex-1">{task.title}</div>
      </div>
      {(task.requiredCapabilities.length > 0 || task.tags.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.requiredCapabilities.map((c) => (
            <span key={c} className="chip" style={{ color: "var(--blue)", background: "color-mix(in srgb, var(--blue) 10%, transparent)" }}>{c}</span>
          ))}
          {task.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2.5 text-[12px] text-ink-3">
        {task.assignees.length > 0 ? (
          <span className="flex -space-x-1.5">{task.assignees.map((a) => <AgentAvatar key={a.agentId} name={a.name} size={20} />)}</span>
        ) : task.status === "recruiting" ? (
          <span className="text-purple">0 / {task.minAgents}</span>
        ) : null}
        {task.status === "recruiting" && task.assignees.length > 0 && <span className="text-purple">{task.assignees.length} / {task.minAgents}</span>}
        {lease && <span className={lease.includes("过期") ? "text-red" : "text-ink-3"}>{lease}</span>}
        {task.outcome && task.outcome !== "success" && <span className={task.outcome === "failed" ? "text-red" : "text-ink-3"}>{task.outcome === "failed" ? "失败" : "已取消"}</span>}
        <span className="ml-auto">{timeAgo(task.updatedAt)}</span>
      </div>
    </button>
  );
}
