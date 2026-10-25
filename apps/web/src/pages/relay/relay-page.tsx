import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ComposeRelay } from "./compose-relay.tsx";
import { RelayDetail } from "./relay-detail.tsx";
import { RelayRow } from "./relay-row.tsx";
import { RelayToolbar } from "./relay-toolbar.tsx";
import { useRelayReading } from "./use-relay-reading.ts";
import { useRelaySummary } from "./use-relay-summary.ts";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayPage() {
  const { isAdmin } = useSession();
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const box = params.get("box") === "sent" ? "sent" : params.get("box") === "all" ? "all" : "inbox";
  const { data: summary } = useRelaySummary();
  const [recipient, setRecipient] = useState("all");
  const [kind, setKind] = useState("all");
  const [task, setTask] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ reply?: Message } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, error, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["relay", { box, recipient, kind, task, q, status }],
      initialPageParam: "",
      gcTime: 0,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ box, limit: "50" });
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
  const reading = useRelayReading(selected?.id ?? null);
  const selectBox = (value: string) => {
    setParams((current) => {
      current.set("box", value);
      return current;
    });
    setSelectedId(null);
  };
  return (
    <div
      ref={reading.page}
      data-scene="relay"
      data-reading={selected ? "true" : undefined}
      className="flex h-full min-h-0 flex-col gap-6"
    >
      <PageHeader title={t("nav.relay")}>
        {isAdmin && (
          <Button variant="primary" onClick={() => setCompose({})}>
            {t("relay.sendMessage")}
          </Button>
        )}
      </PageHeader>
      <RelayToolbar
        box={box}
        unread={summary?.unread}
        onBox={selectBox}
        q={q}
        onSearch={(value) => {
          setQ(value);
          setSelectedId(null);
        }}
        status={status}
        onStatus={(value) => {
          setStatus(value);
          setSelectedId(null);
        }}
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
        <EmptyState
          title={t(
            q || status !== "all" || recipient !== "all" || kind !== "all" || task !== "all"
              ? "relay.noMatches"
              : "relay.empty",
          )}
          description={t("empty.relay")}
          scene="envelope"
          action={
            isAdmin ? { label: t("relay.sendOne"), onClick: () => setCompose({}) } : undefined
          }
        />
      ) : (
        <div
          data-ui="panel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface md:flex-row"
        >
          <div
            ref={reading.list}
            data-ui="mail-slots"
            onScroll={reading.rememberList}
            className="max-h-80 shrink-0 overflow-y-auto md:max-h-none border-b border-line md:w-90 md:border-r md:border-b-0"
          >
            {messages.map((message) => (
              <RelayRow
                key={message.id}
                message={message}
                selected={selected?.id === message.id}
                onSelect={() => {
                  reading.rememberList();
                  setSelectedId(message.id);
                }}
              />
            ))}
            {hasNextPage && (
              <Button disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                {t("relay.loadMore")}
              </Button>
            )}
          </div>
          <div data-ui="relay-back">
            <Button ref={reading.back} onClick={() => setSelectedId(null)}>
              {t("relay.backToMessages")}
            </Button>
          </div>
          <section
            ref={reading.desk}
            data-ui="letter-desk"
            aria-label={t("relay.conversation")}
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto"
          >
            {!selected && (
              <EmptyState
                title={t("relay.selectMessage")}
                description={t("empty.relaySelect")}
                scene="envelope"
                className="p-6"
              />
            )}
            {selected && (
              <RelayDetail
                key={selected.id}
                selected={selected}
                onReply={(reply) => setCompose({ reply })}
              />
            )}
          </section>
        </div>
      )}
      {isAdmin && compose && (
        <ComposeRelay reply={compose.reply} onClose={() => setCompose(null)} />
      )}
    </div>
  );
}
