import { useState } from "react";
import { AGENT_KINDS } from "@idesk/core";
import { api, type Agent } from "../lib/api.ts";
import { useAgents, useInvalidateAll } from "../lib/queries.ts";
import { timeAgo } from "../lib/format.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import { AgentAvatar } from "../components/AgentAvatar.tsx";
import { Modal } from "../components/Modal.tsx";

export function AgentsPage() {
  const agents = useAgents();
  const invalidate = useInvalidateAll();
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ name: string; key: string } | null>(null);

  const rotate = async (a: Agent) => {
    const r = await api.post<{ apiKey: string }>(`/agents/${a.id}/rotate-key`);
    setIssuedKey({ name: a.name, key: r.apiKey });
    invalidate();
  };
  const toggle = async (a: Agent) => { await api.patch(`/agents/${a.id}`, { disabled: !a.disabled }); invalidate(); };
  const remove = async (a: Agent) => { await api.delete(`/agents/${a.id}`); invalidate(); };

  const list = agents.data ?? [];
  return (
    <>
      <PageHeader title="设备与 AI" subtitle={`${list.filter((a) => a.online).length} 在线 / ${list.length} 已注册`} actions={<button className="btn btn-primary" onClick={() => setCreating(true)}>添加 AI</button>} />
      <div className="flex-1 overflow-y-auto p-6">
        {list.length === 0 ? (
          <div className="card p-10 text-center max-w-xl mx-auto" style={{ borderRadius: 20 }}>
            <div className="text-[17px] font-semibold">还没有 AI 接入</div>
            <p className="text-ink-2 text-[14px] mt-2">点击「添加 AI」生成 API Key，然后在那台设备上用 REST 或 MCP 接入；也可以设置 <code className="font-mono text-[12px]">IDESK_REGISTRATION_TOKEN</code> 让设备自注册。</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {list.map((a) => (
              <div key={a.id} className={`card p-4 flex flex-col gap-3 fade-in ${a.disabled ? "opacity-60" : ""}`} style={{ borderRadius: 16 }}>
                <div className="flex items-center gap-3">
                  <AgentAvatar name={a.name} size={38} online={a.online} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="text-[12px] text-ink-3 truncate">{a.kind}{a.host ? ` · ${a.host}` : ""}</div>
                  </div>
                  <div className="ml-auto text-[12px] text-right">
                    <div className={a.online ? "text-green font-medium" : "text-ink-3"}>{a.disabled ? "已停用" : a.online ? (a.presence === "busy" ? "忙碌" : "在线") : "离线"}</div>
                    <div className="text-ink-3">{a.lastSeenAt ? timeAgo(a.lastSeenAt) : "从未连接"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[22px]">
                  {a.capabilities.length === 0 ? <span className="text-[12px] text-ink-3">未声明能力</span> : a.capabilities.map((c) => <span key={c} className="chip" style={{ color: "var(--blue)", background: "color-mix(in srgb, var(--blue) 10%, transparent)" }}>{c}</span>)}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-ink-3">
                  <span className="font-mono">{a.apiKeyPrefix}…</span>
                  <span>· 并发 {a.maxConcurrent}</span>
                  <div className="ml-auto flex gap-1">
                    <button className="btn btn-ghost h-7 px-2.5 text-[12px]" onClick={() => rotate(a)}>重置 Key</button>
                    <button className="btn btn-ghost h-7 px-2.5 text-[12px]" onClick={() => toggle(a)}>{a.disabled ? "启用" : "停用"}</button>
                    <button className="btn btn-ghost h-7 px-2.5 text-[12px] text-red" onClick={() => remove(a)}>删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateAgentDialog open={creating} onClose={() => setCreating(false)} onCreated={(name, key) => { setCreating(false); setIssuedKey({ name, key }); }} />
      <Modal open={!!issuedKey} onClose={() => setIssuedKey(null)} title="API Key 只显示一次">
        <p className="text-[14px] text-ink-2">把它配置到 <b className="text-ink">{issuedKey?.name}</b> 所在设备上。关闭后无法再次查看，只能重置。</p>
        <pre className="mt-3 p-3 rounded-xl bg-surface-2 font-mono text-[13px] break-all whitespace-pre-wrap select-all">{issuedKey?.key}</pre>
        <pre className="mt-3 p-3 rounded-xl bg-surface-2 font-mono text-[12px] text-ink-2 overflow-x-auto">{`curl -H "Authorization: Bearer ${issuedKey?.key}" \\\n  ${location.origin}/api/tasks?fit=me`}</pre>
        <div className="flex justify-end mt-4"><button className="btn btn-primary" onClick={() => setIssuedKey(null)}>我已保存</button></div>
      </Modal>
    </>
  );
}

function CreateAgentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string, key: string) => void }) {
  const invalidate = useInvalidateAll();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("claude-code");
  const [host, setHost] = useState("");
  const [caps, setCaps] = useState("");
  const [maxConcurrent, setMax] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.post<{ agent: Agent; apiKey: string }>("/agents", { name, kind, host, maxConcurrent, capabilities: caps.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean) });
      invalidate(); setName(""); setCaps(""); setHost(""); onCreated(r.agent.name, r.apiKey);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };
  return (
    <Modal open={open} onClose={onClose} title="添加 AI / 设备">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="input" placeholder="名称，如 claude-code@qyunt-orca" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">类型
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{AGENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
          </label>
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">最大并发任务
            <input className="input" type="number" min={1} value={maxConcurrent} onChange={(e) => setMax(Number(e.target.value))} />
          </label>
        </div>
        <input className="input" placeholder="所在设备 / 主机（可选）" value={host} onChange={(e) => setHost(e.target.value)} />
        <input className="input" placeholder="能力标签，逗号分隔：coding, browser, gpu, macos" value={caps} onChange={(e) => setCaps(e.target.value)} />
        {error && <div className="text-red text-[13px]">{error}</div>}
        <div className="flex justify-end gap-2 pt-1"><button type="button" className="btn btn-ghost" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={!name.trim()}>生成 API Key</button></div>
      </form>
    </Modal>
  );
}
