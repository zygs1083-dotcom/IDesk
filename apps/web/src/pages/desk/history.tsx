import { labels } from "@idesk/shared/labels";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Button } from "../../components/button.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";
import { HistorySearch } from "./history-search.tsx";
import { TaskDrawer } from "./task-drawer.tsx";

type Page = { items: Task[]; nextCursor: string | null };
export function TaskHistory() {
  const { lang, t } = useLang();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const status = params.get("status") === "cancelled" ? "cancelled" : "done";
  const search = params.get("q") ?? "";
  const [q, setQ] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const taskId = params.get("task");
  useEffect(() => {
    timer.current = setTimeout(
      () => setQ(new URLSearchParams(location.search).get("q") ?? ""),
      200,
    );
    return () => clearTimeout(timer.current);
  }, [location]);
  function setFilter(key: "q" | "status", value: string) {
    if (key === "status" && value === status) return;
    const next = new URLSearchParams(params);
    const nextSearch = key === "q" ? value : search;
    const nextStatus = key === "status" ? value : status;
    next.delete("q");
    next.delete("status");
    if (nextSearch) next.set("q", nextSearch);
    if (nextStatus === "cancelled") next.set("status", nextStatus);
    navigate({ search: next.toString(), hash: location.hash }, { replace: key === "q" });
  }
  function clearSearch() {
    clearTimeout(timer.current);
    setQ("");
    const next = new URLSearchParams(params);
    next.delete("q");
    navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash });
  }
  const query = useInfiniteQuery({
    queryKey: ["tasks", "history", status, q],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ status, limit: "30" });
      if (q) query.set("q", q);
      if (pageParam) query.set("cursor", pageParam);
      return request<Page>(`/tasks?${query}`);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  function select(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set("task", id);
    else next.delete("task");
    navigate({ search: next.toString(), hash: location.hash }, { replace: true });
  }
  return (
    <div data-scene="history" className="space-y-6">
      <PageHeader
        title={t("desk.history")}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <HistorySearch
              pixel
              search={search}
              onSearch={(value) => setFilter("q", value)}
              onClear={clearSearch}
            />
            <Segmented
              label={t("desk.history")}
              value={status}
              onChange={(value) => setFilter("status", value)}
              options={(["done", "cancelled"] as const).map((value) => ({
                value,
                label: labels(lang).status[value],
              }))}
            />
          </div>
        }
      >
        <Link data-ui="header-link" className="text-secondary text-accent" to="/desk">
          {t("nav.desk")}
        </Link>
      </PageHeader>
      <div className="pixel-legacy space-y-6">
        <Segmented
          label={t("desk.history")}
          value={status}
          onChange={(value) => setFilter("status", value)}
          options={(["done", "cancelled"] as const).map((value) => ({
            value,
            label: labels(lang).status[value],
          }))}
        />
        <HistorySearch
          search={search}
          onSearch={(value) => setFilter("q", value)}
          onClear={clearSearch}
        />
      </div>
      {query.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {query.error.message}
        </p>
      )}
      {query.isPending && <p className="text-secondary text-text-2">{t("common.loading")}</p>}
      {!query.isPending && !query.error && !items.length && (
        <EmptyState
          title={t("desk.noMatches")}
          description={t("empty.history")}
          scene="folder"
          className="py-0"
        />
      )}
      <ul
        data-ui="history-list"
        data-empty={items.length === 0}
        className="divide-y divide-line rounded-panel border border-line bg-surface"
      >
        {items.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              className="flex w-full flex-col items-start justify-between gap-2 p-4 sm:flex-row sm:items-center sm:gap-3 text-left hover:bg-surface-2 focus-visible:outline-accent"
              onClick={() => select(task.id)}
            >
              <span className="min-w-0 break-words text-body">{task.title}</span>
              <time className="shrink-0 text-label text-text-2">
                {new Date(task.updatedAt).toLocaleString(lang)}
              </time>
            </button>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="ghost"
          className="mx-auto flex"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("desk.loadMore")}
        </Button>
      )}
      {taskId && <TaskDrawer taskId={taskId} onClose={() => select(null)} />}
    </div>
  );
}
