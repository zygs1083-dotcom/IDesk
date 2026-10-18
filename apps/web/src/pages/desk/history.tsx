import { labels } from "@idesk/shared/labels";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";
import { TaskDrawer } from "./task-drawer.tsx";

type Page = { items: Task[]; nextCursor: string | null };
export function TaskHistory() {
  const { lang, t } = useLang();
  const [status, setStatus] = useState<"done" | "cancelled">("done");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const taskId = params.get("task");
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
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
    setParams(
      (params) => {
        if (id) params.set("task", id);
        else params.delete("task");
        return params;
      },
      { replace: true },
    );
  }
  return (
    <div data-scene="history" className="space-y-6">
      <PageHeader title={t("desk.history")}>
        <Link className="text-secondary text-accent" to="/desk">
          {t("nav.desk")}
        </Link>
      </PageHeader>
      <Segmented
        label={t("desk.history")}
        value={status}
        onChange={setStatus}
        options={(["done", "cancelled"] as const).map((value) => ({
          value,
          label: labels(lang).status[value],
        }))}
      />
      <Field
        label={t("desk.search")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {query.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {query.error.message}
        </p>
      )}
      {query.isPending && <p className="text-secondary text-text-2">{t("common.loading")}</p>}
      {!query.isPending && !query.error && !items.length && (
        <p className="text-secondary text-text-2">{t("desk.noMatches")}</p>
      )}
      <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
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
        <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t("desk.loadMore")}
        </Button>
      )}
      {taskId && <TaskDrawer taskId={taskId} onClose={() => select(null)} />}
    </div>
  );
}
