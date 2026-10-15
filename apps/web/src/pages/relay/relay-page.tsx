import { labels } from "@idesk/shared/labels";
import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ComposeRelay } from "./compose-relay.tsx";
import { recipientLabel } from "./labels.ts";
import { RelayDetail } from "./relay-detail.tsx";
import { RelayFilters } from "./relay-filters.tsx";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayPage() {
  const { lang, t } = useLang();
  const {
    data: messages = [],
    error,
    isPending,
  } = useQuery({ queryKey: ["relay"], queryFn: () => request<Message[]>("/relay") });
  const { agentName } = useAgents();
  const [recipient, setRecipient] = useState("all");
  const [kind, setKind] = useState("all");
  const [task, setTask] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ reply?: Message } | null>(null);
  useShortcut("n", () => setCompose({}));
  const filtered = messages.filter(
    (message) =>
      (recipient === "all" || message.to.kind === recipient) &&
      (kind === "all" || message.kind === kind) &&
      (task === "all" || (task === "with" ? message.taskId !== null : message.taskId === null)),
  );
  const selected = filtered.find((message) => message.id === selectedId) ?? filtered[0];
  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t("nav.relay")}>
        <Button variant="primary" onClick={() => setCompose({})}>
          {t("relay.sendMessage")}
        </Button>
      </PageHeader>
      <RelayFilters
        recipient={recipient}
        onRecipient={setRecipient}
        kind={kind}
        onKind={setKind}
        task={task}
        onTask={setTask}
      />
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && messages.length === 0 ? (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>{t("relay.empty")}</p>
          <Button className="mt-3" onClick={() => setCompose({})}>
            {t("relay.sendOne")}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface md:flex-row">
          <div className="max-h-80 shrink-0 overflow-y-auto md:max-h-none border-b border-line md:w-90 md:border-r md:border-b-0">
            {filtered.map((message) => (
              <button
                key={message.id}
                type="button"
                aria-pressed={selected?.id === message.id}
                onClick={() => setSelectedId(message.id)}
                className={cn(
                  "block w-full space-y-2 border-b border-line p-4 text-left transition-colors duration-hover ease-hover hover:bg-surface-2",
                  selected?.id === message.id && "bg-surface-2",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-tag bg-line px-2 py-0.5 text-label text-text-2">
                    {labels(lang).relayKind[message.kind]}
                  </span>
                  <time className="text-label tabular-nums text-text-2">
                    {relativeTime(new Date(message.createdAt), lang)}
                  </time>
                </div>
                <p
                  className={cn(
                    "truncate text-body",
                    message.readBy.length === 0 && "font-semibold",
                  )}
                >
                  {message.subject}
                </p>
                <p className="truncate text-secondary text-text-2">
                  {agentName(message.fromAgentId)} → {recipientLabel(message.to, agentName, lang)}
                </p>
              </button>
            ))}
            {!isPending && !error && filtered.length === 0 && (
              <p className="p-4 text-secondary text-text-2">{t("relay.noMatches")}</p>
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selected && (
              <RelayDetail
                messages={messages}
                selected={selected}
                onReply={(reply) => setCompose({ reply })}
              />
            )}
          </div>
        </div>
      )}
      {compose && <ComposeRelay reply={compose.reply} onClose={() => setCompose(null)} />}
    </div>
  );
}
