export const TASK_STATUSES = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "paused",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** 看板列顺序；cancelled 不作为列显示。 */
export const BOARD_COLUMNS: readonly TaskStatus[] = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "paused",
  "done",
];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
