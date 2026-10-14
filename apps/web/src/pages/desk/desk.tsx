import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { Board } from "./board.tsx";
import { PublishDialog } from "./publish-dialog.tsx";
import { TaskDrawer } from "./task-drawer.tsx";
export function Desk() {
  const {
    data: tasks = [],
    error: queryError,
    isPending,
  } = useQuery({ queryKey: ["tasks"], queryFn: () => request<Task[]>("/tasks") });
  const { data: handoffs = [] } = useQuery({
    queryKey: ["events", "handoff"],
    queryFn: () => request<TaskEvent[]>("/events?type=task.handoff"),
  });
  const [search, setSearch] = useState("");
  const [publish, setPublish] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex items-center gap-4">
        <PageHeader title="协作台" />
        <label className="flex min-w-0 max-w-60 flex-1 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2">
          <Search size={16} strokeWidth={1.5} />
          <input
            aria-label="搜索任务"
            placeholder="搜索任务"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 w-full bg-transparent text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
          />
        </label>
        <Button variant="primary" className="ml-auto shrink-0" onClick={() => setPublish(true)}>
          发布
        </Button>
      </div>
      {queryError && (
        <p role="alert" className="text-secondary text-status-failed">
          {queryError.message}
        </p>
      )}
      <Board
        tasks={tasks}
        handoffs={handoffs}
        search={search}
        loading={isPending || !!queryError}
        onOpen={setSelected}
        onPublish={() => setPublish(true)}
      />
      <AnimatePresence>
        {publish && <PublishDialog key="publish" onClose={() => setPublish(false)} />}
        {selected && (
          <TaskDrawer key={selected} taskId={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
