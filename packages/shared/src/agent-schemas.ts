import { z } from "zod";

export const AGENT_KINDS = ["claude-code", "codex", "n8n", "script", "custom"] as const;
export const registerAgentSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(AGENT_KINDS),
  host: z.string(),
  capabilities: z.array(z.string()),
  webhookUrl: z.url().exactOptional(),
});
export const patchAgentSchema = z.object({
  name: registerAgentSchema.shape.name.exactOptional(),
  host: registerAgentSchema.shape.host.exactOptional(),
  capabilities: registerAgentSchema.shape.capabilities.exactOptional(),
  webhookUrl: z.url().nullable().exactOptional(),
});
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
