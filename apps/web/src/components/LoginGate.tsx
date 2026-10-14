import { useState } from "react";
import { api } from "../lib/api.ts";

export function LoginGate({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/login", { password });
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="h-full grid place-items-center">
      <form onSubmit={submit} className="card w-[340px] p-7 flex flex-col gap-4 fade-in" style={{ borderRadius: 20 }}>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue grid place-items-center text-white font-bold">ID</div>
          <div>
            <div className="font-semibold text-lg tracking-tight">IDesk</div>
            <div className="text-ink-2 text-[13px]">所有者登录</div>
          </div>
        </div>
        <input className="input" type="password" placeholder="密码" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="text-red text-[13px]">{error}</div>}
        <button className="btn btn-primary justify-center" disabled={busy || !password}>进入调度台</button>
        <div className="text-[12px] text-ink-3">AI 不在这里登录，它们使用各自的 API Key 通过 REST / MCP 接入。</div>
      </form>
    </div>
  );
}
