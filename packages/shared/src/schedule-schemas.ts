import { z } from "zod";
import { createTaskSchema } from "./task-schemas.ts";

export const scheduleActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("publish_task"),
    template: createTaskSchema.omit({ dueAt: true, blockedBy: true }),
  }),
  z.object({
    type: z.literal("connector_trigger"),
    connectorId: z.string(),
    jobExternalId: z.string(),
    params: z.record(z.string(), z.string()).exactOptional(),
  }),
  z.object({
    type: z.literal("http"),
    url: z.url(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    headers: z.record(z.string(), z.string()).default({}),
    body: z.string().exactOptional(),
  }),
]);
export type ScheduleAction = z.infer<typeof scheduleActionSchema>;

export const createScheduleSchema = z.object({
  name: z.string().min(1),
  cron: z.string(),
  timezone: z.string().default("Asia/Shanghai"),
  enabled: z.boolean().default(true),
  action: scheduleActionSchema,
});
export const updateScheduleSchema = z.object({
  name: createScheduleSchema.shape.name.exactOptional(),
  cron: createScheduleSchema.shape.cron.exactOptional(),
  timezone: z.string().exactOptional(),
  enabled: z.boolean().exactOptional(),
  action: scheduleActionSchema.exactOptional(),
});
export const scheduleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cron: z.string(),
    timezone: z.string(),
    enabled: z.boolean(),
    action: scheduleActionSchema,
    lastRunAt: z.iso.datetime().nullable(),
    lastStatus: z.enum(["success", "failed"]).nullable(),
    nextRunAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Schedule" });
