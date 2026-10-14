import { z } from "zod";
import { TASK_ACTIONS, TASK_OUTCOMES, TASK_STATUSES } from "./task-status.js";
import { AUTOMATION_STATUSES } from "./automation.js";

export const AGENT_KINDS = ["claude-code", "codex", "openclaw", "n8n", "script", "human", "other"] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];
export const AGENT_PRESENCE = ["online", "busy", "offline"] as const;
export type AgentPresence = (typeof AGENT_PRESENCE)[number];

const capability = z.string().trim().min(1).max(40);
const tag = z.string().trim().min(1).max(40);

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskOutcomeSchema = z.enum(TASK_OUTCOMES);
export const taskActionSchema = z.enum(TASK_ACTIONS);
export const automationStatusSchema = z.enum(AUTOMATION_STATUSES);

export const publishTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50_000).default(""),
  priority: z.number().int().min(0).max(3).default(1),
  tags: z.array(tag).max(20).default([]),
  requiredCapabilities: z.array(capability).max(20).default([]),
  minAgents: z.number().int().min(1).max(20).default(1),
  payload: z.unknown().optional(),
  deadline: z.iso.datetime().nullable().optional(),
  leaseTtlSeconds: z.number().int().min(30).max(86_400).default(600),
  parentId: z.string().nullable().optional(),
  /** Pre-assign to an agent (owner only). */
  assigneeId: z.string().nullable().optional(),
});
export type PublishTaskInput = z.input<typeof publishTaskSchema>;

export const updateTaskSchema = publishTaskSchema
  .pick({ title: true, description: true, priority: true, tags: true, requiredCapabilities: true, deadline: true, payload: true })
  .partial();

export const artifactSchema = z.object({
  kind: z.enum(["url", "path", "branch", "text", "other"]).default("other"),
  label: z.string().max(200).optional(),
  value: z.string().max(20_000),
});
export type Artifact = z.infer<typeof artifactSchema>;

/** Transfer a task; also writes a `handoff` relay message. */
export const handoffSchema = z.object({
  toAgentId: z.string().nullable().optional(),
  context: z.string().max(50_000).default(""),
  artifacts: z.array(artifactSchema).max(50).default([]),
});
export type HandoffInput = z.input<typeof handoffSchema>;

/** Relay (传递区): the place where agents pass information to each other. */
export const RELAY_KINDS = ["note", "handoff", "request", "reply"] as const;
export type RelayKind = (typeof RELAY_KINDS)[number];

export const sendRelaySchema = z.object({
  kind: z.enum(RELAY_KINDS).default("note"),
  taskId: z.string().nullable().optional(),
  /** Exactly one of toAgentId / toCapability, or neither for a broadcast. */
  toAgentId: z.string().nullable().optional(),
  toCapability: capability.nullable().optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().max(50_000).default(""),
  artifacts: z.array(artifactSchema).max(50).default([]),
  replyTo: z.string().nullable().optional(),
});
export type SendRelayInput = z.input<typeof sendRelaySchema>;

export const completeTaskSchema = z.object({
  outcome: z.enum(["success", "failed"]).default("success"),
  result: z.unknown().optional(),
  summary: z.string().max(20_000).optional(),
});

export const progressSchema = z.object({
  message: z.string().trim().min(1).max(20_000),
  percent: z.number().min(0).max(100).optional(),
});

export const assignSchema = z.object({ agentId: z.string().min(1) });

export const registerAgentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(AGENT_KINDS).default("other"),
  host: z.string().trim().max(120).default(""),
  capabilities: z.array(capability).max(50).default([]),
  maxConcurrent: z.number().int().min(1).max(100).default(1),
  webhookUrl: z.url().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RegisterAgentInput = z.input<typeof registerAgentSchema>;

export const heartbeatSchema = z.object({
  presence: z.enum(["online", "busy"]).default("online"),
  load: z.number().min(0).max(1).optional(),
});

export const scheduleActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("publish_task"), task: publishTaskSchema }),
  z.object({
    kind: z.literal("connector.trigger"),
    connectorId: z.string(),
    jobExternalId: z.string(),
    params: z.unknown().optional(),
  }),
  z.object({
    kind: z.literal("http"),
    url: z.url(),
    method: z.enum(["GET", "POST"]).default("POST"),
    body: z.unknown().optional(),
  }),
]);
export type ScheduleAction = z.infer<typeof scheduleActionSchema>;

export const scheduleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cron: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(64).default("Asia/Shanghai"),
  enabled: z.boolean().default(true),
  action: scheduleActionSchema,
});

export const connectorSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean().default(true),
  pollIntervalSeconds: z.number().int().min(30).max(3600).default(60),
});
