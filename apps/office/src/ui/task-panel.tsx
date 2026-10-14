import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@idesk/shared/task-status";
import { PixelButton } from "./pixel-button.tsx";
import { PixelPanel } from "./pixel-panel.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function TaskPanel({
  task,
  agents,
  onClose,
}: {
  task: Task;
  agents: Agent[];
  onClose: () => void;
}) {
  const assignee = agents.find((agent) => agent.id === task.assigneeId);
  return (
    <PixelPanel title="任务详情" onClose={onClose}>
      <h3>{task.title}</h3>
      <dl>
        <dt>能力</dt>
        <dd>{task.capabilities.join(" · ") || "暂无"}</dd>
        <dt>优先级</dt>
        <dd>{TASK_PRIORITY_LABEL[task.priority]}</dd>
        <dt>状态</dt>
        <dd>{TASK_STATUS_LABEL[task.status]}</dd>
        <dt>负责人</dt>
        <dd>{assignee?.name || "未分配"}</dd>
      </dl>
      <PixelButton href={`/desk?task=${encodeURIComponent(task.id)}`}>在看板中打开</PixelButton>
    </PixelPanel>
  );
}
