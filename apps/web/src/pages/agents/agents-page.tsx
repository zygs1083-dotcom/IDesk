import { Fragment, useState } from "react";
import { Button } from "../../components/button.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { AgentDetails } from "./agent-details.tsx";
import { CreateAgent } from "./create-agent.tsx";

export function AgentsPage() {
  const { agents, error, isPending } = useAgents();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader title="智能体">
        <Button variant="primary" onClick={() => setCreating(true)}>
          新建
        </Button>
      </PageHeader>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && agents.length === 0 ? (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>还没有智能体</p>
          <Button className="mt-3" onClick={() => setCreating(true)}>
            新建一个
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-secondary">
            <thead className="border-b border-line text-label text-text-2">
              <tr>
                {["名称", "类型", "主机", "能力", "最近活跃", "Webhook"].map((label) => (
                  <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <Fragment key={agent.id}>
                  <tr
                    className="group h-10 cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2"
                    onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}
                  >
                    <td className="px-1 py-0">
                      <Button
                        aria-expanded={expanded === agent.id}
                        className="justify-start gap-2 whitespace-nowrap border-0 text-body group-hover:bg-surface-2"
                      >
                        <span
                          title={agent.status === "online" ? "在线" : "离线"}
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            agent.status === "online" ? "bg-status-done" : "bg-status-open",
                          )}
                        />
                        {agent.name}
                      </Button>
                    </td>
                    <td className="px-4 py-2 text-text-2">{agent.kind}</td>
                    <td className="px-4 py-2">{agent.host || "—"}</td>
                    <td className="px-4 py-2 text-text-2">
                      {agent.capabilities.join(" · ") || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-text-2">
                      {agent.lastSeenAt ? relativeTime(new Date(agent.lastSeenAt)) : "—"}
                    </td>
                    <td className="px-4 py-2 text-text-2">
                      <span
                        className="block max-w-40 truncate"
                        title={agent.webhookUrl ?? undefined}
                      >
                        {agent.webhookUrl ? new URL(agent.webhookUrl).hostname : "—"}
                      </span>
                    </td>
                  </tr>
                  {expanded === agent.id && (
                    <tr className="border-b border-line bg-surface-2">
                      <td colSpan={6} className="p-4">
                        <AgentDetails agentId={agent.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateAgent onClose={() => setCreating(false)} />}
    </div>
  );
}
