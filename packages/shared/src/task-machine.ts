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
const cancel = (): Partial<TaskState> => ({ status: "cancelled", leaseExpiresAt: null });
const handoff: Handler<Extract<TaskAction, { type: "handoff" }>> = (_, action) => ({
  status: action.to === null ? "open" : "assigned",
  assigneeId: action.to,
  leaseExpiresAt: null,
});
const running = ({ lease }: Context) => ({ status: "in_progress" as const, leaseExpiresAt: lease });
const transitions: Record<TaskStatus, ActionTable> = {
  open: {
    cancel,
    claim: (context) => ({ ...running(context), assigneeId: context.agentId }),
    assign: (_, action) => ({ status: "assigned", assigneeId: action.agentId }),
    recruit: (_, { needed }) => ({ status: "recruiting", recruit: { needed, joined: [] } }),
  },
  assigned: { cancel, accept: running, decline: () => ({ status: "open", assigneeId: null }) },
  recruiting: {
    cancel,
    join: (context) => {
      const { task, agentId } = context;
      const previous = task.recruit as TaskRecruit;
      const recruit = { ...previous, joined: [...previous.joined, agentId] };
      if (recruit.joined.length !== recruit.needed) return { recruit };
      return { ...running(context), recruit, assigneeId: recruit.joined[0] as string };
    },
    cancel_recruit: () => ({ status: "open", recruit: null }),
  },
  in_progress: {
    cancel,
    heartbeat: ({ lease }) => ({ leaseExpiresAt: lease }),
    complete: ({ now }, action) => ({
      status: "done",
      result: action.result,
      completedAt: now,
      leaseExpiresAt: null,
    }),
    pause: () => ({ status: "paused", leaseExpiresAt: null }),
    handoff,
    release: () => ({ status: "open", assigneeId: null, leaseExpiresAt: null }),
    lease_expired: () => ({ status: "open", assigneeId: null, leaseExpiresAt: null }),
  },
  paused: {
    cancel,
    handoff,
    resume: running,
    release: () => ({ status: "open", assigneeId: null }),
  },
  done: { reopen: () => ({ status: "open", assigneeId: null, result: null, completedAt: null }) },
  cancelled: {},
};

const byAssignee = (task: TaskState, actor: Actor): string | null =>
  actor.kind === "agent" && actor.id === task.assigneeId ? null : "只有负责人可以操作";
const byAssigneeOrHuman = (task: TaskState, actor: Actor): string | null =>
  actor.kind === "human" ? null : byAssignee(task, actor);
const byHumanOrPublisher = (task: TaskState, actor: Actor): string | null =>
  actor.kind === "human" || (actor.kind === "agent" && actor.id === task.publisherId)
    ? null
    : "只有人或发布者可以操作";
const byCapabilities = (task: TaskState, actor: Actor): string | null => {
  if (actor.kind !== "agent") return "只有智能体可以领取或加入";
  const missing = task.capabilities.filter((cap) => !actor.capabilities.includes(cap));
  return missing.length ? `能力不匹配：缺少 ${missing.join("、")}` : null;
};
const permitted: {
  [A in TaskAction["type"]]: (
    task: TaskState,
    actor: Actor,
    action: Extract<TaskAction, { type: A }>,
  ) => string | null;
} = {
  claim: byCapabilities,
  join: (task, actor) =>
    byCapabilities(task, actor) ||
    (actor.kind === "agent" && (task.recruit as TaskRecruit).joined.includes(actor.id)
      ? "已经加入了"
      : null),
  accept: byAssignee,
  decline: byAssignee,
  heartbeat: byAssignee,
  complete: byAssigneeOrHuman,
  pause: byAssigneeOrHuman,
  handoff: byAssigneeOrHuman,
  release: byAssigneeOrHuman,
  resume: byAssigneeOrHuman,
  assign: (task, actor) => (actor.kind === "system" ? null : byHumanOrPublisher(task, actor)),
  recruit: (task, actor, action) =>
    byHumanOrPublisher(task, actor) || (action.needed < 2 ? "招募至少需要 2 个智能体" : null),
  cancel_recruit: byHumanOrPublisher,
  cancel: byHumanOrPublisher,
  reopen: (_, actor) => (actor.kind === "human" ? null : "只有人可以重开"),
  lease_expired: (_, actor) => (actor.kind === "system" ? null : "只有系统可以处理租约到期"),
};

export function transition<T extends TaskState>(
  task: T,
  action: TaskAction,
  actor: Actor,
  now: Date,
): T | TransitionError {
  const apply = transitions[task.status][action.type];
  if (!apply) {
    const message = `${TASK_STATUS_LABEL[task.status]}的任务不能${ACTION_LABEL[action.type]}`;
    return new TransitionError(task.status, action.type, message);
  }
  // 同一个动作键下的处理函数与 action 类型一致。
  const reason = permitted[action.type](task, actor, action as never);
  if (reason) return new TransitionError(task.status, action.type, reason);
  const agentId = actor.kind === "agent" ? actor.id : "";
  const lease = new Date(now.getTime() + LEASE_MS);
  return { ...task, ...apply({ task, agentId, lease, now }, action as never) };
}
