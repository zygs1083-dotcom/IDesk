import { Fragment, useState } from "react";
import { Button } from "../../components/button.tsx";
import { Menu } from "../../components/menu.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Agent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { AgentDetails } from "./agent-details.tsx";
import { CreateAgent } from "./create-agent.tsx";
import { DeleteAgent } from "./delete-agent.tsx";

export function AgentsPage() {
  const { lang, t } = useLang();
  const { agents, error, isPending } = useAgents();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  useShortcut("n", () => setCreating(true));
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.agents")}>
        <Button variant="primary" onClick={() => setCreating(true)}>
          {t("common.create")}
        </Button>
      </PageHeader>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && agents.length === 0 ? (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>{t("agents.empty")}</p>
          <Button className="mt-3" onClick={() => setCreating(true)}>
            {t("common.createOne")}
          </Button>
        </div>
      ) : (
        <div className="-mb-24 overflow-x-auto pb-24">
          <div className="rounded-panel border border-line bg-surface">
            <table className="w-full text-left text-secondary">
              <thead className="border-b border-line text-label text-text-2">
                <tr>
                  {[
                    t("common.name"),
                    t("common.type"),
                    t("common.host"),
                    t("common.capabilities"),
                    t("agents.lastActive"),
                    "Webhook",
                    "",
                  ].map((label) => (
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
                            title={
                              agent.status === "online" ? t("common.online") : t("common.offline")
                            }
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
                        {agent.lastSeenAt ? relativeTime(new Date(agent.lastSeenAt), lang) : "—"}
                      </td>
                      <td className="px-4 py-2 text-text-2">
                        <span
                          className="block max-w-40 truncate"
                          title={agent.webhookUrl ?? undefined}
                        >
                          {agent.webhookUrl ? new URL(agent.webhookUrl).hostname : "—"}
                        </span>
                      </td>
                      <td
                        className="px-2 py-0"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Menu
                          label={t("common.actionsFor", { name: agent.name })}
                          items={[
                            { label: t("common.edit"), onSelect: () => setEditing(agent) },
                            {
                              label: t("common.delete"),
                              danger: true,
                              onSelect: () => setDeleting(agent),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                    {expanded === agent.id && (
                      <tr className="border-b border-line bg-surface-2">
                        <td colSpan={7} className="p-4">
                          <AgentDetails agentId={agent.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && <CreateAgent agent={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteAgent agent={deleting} onClose={() => setDeleting(null)} />}
      {creating && <CreateAgent onClose={() => setCreating(false)} />}
    </div>
  );
}
