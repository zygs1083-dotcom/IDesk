import type { TaskPriority } from "@idesk/shared/task-status";

export const priorityLabels: Record<TaskPriority, string> = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
};
