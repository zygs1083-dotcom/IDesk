import { AUTOMATION_COLUMNS } from "@idesk/core";
import { PageHeader } from "../components/PageHeader.tsx";
import { BoardColumn } from "../components/BoardColumn.tsx";

const icons = { waiting: "◌", running: "◐", finished: "✓" } as const;

export function AutomationBoard() {
  return (
    <>
      <PageHeader title="自动化" subtitle="n8n · 海豚调度 的运行镜像（M3 接入连接器后显示数据）" />
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max w-full">
          {AUTOMATION_COLUMNS.map((c) => (
            <BoardColumn key={c.id} title={c.label} count={0} icon={<span className="text-ink-3">{icons[c.id]}</span>}>{null}</BoardColumn>
          ))}
        </div>
      </div>
    </>
  );
}
