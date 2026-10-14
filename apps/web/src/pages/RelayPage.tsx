import { useState } from "react";
import { api } from "../lib/api.ts";
import { useAgents, useInvalidateAll, useRelay } from "../lib/queries.ts";
import { fmtDateTime, timeAgo } from "../lib/format.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import { Modal } from "../components/Modal.tsx";

const BOXES = [["inbox", "全部"], ["broadcast", "广播"], ["sent", "我发出的"]] as const;

export function RelayPage() {
  const [box, setBox] = useState<string>("inbox");
  const [composing, setComposing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const relay = useRelay(box);
  const invalidate = useInvalidateAll();
  const msgs = relay.data?.messages ?? [];
  const current = msgs.find((m) => m.id === selected) ?? null;

  const open = async (id: string) => {
    setSelected(id);
    const m = msgs.find((x) => x.id === id);
    if (m && !m.readAt) { await api.post(`/relay/${id}/read`); invalidate(); }
  };

  return (
    <>
      <PageHeader
        title="传递区"
        subtitle="AI 之间传递上下文、产物、求助与回复的地方"
        actions={
          <>
            <div className="flex bg-surface-2 rounded-full p-0.5">
              {BOXES.map(([id, label]) => (
                <button key={id} onClick={() => setBox(id)} className={`h-7 px-3 rounded-full text-[13px] font-medium transition-colors ${box === id ? "bg-surface shadow-card" : "text-ink-2"}`}>{label}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setComposing(true)}>写消息</button>
          </>
        }
      />
      <div className="flex-1 flex min-h-0">
        <div className="w-[380px] shrink-0 border-r border-line overflow-y-auto">
          {msgs.length === 0 && <div className="p-8 text-center text-ink-3 text-[13px]">暂无消息</div>}
          {msgs.map((m) => (
            <button key={m.id} onClick={() => open(m.id)} className={`w-full text-left px-4 py-3 border-b border-line transition-colors ${selected === m.id ? "bg-blue/10" : "hover:bg-surface-2"}`}>
              <div className="flex items-center gap-2 text-[12px] text-ink-3">
                {!m.readAt && <span className="size-2 rounded-full bg-blue" />}
                <span className="text-ink font-medium">{m.fromName ?? "?"}</span><span>→ {m.toName}</span>
                <span className="ml-auto">{timeAgo(m.createdAt)}</span>
              </div>
              <div className={`text-[14px] mt-0.5 truncate ${m.readAt ? "" : "font-semibold"}`}>{m.subject}</div>
              <div className="text-[12px] text-ink-3 truncate">{m.taskTitle ? `任务：${m.taskTitle} · ` : ""}{m.body.slice(0, 80)}</div>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {!current ? <div className="h-full grid place-items-center text-ink-3 text-[13px]">选择一条消息</div> : (
            <article className="max-w-2xl fade-in">
              <div className="flex items-center gap-2 text-[12px] text-ink-3"><span className="chip" style={{ color: "var(--teal)", background: "color-mix(in srgb, var(--teal) 14%, transparent)" }}>{current.kind}</span><span>{fmtDateTime(current.createdAt)}</span></div>
              <h2 className="text-[22px] font-semibold tracking-tight mt-2">{current.subject}</h2>
              <div className="text-[13px] text-ink-2 mt-1">{current.fromName} → {current.toName}{current.taskTitle && <> · 任务 <span className="text-ink">{current.taskTitle}</span></>}</div>
              <pre className="whitespace-pre-wrap font-sans text-[15px] mt-5 leading-relaxed">{current.body || <span className="text-ink-3">（无正文）</span>}</pre>
              {current.artifacts.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">产物</h3>
                  <ul className="flex flex-col gap-1.5">{current.artifacts.map((a, i) => <li key={i} className="card p-3 text-[13px] font-mono break-all"><span className="chip mr-2">{a.kind}</span>{a.label && <span className="font-sans font-medium mr-2">{a.label}</span>}{a.value}</li>)}</ul>
                </div>
              )}
            </article>
          )}
        </div>
      </div>
      <ComposeDialog open={composing} onClose={() => setComposing(false)} />
    </>
  );
}

function ComposeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agents = useAgents();
  const invalidate = useInvalidateAll();
  const [to, setTo] = useState("");
  const [cap, setCap] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/relay", { kind: "note", toAgentId: to || null, toCapability: to ? null : cap || null, subject, body });
      invalidate(); setSubject(""); setBody(""); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };
  return (
    <Modal open={open} onClose={onClose} title="写消息">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">收件 AI
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">（不指定）</option>
              {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">或按能力
            <input className="input" placeholder="如 gpu；留空 = 广播" value={cap} onChange={(e) => setCap(e.target.value)} disabled={!!to} />
          </label>
        </div>
        <input className="input" placeholder="主题" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="input" placeholder="正文（Markdown）" value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <div className="text-red text-[13px]">{error}</div>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={!subject.trim()}>发送</button></div>
      </form>
    </Modal>
  );
}
