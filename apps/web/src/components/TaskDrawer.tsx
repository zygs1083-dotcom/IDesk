import { useState } from "react";
import { TASK_ACTION_LABELS, type TaskAction } from "@idesk/core";
import { api } from "../lib/api.ts";
import { useAgents, useInvalidateAll, useTask, useTaskAction } from "../lib/queries.ts";
import { EVENT_LABELS, PRIORITY_META, STATUS_META, fmtDateTime, timeAgo } from "../lib/format.ts";
import { StatusDot } from "./StatusDot.tsx";
import { AgentAvatar } from "./AgentAvatar.tsx";

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const q = useTask(taskId);
  const agents = useAgents();
  const act = useTaskAction();
  const invalidate = useInvalidateAll();
  const [assignTo, setAssignTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!taskId) return null;
  const t = q.data;

  const run = async (action: TaskAction, body?: unknown) => {
    setError(null);
    try { await act.mutateAsync({ id: taskId, action, body }); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const sendNote = async () => {
    if (!note.trim() || !t) return;
    try { await api.post("/relay", { kind: "note", taskId, subject: `关于：${t.title}`, body: note }); setNote(""); invalidate(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const remove = async () => { try { await api.delete(`/tasks/${taskId}`); invalidate(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } };

  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <aside className="slide-in absolute right-0 top-0 h-full w-[520px] max-w-full bg-surface border-l border-line shadow-float overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        {!t ? <div className="p-6 text-ink-3">加载中…</div> : (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <StatusDot status={t.status} size={18} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium" style={{ color: STATUS_META[t.status].color }}>{STATUS_META[t.status].label}{t.outcome && t.outcome !== "success" ? ` · ${t.outcome === "failed" ? "失败" : "已取消"}` : ""}</div>
                <h2 className="text-[19px] font-semibold tracking-tight leading-snug">{t.title}</h2>
                <div className="text-[12px] text-ink-3 mt-1">由 {t.publisherName ?? t.publisherKind} 发布 · {timeAgo(t.createdAt)} · 优先级 {PRIORITY_META[t.priority]?.label}</div>
              </div>
              <button onClick={onClose} className="size-7 rounded-full bg-surface-2 text-ink-2 grid place-items-center hover:bg-surface-3">✕</button>
            </div>

            {(t.requiredCapabilities.length > 0 || t.tags.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {t.requiredCapabilities.map((c) => <span key={c} className="chip" style={{ color: "var(--blue)", background: "color-mix(in srgb, var(--blue) 10%, transparent)" }}>{c}</span>)}
                {t.tags.map((x) => <span key={x} className="chip">#{x}</span>)}
              </div>
            )}

            {t.description && <pre className="whitespace-pre-wrap font-sans text-[14px] text-ink-2 bg-surface-2 rounded-xl p-3.5">{t.description}</pre>}

            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">参与者 {t.status === "recruiting" && `${t.assignees.length}/${t.minAgents}`}</h3>
              {t.assignees.length === 0 ? <div className="text-[13px] text-ink-3">尚无参与者</div> : (
                <div className="flex flex-col gap-1.5">{t.assignees.map((a) => (
                  <div key={a.agentId} className="flex items-center gap-2 text-[14px]"><AgentAvatar name={a.name} size={22} /><span>{a.name}</span><span className="chip">{a.role === "owner" ? "负责" : "成员"}</span><span className="ml-auto text-[12px] text-ink-3">{timeAgo(a.joinedAt)}</span></div>
                ))}</div>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide">操作</h3>
              <div className="flex flex-wrap gap-2">
                {t.availableActions.filter((a) => a !== "assign" && a !== "handoff").map((a) => (
                  <button key={a} className={`btn ${a === "cancel" ? "btn-danger" : a === "complete" || a === "start" ? "btn-primary" : "btn-soft"}`} disabled={act.isPending} onClick={() => run(a, a === "complete" ? { outcome: "success" } : undefined)}>{TASK_ACTION_LABELS[a]}</button>
                ))}
                <button className="btn btn-danger" onClick={remove}>删除</button>
              </div>
              {t.availableActions.includes("assign") && (
                <div className="flex gap-2">
                  <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">指定给…</option>
                    {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.name}{a.online ? "" : "（离线）"}</option>)}
                  </select>
                  <button className="btn btn-soft" disabled={!assignTo || act.isPending} onClick={() => run("assign", { agentId: assignTo })}>指定</button>
                </div>
              )}
              {error && <div className="text-red text-[13px]">{error}</div>}
            </section>

            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">传递区 · 本任务线程</h3>
              <div className="flex flex-col gap-2">
                {t.relay.length === 0 && <div className="text-[13px] text-ink-3">还没有消息。AI 交接、求助、留言都会出现在这里。</div>}
                {t.relay.slice().reverse().map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface-2 p-3">
                    <div className="flex items-center gap-2 text-[12px] text-ink-3"><span className="chip" style={{ color: "var(--teal)", background: "color-mix(in srgb, var(--teal) 14%, transparent)" }}>{m.kind}</span><span className="text-ink">{m.fromName ?? "?"}</span><span>→ {m.toName}</span><span className="ml-auto">{timeAgo(m.createdAt)}</span></div>
                    <div className="font-medium text-[14px] mt-1">{m.subject}</div>
                    {m.body && <pre className="whitespace-pre-wrap font-sans text-[13px] text-ink-2 mt-1">{m.body}</pre>}
                    {m.artifacts.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{m.artifacts.map((a, i) => <span key={i} className="chip font-mono" title={a.value}>{a.kind}: {a.label ?? a.value.slice(0, 40)}</span>)}</div>}
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="input" placeholder="给参与者留言…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendNote()} />
                  <button className="btn btn-soft" onClick={sendNote} disabled={!note.trim()}>发送</button>
                </div>
              </div>
            </section>

            {t.result != null || t.summary ? (
              <section>
                <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">结果</h3>
                {t.summary && <pre className="whitespace-pre-wrap font-sans text-[14px]">{t.summary}</pre>}
                {t.result != null && <pre className="text-[12px] font-mono bg-surface-2 rounded-xl p-3 overflow-x-auto">{JSON.stringify(t.result, null, 2)}</pre>}
              </section>
            ) : null}

            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">时间线</h3>
              <ol className="flex flex-col gap-2 border-l border-line ml-1.5 pl-4">
                {t.events.map((e) => (
                  <li key={e.id} className="text-[13px] relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-line-strong" />
                    <span className="text-ink">{e.actorKind === "human" ? "所有者" : e.actorKind === "system" ? "系统" : (agents.data?.find((a) => a.id === e.actorId)?.name ?? e.actorKind)}</span>
                    <span className="text-ink-2"> {EVENT_LABELS[e.type] ?? e.type}</span>
                    {typeof e.payload.message === "string" && <div className="text-ink-2 bg-surface-2 rounded-lg px-2.5 py-1.5 mt-1">{e.payload.message}</div>}
                    <div className="text-[11px] text-ink-3">{fmtDateTime(e.ts)}</div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
