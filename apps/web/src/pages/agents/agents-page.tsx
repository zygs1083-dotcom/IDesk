import { AGENT_KIND_LABELS, AGENT_KINDS } from "@idesk/shared/agent-schemas";
import { Fragment, useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Menu } from "../../components/menu.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Agent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { AgentDetails } from "./agent-details.tsx";
import { CreateAgent } from "./create-agent.tsx";
import { DeleteAgent } from "./delete-agent.tsx";
import { RotateAgentKey } from "./rotate-agent-key.tsx";

export function AgentsPage() {
  const { isAdmin } = useSession();
  const { lang, t } = useLang();
  const { agents, error, isPending } = useAgents();
  const [kind, setKind] = useState("");
  const [rotating, setRotating] = useState<Agent | null>(null);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const visibleAgents = agents.filter((agent) => !kind || agent.kind === kind);
  useShortcut("n", () => {
    if (isAdmin) setCreating(true);
  });
  return (
    <div data-scene="agents" className="space-y-6">
      <PageHeader
        title={t("nav.agents")}
        toolbar={
          <label className="flex items-center gap-2 text-secondary text-text-2">
            {t("common.type")}
            <select
              className="rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              {AGENT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {AGENT_KIND_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <Button disabled={!isAdmin} variant="primary" onClick={() => setCreating(true)}>
          <span className="pixel-only">
            <PixelIcon name="plus" />
          </span>
          <span className="pixel-only">{t("agents.create")}</span>
          <span className="pixel-legacy">{t("common.create")}</span>
        </Button>
      </PageHeader>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && visibleAgents.length === 0 ? (
        <div data-ui="empty-note" className="py-16 text-center text-secondary text-text-2">
          <p>{t("agents.empty")}</p>
          <Button disabled={!isAdmin} className="mt-3" onClick={() => setCreating(true)}>
            {t("common.createOne")}
          </Button>
        </div>
      ) : (
        <div data-ui="agent-list-scroll" className="-mb-24 overflow-x-auto pb-24">
          <div data-ui="panel" className="rounded-panel border border-line bg-surface">
            <table className="w-full text-left text-secondary">
              <thead className="border-b border-line text-label text-text-2">
                <tr>
                  {[
                    lang === "zh" ? "状态" : "Status",
                    t("common.name"),
                    t("common.type"),
                    t("common.host"),
                    t("common.capabilities"),
                    t("agents.lastActive"),
                    "Webhook",
                    "",
                  ].map((label, index) => (
                    <th
                      key={label}
                      data-ui={
                        index === 0
                          ? "agent-status-col"
                          : index === 2
                            ? "agent-kind-col"
                            : undefined
                      }
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleAgents.map((agent) => (
                  <Fragment key={agent.id}>
                    <tr
                      className="group h-10 cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2"
                      onClick={() => {
                        if (document.documentElement.dataset.skin !== "pixel")
                          setExpanded(expanded === agent.id ? null : agent.id);
                      }}
                    >
                      <td data-ui="agent-status-col" className="px-4 py-2">
                        <span data-ui="list-status" data-status={agent.status}>
                          <PixelIcon name={agent.status === "online" ? "check" : "pause"} />
                          {t(agent.status === "online" ? "common.online" : "common.offline")}
                        </span>
                      </td>
                      <td className="px-2 py-0">
                        <Button
                          variant="ghost"
                          aria-expanded={expanded === agent.id}
                          onClick={() => {
                            if (document.documentElement.dataset.skin === "pixel")
                              setSelected(agent);
                          }}
                          className="max-w-52 justify-start text-left"
                        >
                          <span
                            data-ui="classic-agent-status-dot"
                            title={
                              agent.status === "online" ? t("common.online") : t("common.offline")
                            }
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              agent.status === "online" ? "bg-status-done" : "bg-status-open",
                            )}
                          />
                          <span data-ui="kind-avatar" aria-hidden="true">
                            {agent.kind.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 truncate">{agent.name}</span>
                        </Button>
                        <span
                          data-ui="pixel-kind-caption"
                          className="block pl-3 text-label text-text-2"
                        >
                          {AGENT_KIND_LABELS[agent.kind]}
                        </span>
                      </td>
                      <td data-ui="agent-kind-col" className="px-4 py-2 text-text-2">
                        {AGENT_KIND_LABELS[agent.kind]}
                      </td>
                      <td data-label={t("common.host")} className="px-4 py-2">
                        {agent.host || "—"}
                      </td>
                      <td data-label={t("common.capabilities")} className="px-4 py-2 text-text-2">
                        <span className="pixel-legacy">
                          {agent.capabilities.join(" · ") || "—"}
                        </span>
                        <span data-ui="capability-tags" className="pixel-only">
                          {agent.capabilities.length
                            ? agent.capabilities.map((capability) => (
                                <span key={capability}>{capability}</span>
                              ))
                            : "—"}
                        </span>
                      </td>
                      <td
                        data-label={t("agents.lastActive")}
                        className="whitespace-nowrap px-4 py-2 tabular-nums text-text-2"
                      >
                        {agent.lastSeenAt ? relativeTime(new Date(agent.lastSeenAt), lang) : "—"}
                      </td>
                      <td data-label="Webhook" className="px-4 py-2 text-text-2">
                        <span
                          className="block max-w-40 truncate"
                          title={agent.webhookUrl ? t("common.secretConfigured") : undefined}
                        >
                          {agent.webhookUrl ? t("common.secretConfigured") : "—"}
                        </span>
                      </td>
                      <td
                        className="px-2 py-0"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Menu
                          disabled={!isAdmin}
                          label={t("common.actionsFor", { name: agent.name })}
                          items={[
                            { label: t("agents.rotateKey"), onSelect: () => setRotating(agent) },
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
                      <tr
                        data-ui="agent-expanded-row"
                        className="border-b border-line bg-surface-2"
                      >
                        <td colSpan={8} className="p-4">
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
      {selected && (
        <Dialog
          open
          title={selected.name}
          onClose={() => setSelected(null)}
          footer={<Button onClick={() => setSelected(null)}>{t("common.close")}</Button>}
        >
          <AgentDetails agentId={selected.id} />
        </Dialog>
      )}
      {isAdmin && rotating && <RotateAgentKey agent={rotating} onClose={() => setRotating(null)} />}
      {isAdmin && editing && <CreateAgent agent={editing} onClose={() => setEditing(null)} />}
      {isAdmin && deleting && <DeleteAgent agent={deleting} onClose={() => setDeleting(null)} />}
      {isAdmin && creating && <CreateAgent onClose={() => setCreating(false)} />}
    </div>
  );
}
