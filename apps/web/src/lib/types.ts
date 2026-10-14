import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import type { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";

export type Task = z.infer<typeof taskSchema>;
export type Agent = z.infer<typeof publicAgentSchema>;
export type TaskEvent = z.infer<typeof eventSchema>;
