import { useMemo, useState } from "react";
import { BOARD_COLUMNS, type TaskStatus } from "@idesk/core";
import { useTasks } from "../lib/queries.ts";
import { STATUS_META } from "../lib/format.ts";
import { PageHeader } from "../components/PageHeader.tsx";
import { BoardColumn } from "../components/BoardColumn.tsx";
import { TaskCard } from "../components/TaskCard.tsx";
import { StatusDot } from "../components/StatusDot.tsx";
import { NewTaskDialog } from "../components/NewTaskDialog.tsx";
import { TaskDrawer } from "../components/TaskDrawer.tsx";

export function DispatchBoard() {
  const tasks = useTasks();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, typeof tasks.data>();
    for (const s of BOARD_COLUMNS) map.set(s, []);
    const needle = q.trim().toLowerCase();
    for (const t of tasks.data ?? []) {
      if (needle && !`${t.title} ${t.description} ${t.tags.join(" ")} ${t.requiredCapabilities.join(" ")}`.toLowerCase().includes(needle)) continue;
      map.get(t.status)!.push(t);
    }
    return map;
  }, [tasks.data, q]);

  return (
    <>
      <PageHeader
        title="调度台"
        subtitle={tasks.data ? `${tasks.data.length} 个任务` : undefined}
        actions={
          <>
            <input className="input w-56" placeholder="搜索任务…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary" onClick={() => setCreating(true)}>发布任务</button>
          </>
        }
      />
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full min-w-max w-full">
          {BOARD_COLUMNS.map((s) => {
            const list = byStatus.get(s) ?? [];
            return (
              <BoardColumn key={s} title={STATUS_META[s].label} count={list.length} icon={<StatusDot status={s} />} onAdd={s === "open" ? () => setCreating(true) : undefined}>
                {list.map((t) => <TaskCard key={t.id} task={t} onOpen={setOpenId} />)}
              </BoardColumn>
            );
          })}
        </div>
      </div>
      <NewTaskDialog open={creating} onClose={() => setCreating(false)} />
      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
