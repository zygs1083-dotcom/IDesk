import type { AssistantDraft, AssistantReply } from "@idesk/shared/assistant-schemas";
import { TASK_PRIORITIES } from "@idesk/shared/task-status";
import { listAgents } from "../agents/agents.ts";
import { getTask } from "../tasks/store.ts";

const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
export function confirmation(draft: AssistantDraft): AssistantReply {
  if (draft.kind === "cancel")
    return {
      text: `确认取消：${getTask(draft.taskId)?.title ?? draft.taskId}？`,
      options: [
        { id: "confirm", label: "确认" },
        { id: "cancel", label: "算了" },
      ],
    };
  const { task } = draft;
  const capabilities = task.capabilities ?? [];
  const eligible = listAgents().filter((agent) =>
    capabilities.every((capability) => agent.capabilities.includes(capability)),
  );
  const online = eligible.filter((agent) => agent.status === "online").length;
  const hint = !capabilities.length
    ? "任何智能体都能领"
    : online
      ? `当前有 ${online} 个在线智能体能领`
      : eligible.length
        ? `具备这些能力的 ${eligible.length} 个智能体都不在线`
        : "没有智能体具备这些能力，发布后会一直没人能领";
  const dispatch = task.dispatch;
  const assigned =
    dispatch?.type === "assign"
      ? listAgents().find((agent) => agent.id === dispatch.agentId)
      : undefined;
  const missing = assigned
    ? capabilities.filter((capability) => !assigned.capabilities.includes(capability))
    : [];
  const options = TASK_PRIORITIES.map((priority, index) => ({
    id: String(index + 1),
    label: `${index + 1} ${priorityLabels[priority]}${priority === (task.priority ?? "normal") ? " ✓" : ""}`,
  }));
  return {
    text: [
      `标题：${task.title}`,
      `说明：${(task.body ?? "").slice(0, 200)}`,
      `优先级：${priorityLabels[task.priority ?? "normal"]}`,
      `能力：${capabilities.join("、") || "不限"}`,
      `截止：${task.dueAt ?? "无"}`,
      `分派：${!dispatch ? "待领取" : dispatch.type === "recruit" ? `招募 ${dispatch.needed} 人` : `指定 ${assigned?.name ?? dispatch.agentId}`}`,
      hint,
      ...(missing.length ? [`它不具备：${missing.join("、")}`] : []),
      "1 低 · 2 普通 · 3 高 · 4 紧急；发布 / 取消",
    ].join("\n"),
    options: [...options, { id: "publish", label: "发布" }, { id: "cancel", label: "取消" }],
  };
}
