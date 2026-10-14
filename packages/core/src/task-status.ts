/**
 * Task state machine. Pure data + pure functions, shared by api, web, cli and mcp.
 * Permission / ownership checks are NOT here; the api service does those.
 */
export const TASK_STATUSES = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "paused",
  "done",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_OUTCOMES = ["success", "failed", "cancelled"] as const;
export type TaskOutcome = (typeof TASK_OUTCOMES)[number];

export const TASK_ACTIONS = [
  "claim",
  "assign",
  "start",
  "join",
  "pause",
  "resume",
  "release",
  "handoff",
  "complete",
  "cancel",
  "reopen",
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

/** Chinese labels for the board columns and badges. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "待领取",
  recruiting: "招募中",
  assigned: "已指定",
  in_progress: "进行中",
  paused: "已暂停",
  done: "已完成",
};

export const TASK_ACTION_LABELS: Record<TaskAction, string> = {
  claim: "领取",
  assign: "指定",
  start: "开始",
  join: "加入",
  pause: "暂停",
  resume: "继续",
  release: "放弃",
  handoff: "转交",
  complete: "完成",
  cancel: "取消",
  reopen: "重新打开",
};

/** Board column order for the dispatch board. */
export const BOARD_COLUMNS: TaskStatus[] = [
  "open",
  "recruiting",
  "assigned",
  "in_progress",
  "paused",
  "done",
];

/**
 * Transition table: status -> action -> next status.
 * Two actions are context dependent and resolved by helpers below:
 * - `join` stays in `recruiting` until enough agents joined (`resolveJoin`).
 * - `handoff` goes to `assigned` when a receiver is named, else `open`
 *   (`resolveHandoff`). The table lists the receiver-less result.
 * The relay (传递区) is a feature, not a status: a handoff also writes a relay
 * message carrying context and artifacts for the receiver.
 */
const TRANSITIONS: Record<TaskStatus, Partial<Record<TaskAction, TaskStatus>>> = {
  open: { claim: "in_progress", assign: "assigned", cancel: "done" },
  recruiting: { join: "recruiting", assign: "assigned", start: "in_progress", cancel: "done" },
  assigned: { start: "in_progress", pause: "paused", release: "open", cancel: "done" },
  in_progress: {
    pause: "paused",
    handoff: "open",
    complete: "done",
    release: "open",
    cancel: "done",
  },
  paused: { resume: "in_progress", handoff: "open", release: "open", cancel: "done" },
  done: { reopen: "open" },
};

export function nextStatus(from: TaskStatus, action: TaskAction): TaskStatus | null {
  return TRANSITIONS[from][action] ?? null;
}

export function canTransition(from: TaskStatus, action: TaskAction): boolean {
  return nextStatus(from, action) !== null;
}

export function actionsFor(status: TaskStatus): TaskAction[] {
  return Object.keys(TRANSITIONS[status]) as TaskAction[];
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "done";
}

/** Statuses that require an active lease (heartbeat) from the owner. */
export function requiresLease(status: TaskStatus): boolean {
  return status === "in_progress" || status === "assigned";
}

/** Initial status when a task is published. */
export function initialStatus(minAgents: number): TaskStatus {
  return minAgents > 1 ? "recruiting" : "open";
}

/** After a `join`, decide whether the recruiting task is full. */
export function resolveJoin(joinedCount: number, minAgents: number): TaskStatus {
  return joinedCount >= minAgents ? "in_progress" : "recruiting";
}

/** After a `handoff`: a named receiver gets the task assigned, otherwise it is open again. */
export function resolveHandoff(hasReceiver: boolean): TaskStatus {
  return hasReceiver ? "assigned" : "open";
}

/** Capability match: every required capability must be present on the agent. */
export function capabilitiesMatch(required: readonly string[], offered: readonly string[]): boolean {
  if (required.length === 0) return true;
  const set = new Set(offered.map((c) => c.toLowerCase()));
  return required.every((c) => set.has(c.toLowerCase()));
}
