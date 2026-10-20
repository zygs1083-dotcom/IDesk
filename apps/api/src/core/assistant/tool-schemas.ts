import { assistantDraftSchema } from "@idesk/shared/assistant-schemas";
import { TASK_STATUSES } from "@idesk/shared/task-status";
import { z } from "zod";

const empty = z.object({}).strict();
export const toolSchemas = {
  list_tasks: z
    .object({
      status: z.enum(TASK_STATUSES).exactOptional(),
      q: z.string().exactOptional(),
      mine: z.boolean().exactOptional(),
      limit: z.number().int().min(1).max(10).exactOptional(),
    })
    .strict(),
  get_task: z.object({ id: z.string().min(1) }).strict(),
  list_agents: empty,
  list_servers: empty,
  automation_summary: z
    .object({ connector: z.string().exactOptional(), failedOnly: z.boolean().exactOptional() })
    .strict(),
  list_schedules: empty,
  human_inbox: empty,
  draft_task: assistantDraftSchema.options[0].shape.task.strict(),
  request_cancel: z.object({ taskId: z.string().min(1) }).strict(),
};
const descriptions: Record<keyof typeof toolSchemas, string> = {
  list_tasks: "List at most 10 tasks; mine means published by the current person.",
  get_task: "Read task details and the last 10 events.",
  list_agents: "Read agent names, hosts, capabilities, online status and current tasks.",
  list_servers: "Read servers, online status and latest CPU, memory and disk metrics.",
  automation_summary:
    "Read today's run counts and the latest 10 failed workflow names/times per connector.",
  list_schedules:
    "Read schedule names, enabled status, last result and next run; no action configuration.",
  human_inbox: "Read the human inbox unread count and first 5 unanswered request titles.",
  draft_task:
    "Write or replace a task draft for human confirmation. Never publishes. Default priority normal.",
  request_cancel:
    "Prepare cancellation of a task published by the current person. Never cancels directly.",
};
export function modelTools(writable: boolean) {
  return Object.entries(toolSchemas)
    .filter(([name]) => writable || (name !== "draft_task" && name !== "request_cancel"))
    .map(([name, schema]) => ({
      name,
      description: descriptions[name as keyof typeof toolSchemas],
      input_schema: z.toJSONSchema(schema, { io: "input" }),
    }));
}
export type Json = z.infer<ReturnType<typeof z.json>>;
export type ToolCall = { id: string; name: string; input: Json };
