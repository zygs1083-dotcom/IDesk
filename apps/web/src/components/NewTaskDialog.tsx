import { useState } from "react";
import { api } from "../lib/api.ts";
import { useAgents, useInvalidateAll } from "../lib/queries.ts";
import { Modal } from "./Modal.tsx";

const splitList = (s: string) => s.split(/[,，\s]+/).map((x) => x.trim()).filter(Boolean);

export function NewTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agents = useAgents();
  const invalidate = useInvalidateAll();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [caps, setCaps] = useState("");
  const [tags, setTags] = useState("");
  const [minAgents, setMinAgents] = useState(1);
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setPriority(1); setCaps(""); setTags(""); setMinAgents(1); setAssigneeId(""); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post("/tasks", { title, description, priority, requiredCapabilities: splitList(caps), tags: splitList(tags), minAgents, assigneeId: assigneeId || null });
      invalidate(); reset(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "发布失败"); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="发布任务">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="input" placeholder="任务标题" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <textarea className="input" placeholder="任务说明（Markdown，写给 AI 看的）" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">优先级
            <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={0}>低</option><option value={1}>普通</option><option value={2}>高</option><option value={3}>紧急</option>
            </select>
          </label>
          <label className="text-[13px] text-ink-2 flex flex-col gap-1">需要的参与者数
            <input className="input" type="number" min={1} max={20} value={minAgents} onChange={(e) => setMinAgents(Number(e.target.value))} />
          </label>
        </div>
        <label className="text-[13px] text-ink-2 flex flex-col gap-1">所需能力（逗号分隔，如 coding, browser, gpu）
          <input className="input" value={caps} onChange={(e) => setCaps(e.target.value)} />
        </label>
        <label className="text-[13px] text-ink-2 flex flex-col gap-1">标签
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label className="text-[13px] text-ink-2 flex flex-col gap-1">直接指定给
          <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">不指定，放到待领取</option>
            {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.name}{a.online ? "" : "（离线）"}</option>)}
          </select>
        </label>
        {error && <div className="text-red text-[13px]">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" disabled={busy || !title.trim()}>发布</button>
        </div>
      </form>
    </Modal>
  );
}
