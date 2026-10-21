import type { Lang } from "./labels.ts";
import {
  type MessageArguments,
  type MessageDetail,
  type MessageKey,
  type MessageParams,
  message,
} from "./messages.ts";
import type { TaskStatus } from "./task-status.ts";

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
  | { kind: "person"; id: string }
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
export class TransitionError<K extends MessageKey = MessageKey> extends Error {
  readonly params: MessageParams<K>;
  constructor(
    readonly status: TaskStatus,
    readonly action: TaskAction["type"],
    readonly key: K,
    ...args: MessageArguments<K>
  ) {
    const params = args[0] as MessageParams<K>;
    super(message("zh", key, params));
    this.params = params;
    this.name = "TransitionError";
  }

  translate(lang: Lang): string {
    return message(lang, this.key, this.params);
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
  assigned: {
    cancel,
    accept: running,
    decline: () => ({ status: "open", assigneeId: null }),
    release: () => ({ status: "open", assigneeId: null, leaseExpiresAt: null }),
    assign: (_, action) => ({
      status: "assigned",
      assigneeId: action.agentId,
      leaseExpiresAt: null,
    }),
  },
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

const byHuman = (_: TaskState, actor: Actor): MessageDetail | null =>
  actor.kind === "human" ? null : { key: "auth.humanOnly", params: undefined };
const byAssignee = (task: TaskState, actor: Actor): MessageDetail | null =>
  actor.kind === "agent" && actor.id === task.assigneeId
    ? null
    : { key: "transition.assigneeOnly", params: undefined };
const byAssigneeOrHuman = (task: TaskState, actor: Actor): MessageDetail | null =>
  actor.kind === "human" ? null : byAssignee(task, actor);
const byHumanOrPublisher = (task: TaskState, actor: Actor): MessageDetail | null =>
  actor.kind === "human" || (actor.kind === "agent" && actor.id === task.publisherId)
    ? null
    : { key: "auth.humanOrPublisherOnly", params: undefined };
const byCapabilities = (task: TaskState, actor: Actor): MessageDetail | null => {
  if (actor.kind !== "agent") return { key: "transition.agentOnly", params: undefined };
  const missing = task.capabilities.filter((cap) => !actor.capabilities.includes(cap));
  return missing.length ? { key: "transition.missingCapabilities", params: { missing } } : null;
};
const permitted: {
  [A in TaskAction["type"]]: (
    task: TaskState,
    actor: Actor,
    action: Extract<TaskAction, { type: A }>,
  ) => MessageDetail | null;
} = {
  claim: byCapabilities,
  join: (task, actor) =>
    byCapabilities(task, actor) ||
    (actor.kind === "agent" && (task.recruit as TaskRecruit).joined.includes(actor.id)
      ? { key: "transition.alreadyJoined", params: undefined }
      : null),
  accept: byAssignee,
  decline: byAssignee,
  heartbeat: byAssignee,
  complete: byAssigneeOrHuman,
  pause: byAssigneeOrHuman,
  handoff: byAssigneeOrHuman,
  release: (task, actor) =>
    task.status === "assigned" ? byHuman(task, actor) : byAssigneeOrHuman(task, actor),
  resume: byAssigneeOrHuman,
  assign: (task, actor) =>
    task.status === "assigned"
      ? byHuman(task, actor)
      : actor.kind === "system"
        ? null
        : byHumanOrPublisher(task, actor),
  recruit: (task, actor, action) =>
    byHumanOrPublisher(task, actor) ||
    (action.needed < 2 ? { key: "transition.recruitMinimum", params: undefined } : null),
  cancel_recruit: byHumanOrPublisher,
  cancel: (task, actor) =>
    actor.kind === "person" && actor.id === task.publisherId
      ? null
      : byHumanOrPublisher(task, actor),
  reopen: (_, actor) =>
    actor.kind === "human" ? null : { key: "transition.humanReopenOnly", params: undefined },
  lease_expired: (_, actor) =>
    actor.kind === "system" ? null : { key: "transition.systemLeaseOnly", params: undefined },
};

export function transition<T extends TaskState>(
  task: T,
  action: TaskAction,
  actor: Actor,
  now: Date,
): T | TransitionError {
  const apply = transitions[task.status][action.type];
  if (!apply) {
    return new TransitionError(task.status, action.type, "transition.notAllowed", {
      status: task.status,
      action: action.type,
    });
  }
  // 同一个动作键下的处理函数与 action 类型一致。
  const reason = permitted[action.type](task, actor, action as never);
  if (reason) return new TransitionError(task.status, action.type, reason.key, reason.params);
  const agentId = actor.kind === "agent" ? actor.id : "";
  const lease = new Date(now.getTime() + LEASE_MS);
  return { ...task, ...apply({ task, agentId, lease, now }, action as never) };
}
