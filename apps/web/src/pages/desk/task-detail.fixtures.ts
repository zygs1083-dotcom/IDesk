import type { Task, TaskEvent } from "../../lib/types.ts";

export const detailUrl = `https://example.test/${"任务检查-long-path-".repeat(20)}`;
export const detailTask: Task = {
  id: "task-detail",
  title: `检查 HTTP 404 · ${"TaskDetail任务详情".repeat(12)}`,
  body: "检查 **HTTP 404**，保留响应正文。\n验证下一行。",
  result: `响应状态：**HTTP 404**。\n路径不存在。\n\n请求地址：${detailUrl}\n\n保留最后一段结果。`,
  status: "done",
  priority: "normal",
  tags: [],
  capabilities: ["http", "browser"],
  blockedBy: [],
  publisherId: "human",
  assigneeId: "agent",
  recruit: null,
  leaseExpiresAt: null,
  dueAt: null,
  createdAt: "2026-10-19T12:00:00Z",
  updatedAt: "2026-10-19T12:09:00Z",
  completedAt: "2026-10-19T12:09:00Z",
};

export const detailEvents: TaskEvent[] = [
  "created",
  "assign",
  "accept",
  "reported",
  "pause",
  "resume",
  "reported",
  "handoff",
  "reported",
  "complete",
].map((action, index) => ({
  id: `event-${index}`,
  ts: `2026-10-19T12:0${index}:00Z`,
  type: `task.${action}`,
  taskId: detailTask.id,
  agentId: "agent",
  payload:
    action === "reported"
      ? {
          message:
            index === 6
              ? "短汇报。"
              : `报告 ${index}：已收到 HTTP 404。\n正在排查。\n${detailUrl}\n末行完整保留。`,
        }
      : { from: "in_progress", to: action === "complete" ? "done" : "in_progress" },
}));
