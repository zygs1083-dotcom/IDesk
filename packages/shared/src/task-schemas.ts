import { z } from "zod";
import type { TaskAction } from "./task-machine.ts";
import { TASK_PRIORITIES, TASK_STATUSES } from "./task-status.ts";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  body: z.string().exactOptional(),
  priority: z.enum(TASK_PRIORITIES).exactOptional(),
  tags: z.array(z.string()).exactOptional(),
  blockedBy: z.array(z.string()).exactOptional(),
  capabilities: z.array(z.string()).exactOptional(),
  dueAt: z.iso.datetime().exactOptional(),
});
export const taskActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("claim") }),
  z.object({ type: z.literal("assign"), agentId: z.string() }),
  z.object({ type: z.literal("recruit"), needed: z.number().int().min(2) }),
  z.object({ type: z.literal("cancel") }),
  z.object({ type: z.literal("accept") }),
  z.object({ type: z.literal("decline") }),
  z.object({ type: z.literal("join") }),
  z.object({ type: z.literal("cancel_recruit") }),
  z.object({ type: z.literal("heartbeat") }),
  z.object({ type: z.literal("complete"), result: z.string() }),
  z.object({ type: z.literal("pause") }),
  z.object({
    type: z.literal("handoff"),
    to: z.string().nullable().default(null),
    note: z.string(),
  }),
  z.object({ type: z.literal("release") }),
  z.object({ type: z.literal("resume") }),
  z.object({ type: z.literal("reopen") }),
]) satisfies z.ZodType<TaskAction>;
export const taskDependenciesSchema = z.object({ blockedBy: z.array(z.string()) });
export const reportSchema = z.object({ message: z.string() });
export const taskQuerySchema = z.object({
  q: z.string().min(1).exactOptional(),
  status: z.enum(TASK_STATUSES).exactOptional(),
  capability: z.string().exactOptional(),
  assignee: z.string().exactOptional(),
});
export const idSchema = z.object({ id: z.string() });
export const eventQuerySchema = z.object({
  since: z.string().exactOptional(),
  type: z.string().exactOptional(),
  agentId: z.string().exactOptional(),
});
export const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    tags: z.array(z.string()),
    blockedBy: z.array(z.string()),
    capabilities: z.array(z.string()),
    publisherId: z.string(),
    assigneeId: z.string().nullable(),
    recruit: z.object({ needed: z.number(), joined: z.array(z.string()) }).nullable(),
    leaseExpiresAt: z.iso.datetime().nullable(),
    result: z.string().nullable(),
    dueAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Task" });
export const eventSchema = z
  .object({
    id: z.string(),
    ts: z.iso.datetime(),
    type: z.string(),
    taskId: z.string().nullable(),
    agentId: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .meta({ id: "Event" });
export const errorSchema = z.object({ error: z.string() });
