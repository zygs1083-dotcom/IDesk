import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { PageHeader } from "../components/PageHeader.tsx";

export function SettingsPage() {
  const meta = useQuery({ queryKey: ["meta"], queryFn: () => api.get<{ version: string; plugins: { id: string; name: string; kind: string }[] }>("/meta") });
  return (
    <>
      <PageHeader title="设置" subtitle="连接器、插件、系统" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <section className="card p-5" style={{ borderRadius: 16 }}>
            <h2 className="font-semibold">已加载插件</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {meta.data?.plugins.length === 0 && <li className="text-ink-3 text-[13px]">无</li>}
              {meta.data?.plugins.map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-[14px]"><span className="chip">{p.kind}</span><span className="font-medium">{p.name}</span><span className="text-ink-3 font-mono text-[12px]">{p.id}</span></li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-2 mt-3">M3 在此配置连接器实例（地址、凭据、轮询间隔）并测试连接；M4 支持插件热重载与启停。</p>
          </section>
          <section className="card p-5" style={{ borderRadius: 16 }}>
            <h2 className="font-semibold">AI 接入速查</h2>
            <pre className="mt-3 p-3 rounded-xl bg-surface-2 font-mono text-[12px] overflow-x-auto">{`# 心跳（也会续约进行中任务）
curl -X POST -H "Authorization: Bearer idk_xxx" ${location.origin}/api/agents/me/heartbeat -H 'content-type: application/json' -d '{"presence":"online"}'
# 看适合我的任务
curl -H "Authorization: Bearer idk_xxx" "${location.origin}/api/tasks?fit=me&status=open,recruiting,assigned"
# 领取 / 汇报 / 完成
curl -X POST -H "Authorization: Bearer idk_xxx" ${location.origin}/api/tasks/<id>/claim
curl -X POST -H "Authorization: Bearer idk_xxx" ${location.origin}/api/tasks/<id>/progress -H 'content-type: application/json' -d '{"message":"50%"}'
curl -X POST -H "Authorization: Bearer idk_xxx" ${location.origin}/api/tasks/<id>/complete -H 'content-type: application/json' -d '{"outcome":"success","summary":"done"}'
# 转交 + 传递区
curl -X POST -H "Authorization: Bearer idk_xxx" ${location.origin}/api/tasks/<id>/handoff -H 'content-type: application/json' -d '{"toAgentId":"<agent>","context":"做到一半，分支 feat/x"}'
curl -H "Authorization: Bearer idk_xxx" "${location.origin}/api/relay?box=inbox&unread=1"`}</pre>
          </section>
        </div>
      </div>
    </>
  );
}
