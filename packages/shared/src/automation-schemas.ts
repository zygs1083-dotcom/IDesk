import { z } from "zod";

const configSchema = z.record(z.string(), z.unknown());
const runStatusSchema = z.enum(["waiting", "running", "success", "failed", "canceled"]);
export const createConnectorSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().min(1),
  config: configSchema,
  enabled: z.boolean().exactOptional(),
  pollIntervalSec: z.number().int().positive().exactOptional(),
});
export const patchConnectorSchema = createConnectorSchema.partial();
export const testConnectorSchema = z.object({
  pluginId: z.string().min(1),
  config: configSchema,
  id: z.string().exactOptional(),
});
export const connectorSchema = z
  .object({
    id: z.string(),
    pluginId: z.string(),
    name: z.string(),
    config: configSchema,
    enabled: z.boolean(),
    pollIntervalSec: z.number().int(),
    canTrigger: z.boolean(),
    lastPolledAt: z.iso.datetime().nullable(),
    lastError: z.string().nullable(),
    progress: z.object({ done: z.number().int(), total: z.number().int() }).nullable(),
  })
  .meta({ id: "Connector" });
export const connectionResultSchema = z.object({
  success: z.boolean(),
  error: z.string().exactOptional(),
});
export const pollResultSchema = z.object({ refreshed: z.boolean(), connector: connectorSchema });
export const automationQuerySchema = z.object({ connectorId: z.string().exactOptional() });
export const automationJobSchema = z
  .object({
    id: z.string(),
    connectorId: z.string(),
    externalId: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    url: z.string().nullable(),
    lastRunStatus: runStatusSchema.nullable(),
    lastRunAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "AutomationJob" });
export const automationRunSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    externalId: z.string(),
    status: runStatusSchema,
    trigger: z.string().nullable(),
    startedAt: z.iso.datetime().nullable(),
    finishedAt: z.iso.datetime().nullable(),
    url: z.string().nullable(),
    error: z.string().nullable(),
  })
  .meta({ id: "AutomationRun" });

export const automationRunWithJobSchema = automationRunSchema.extend({ jobName: z.string() });
