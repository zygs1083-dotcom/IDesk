import { TASK_STATUS_LABEL, type TaskStatus } from "./task-status.ts";

export interface TaskRecruit {
  needed: number;
  joined: string[];
}
export interface TaskState {
  status: TaskStatus;
  publisherId: string;
  assigneeId: string | null;
  capabilities: string[];
  recruit: TaskRecruit | null;
  leaseExpiresAt: Date | null;
  result: string | null;
  completedAt: Date | null;
}
export type Actor =
  | { kind: "human" }
  | { kind: "agent"; id: string; capabilities: string[] }
  | { kind: "system" };
export type TaskAction =
  | { type: "claim" }
  | { type: "assign"; agentId: string }
  | { type: "recruit"; needed: number }
  | { type: "cancel" }
  | { type: "accept" }
  | { type: "decline" }
  | { type: "join" }
  | { type: "cancel_recruit" }
  | { type: "heartbeat" }
  | { type: "complete"; result: string }
  | { type: "pause" }
  | { type: "handoff"; to: string | null; note: string }
  | { type: "release" }
  | { type: "lease_expired" }
  | { type: "resume" }
  | { type: "reopen" };

export const LEASE_MS = 10 * 60 * 1000;
export const ACTION_LABEL: Record<TaskAction["type"], string> = {
  claim: "领取",
  assign: "指定",
  recruit: "招募",
  cancel: "取消",
  accept: "接受",
  decline: "拒绝",
  join: "加入",
  cancel_recruit: "取消招募",
  heartbeat: "续租",
  complete: "完成",
  pause: "暂停",
  handoff: "交接",
  release: "放回",
  lease_expired: "租约到期",
  resume: "恢复",
  reopen: "重开",
};
export class TransitionError extends Error {
  constructor(
    readonly status: TaskStatus,
    readonly action: TaskAction["type"],
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

type Context = { task: TaskState; agentId: string; lease: Date; now: Date };
type Handler<A extends TaskAction = TaskAction> = (ctx: Context, action: A) => Partial<TaskState>;
type ActionTable = { [A in TaskAction["type"]]?: Handler<Extract<TaskAction, { type: A }>> };
const transitions: Record<TaskStatus, ActionTable> = {
  open: {
    claim: ({ agentId, lease }) => ({
      status: "in_progress",
      assigneeId: agentId,
      leaseExpiresAt: lease,
    }),
    assign: (_, action) => ({ status: "assigned", assigneeId: action.agentId }),
    recruit: (_, action) => ({
      status: "recruiting",
      recruit: { needed: action.needed, joined: [] },
    }),
  },
  assigned: {
    accept: ({ lease }) => ({ status: "in_progress", leaseExpiresAt: lease }),
    decline: () => ({ status: "open", assigneeId: null }),
  },
  recruiting: {
    join: ({ task, agentId, lease }) => {
      const recruit = task.recruit as TaskRecruit;
      const joined = [...recruit.joined, agentId];
      const changes: Partial<TaskState> = { recruit: { ...recruit, joined } };
      if (joined.length === recruit.needed) {
        Object.assign(changes, {
          status: "in_progress",
          assigneeId: joined[0],
          leaseExpiresAt: lease,
        });
      }
      return changes;
    },
    cancel_recruit: () => ({ status: "open", recruit: null }),
  },
  in_progress: {
    heartbeat: ({ lease }) => ({ leaseExpiresAt: lease }),
    complete: ({ now }, action) => ({
      status: "done",
      result: action.result,
      completedAt: now,
      leaseExpiresAt: null,
    }),
    pause: () => ({ status: "paused", leaseExpiresAt: null }),
    handoff: (_, action) => ({
      status: action.to === null ? "open" : "assigned",
      assigneeId: action.to,
      leaseExpiresAt: null,
    }),
    release: () => ({ status: "open", assigneeId: null, leaseExpiresAt: null }),
    lease_expired: () => ({ status: "open", assigneeId: null, leaseExpiresAt: null }),
  },
  paused: {
    handoff: (_, action) => ({
      status: action.to === null ? "open" : "assigned",
      assigneeId: action.to,
      leaseExpiresAt: null,
    }),
    resume: ({ lease }) => ({ status: "in_progress", leaseExpiresAt: lease }),
    release: () => ({ status: "open", assigneeId: null }),
  },
  done: { reopen: () => ({ status: "open", assigneeId: null, result: null, completedAt: null }) },
  cancelled: {},
};

export function transition<T extends TaskState>(
  task: T,
  action: TaskAction,
  actor: Actor,
  now: Date,
): T | TransitionError {
  const type = action.type;
  const agentId = actor.kind === "agent" ? actor.id : "";
  const human = actor.kind === "human";
  const fail = (message: string) => new TransitionError(task.status, type, message);
  const apply = transitions[task.status][type] as Handler | undefined;
  if (!apply && !(type === "cancel" && task.status !== "cancelled" && task.status !== "done")) {
    return fail(`${TASK_STATUS_LABEL[task.status]}的任务不能${ACTION_LABEL[type]}`);
  }
  if (actor.kind === "system" && type !== "lease_expired") return fail("系统只能处理租约到期");
  if (type === "lease_expired" && actor.kind !== "system") return fail("只有系统可以处理租约到期");
  const agentOnly = ["claim", "accept", "decline", "join", "heartbeat"].includes(type);
  if (agentOnly && actor.kind !== "agent") {
    return fail(`只有智能体可以${ACTION_LABEL[type]}`);
  }
  const publisherOnly = ["assign", "recruit", "cancel_recruit", "cancel"].includes(type);
  if (publisherOnly && !human && agentId !== task.publisherId) {
    return fail(`只有人或发布者可以${ACTION_LABEL[type]}`);
  }
  if (type === "reopen" && !human) return fail("只有人可以重开");
  if (["heartbeat", "complete", "pause", "handoff", "release", "resume"].includes(type)) {
    if (!human && agentId !== task.assigneeId) return fail(`只有负责人可以${ACTION_LABEL[type]}`);
  }
  if (actor.kind === "agent") {
    if (["claim", "join"].includes(type)) {
      const missing = task.capabilities.filter((cap) => !actor.capabilities.includes(cap));
      if (missing.length) return fail(`能力不匹配：缺少 ${missing.join("、")}`);
    }
    if (["accept", "decline"].includes(type) && actor.id !== task.assigneeId)
      return fail(`只有被指定的智能体可以${ACTION_LABEL[type]}`);
    if (type === "join" && (task.recruit as TaskRecruit).joined.includes(actor.id))
      return fail("已经加入了");
  }
  if (action.type === "recruit" && action.needed < 2) return fail("招募至少需要 2 个智能体");
  if (type === "cancel") return { ...task, status: "cancelled", leaseExpiresAt: null };
  // 表的动作键保证处理函数与 action 的类型一致。
  const lease = new Date(now.getTime() + LEASE_MS);
  const context = { task, agentId, lease, now };
  return { ...task, ...(apply as Handler)(context, action) };
}
