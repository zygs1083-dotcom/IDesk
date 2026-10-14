import type { connectorSchema } from "@idesk/shared/automation-schemas";
import type { createScheduleSchema, scheduleSchema } from "@idesk/shared/schedule-schemas";
import type { z } from "zod";

export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleInput = z.infer<typeof createScheduleSchema>;
export type Connector = z.infer<typeof connectorSchema>;
