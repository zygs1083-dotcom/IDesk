import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ComposeRelay } from "./compose-relay.tsx";
import { RelayDetail } from "./relay-detail.tsx";
import { RelayFilters } from "./relay-filters.tsx";
import { RelayRow } from "./relay-row.tsx";
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
  return (
    <div data-scene="relay" className="flex h-full flex-col gap-6">
      <PageHeader title={t("nav.relay")}>
        {isAdmin && (
          <Button variant="primary" onClick={() => setCompose({})}>
            {t("relay.sendMessage")}
          </Button>
        )}
      </PageHeader>
      <div data-ui="relay-toolbar" className="contents">
        <Segmented
          label={t("nav.relay")}
          value={box}
          onChange={(value) => {
            setParams((current) => {
              current.set("box", value);
              return current;
            });
            setSelectedId(null);
          }}
          options={[
            {
              value: "inbox",
              label: `${t("relay.inbox")}${summary?.unread ? ` · ${summary.unread}` : ""}`,
            },
            { value: "sent", label: t("relay.sent") },
            { value: "all", label: t("relay.all") },
          ]}
        />
        <div data-ui="relay-search">
          <PixelIcon
            name="search"
            fallback={<Search size={16} strokeWidth={1.5} />}
            className="pixel-only relay-search-icon"
          />
          <Field
            label={t("relay.search")}
            placeholder={t("relay.search")}
            className="placeholder:text-transparent"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setSelectedId(null);
            }}
          />
        </div>
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
      </div>
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
              <RelayRow
                key={message.id}
                message={message}
                selected={selected?.id === message.id}
                onSelect={() => setSelectedId(message.id)}
              />
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
              <RelayDetail
                key={selected.id}
                selected={selected}
                onReply={(reply) => setCompose({ reply })}
              />
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
