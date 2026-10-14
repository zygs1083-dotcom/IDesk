/** Normalized status for mirrored external automation (n8n, DolphinScheduler, ...). */
export const AUTOMATION_STATUSES = ["waiting", "running", "success", "failed", "cancelled", "unknown"] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatus, string> = {
  waiting: "待执行",
  running: "执行中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
  unknown: "未知",
};

/** Automation board columns: three lanes. */
export const AUTOMATION_COLUMNS = [
  { id: "waiting", label: "待执行", statuses: ["waiting"] },
  { id: "running", label: "执行中", statuses: ["running"] },
  { id: "finished", label: "已完成", statuses: ["success", "failed", "cancelled", "unknown"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; statuses: readonly AutomationStatus[] }>;
