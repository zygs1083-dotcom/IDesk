import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { useTasks } from "../../lib/use-tasks.ts";
import { Board } from "./board.tsx";
import { PublishDialog } from "./publish-dialog.tsx";
import { TaskDrawer } from "./task-drawer.tsx";
export function Desk() {
  const { isAdmin } = useSession();
  const { t } = useLang();
  const { tasks, error: queryError, isPending } = useTasks();
  const { data: handoffs = [] } = useQuery({
    queryKey: ["events", "handoff"],
    queryFn: () => request<TaskEvent[]>("/events?type=task.handoff"),
  });
  const searchInput = useRef<HTMLInputElement>(null);
  const [group, setGroup] = useState<"flat" | "host">(() =>
    localStorage.getItem("desk.group") === "host" ? "host" : "flat",
  );
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 200);
    return () => clearTimeout(timer);
  }, [search]);
  const searchQuery = useQuery({
    queryKey: ["tasks", q],
    queryFn: () => request<Task[]>(`/tasks?q=${encodeURIComponent(q)}`),
    enabled: q !== "",
    placeholderData: keepPreviousData,
  });
  const error = queryError ?? (q ? searchQuery.error : null);
  const [publish, setPublish] = useState(false);
  const [params, setParams] = useSearchParams();
  const selected = params.get("task");
  const setSelected = (taskId: string | null) => {
    setParams(
      (params) => {
        if (taskId === null) params.delete("task");
        else params.set("task", taskId);
        return params;
      },
      { replace: true },
    );
  };
  useShortcut("n", () => {
    if (isAdmin) setPublish(true);
  });
  useShortcut("/", () => searchInput.current?.focus());
  return (
    <div data-scene="desk" className="flex h-full min-h-0 flex-col gap-6">
      <div
        data-ui="desk-toolbar"
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sidebar:flex sidebar:gap-4"
      >
        <PageHeader title={t("nav.desk")} />
        <label
          data-ui="desk-search"
          className="order-3 flex min-w-0 flex-1 sidebar:order-none sidebar:max-w-60 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2"
        >
          <PixelIcon name="search" fallback={<Search size={16} strokeWidth={1.5} />} />
          <input
            ref={searchInput}
            aria-label={t("desk.search")}
            placeholder={t("desk.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 w-full bg-transparent text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
          />
        </label>
        <div data-ui="desk-view" className="order-4 sidebar:order-none">
          <Segmented<"flat" | "host">
            label={t("desk.grouping")}
            options={[
              { value: "flat", label: t("desk.flat") },
              { value: "host", label: t("desk.byHost") },
            ]}
            value={group}
            onChange={(value) => {
              setGroup(value);
              localStorage.setItem("desk.group", value);
            }}
          />
        </div>
        <div
          data-ui="desk-actions"
          className="order-2 ml-auto flex shrink-0 items-center gap-3 sidebar:order-none"
        >
          <Link data-ui="header-link" to="/desk/history" className="text-secondary text-accent">
            {t("desk.history")}
          </Link>
          <Button disabled={!isAdmin} variant="primary" onClick={() => setPublish(true)}>
            {t("common.publish")}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      <Board
        tasks={tasks}
        handoffs={handoffs}
        search={q}
        visible={q ? (searchQuery.data ?? []) : tasks}
        group={group}
        loading={isPending || (q !== "" && searchQuery.isPending) || !!error}
        onOpen={setSelected}
        onPublish={() => setPublish(true)}
      />
      <AnimatePresence>
        {isAdmin && publish && <PublishDialog key="publish" onClose={() => setPublish(false)} />}
        {selected && (
          <TaskDrawer key={selected} taskId={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
