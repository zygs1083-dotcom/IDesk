import { labels } from "@idesk/shared/labels";
import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ComposeRelay } from "./compose-relay.tsx";
import { recipientLabel } from "./labels.ts";
import { RelayDetail } from "./relay-detail.tsx";
import { RelayFilters } from "./relay-filters.tsx";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayPage() {
  const { isAdmin } = useSession();
  const { lang, t } = useLang();
  const { agentName } = useAgents();
  const [recipient, setRecipient] = useState("all");
  const [kind, setKind] = useState("all");
  const [task, setTask] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ reply?: Message } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, error, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["relay", { recipient, kind, task, q, status }],
      initialPageParam: "",
      gcTime: 0,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ box: "all", limit: "50" });
        if (pageParam) params.set("before", pageParam);
        if (q) params.set("q", q);
        if (recipient !== "all") params.set("toKind", recipient);
        if (kind !== "all") params.set("kind", kind);
        if (task !== "all") params.set("hasTask", String(task === "with"));
        if (status !== "all") params.set("requestStatus", status);
        return request<Message[]>(`/relay?${params}`);
      },
      getNextPageParam: (page) => (page.length === 50 ? page[page.length - 1]?.id : undefined),
    });
  const messages = data?.pages.flat() ?? [];
  useShortcut("n", () => {
    if (isAdmin) setCompose({});
  });
  const selected = messages.find((message) => message.id === selectedId);
  return (
    <div data-scene="relay" className="flex h-full flex-col gap-6">
      <PageHeader title={t("nav.relay")}>
        {isAdmin && (
          <Button variant="primary" onClick={() => setCompose({})}>
            {t("relay.sendMessage")}
          </Button>
        )}
      </PageHeader>
      <Field
        label={t("relay.search")}
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setSelectedId(null);
        }}
      />
      <Segmented
        label={t("relay.requestStatus")}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setSelectedId(null);
        }}
        options={[
          { value: "all", label: t("common.all") },
          { value: "pending", label: t("relay.pending") },
          { value: "answered", label: t("relay.answered") },
        ]}
      />
      <RelayFilters
        recipient={recipient}
        onRecipient={(value) => {
          setRecipient(value);
          setSelectedId(null);
        }}
        kind={kind}
        onKind={(value) => {
          setKind(value);
          setSelectedId(null);
        }}
        task={task}
        onTask={(value) => {
          setTask(value);
          setSelectedId(null);
        }}
      />
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && messages.length === 0 ? (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>
            {t(
              q || status !== "all" || recipient !== "all" || kind !== "all" || task !== "all"
                ? "relay.noMatches"
                : "relay.empty",
            )}
          </p>
          {isAdmin && (
            <Button className="mt-3" onClick={() => setCompose({})}>
              {t("relay.sendOne")}
            </Button>
          )}
        </div>
      ) : (
        <div
          data-ui="panel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface md:flex-row"
        >
          <div
            data-ui="mail-slots"
            className="max-h-80 shrink-0 overflow-y-auto md:max-h-none border-b border-line md:w-90 md:border-r md:border-b-0"
          >
            {messages.map((message) => (
              <button
                key={message.id}
                type="button"
                data-ui="message"
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
            {hasNextPage && (
              <Button disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                {t("relay.loadMore")}
              </Button>
            )}
          </div>
          <div data-ui="letter-desk" className="min-w-0 flex-1 overflow-y-auto">
            {!selected && (
              <p className="p-6 text-secondary text-text-2">{t("relay.selectMessage")}</p>
            )}
            {selected && (
              <RelayDetail selected={selected} onReply={(reply) => setCompose({ reply })} />
            )}
          </div>
        </div>
      )}
      {isAdmin && compose && (
        <ComposeRelay reply={compose.reply} onClose={() => setCompose(null)} />
      )}
    </div>
  );
}
