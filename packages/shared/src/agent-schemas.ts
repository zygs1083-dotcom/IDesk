import { z } from "zod";
import { capabilitiesSchema } from "./capabilities.ts";

export const AGENT_KINDS = [
  "claude-code",
  "codex",
  "gemini",
  "opencode",
  "droid",
  "cursor",
  "n8n",
  "script",
  "custom",
] as const;
export const AGENT_KIND_LABELS: Record<(typeof AGENT_KINDS)[number], string> = {
  "claude-code": "claude-code",
  codex: "codex",
  gemini: "Gemini",
  opencode: "OpenCode",
  droid: "Droid",
  cursor: "Cursor",
  n8n: "n8n",
  script: "script",
  custom: "custom",
};
export const registerAgentSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(AGENT_KINDS),
  host: z.string(),
  capabilities: capabilitiesSchema,
  webhookUrl: z.url().exactOptional(),
});
export const patchAgentSchema = z.object({
  name: registerAgentSchema.shape.name.exactOptional(),
  host: registerAgentSchema.shape.host.exactOptional(),
  capabilities: registerAgentSchema.shape.capabilities.exactOptional(),
  webhookUrl: z
    .union([z.url(), z.literal("••••••")])
    .nullable()
    .exactOptional(),
});
export const patchMeSchema = z.object({ webhookUrl: z.url().nullable() });
export const heartbeatSchema = z.object({ client: z.string().min(1).max(120).exactOptional() });
export const webhookTestResultSchema = z
  .object({
    ok: z.boolean(),
    status: z.number().int().nullable(),
    durationMs: z.number(),
    error: z.string().nullable(),
    notifierEnabled: z.boolean(),
  })
  .meta({ id: "WebhookTestResult" });
export const loginSchema = z.object({ password: z.string() });
export const authMeSchema = z.object({ role: z.enum(["admin", "viewer"]) });
export const publicAgentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(AGENT_KINDS),
    host: z.string(),
    capabilities: z.array(z.string()),
    webhookUrl: z.string().nullable(),
    lastSeenAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    status: z.enum(["online", "offline"]),
  })
  .meta({ id: "PublicAgent" });
export const registeredAgentSchema = z.object({ agent: publicAgentSchema, apiKey: z.string() });

export const agentStatsSchema = z
  .object({
    completed: z.number(),
    last7dCompleted: z.number(),
    handoffs: z.number(),
    reported: z.number(),
    avgDurationMs: z.number().nullable(),
  })
  .meta({ id: "AgentStats" });
