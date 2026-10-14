export const TASK_STATUSES = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "handoff",
  "paused",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "待领取",
  recruiting: "招募中",
  assigned: "已指定",
  in_progress: "进行中",
  handoff: "传递区",
  paused: "已暂停",
  done: "已完成",
  cancelled: "已取消",
};

/** 看板列顺序；cancelled 不作为列显示。 */
export const BOARD_COLUMNS: readonly TaskStatus[] = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "handoff",
  "paused",
  "done",
];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
