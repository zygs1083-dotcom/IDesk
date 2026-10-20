import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { people, tasks } from "../../db/schema.ts";
import { getTask, listTasks } from "../tasks/store.ts";
import {
  agentSummary,
  automationSummary,
  humanInbox,
  scheduleSummary,
  serverSummary,
  taskEvents,
  taskLink,
} from "./queries.ts";
import type { Session } from "./sessions.ts";
import { redact } from "./settings.ts";
import { type ToolCall, toolSchemas } from "./tool-schemas.ts";

export function executeTool(session: Session, call: ToolCall): string {
  const person = db.select().from(people).where(eq(people.id, session.personId)).get();
  if (!person) return '{"error":"Person no longer exists"}';
  if (!Object.hasOwn(toolSchemas, call.name)) return '{"error":"Unknown tool"}';
  try {
    let result: object;
    switch (call.name) {
      case "list_tasks": {
        const { mine, limit = 10, ...filter } = toolSchemas.list_tasks.parse(call.input);
        const rows = mine
          ? db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.publisherId, person.id),
                  filter.status ? eq(tasks.status, filter.status) : undefined,
                ),
              )
              .orderBy(desc(tasks.updatedAt), desc(tasks.id))
              .all()
              .filter((row) => !filter.q || `${row.title}\n${row.body}`.includes(filter.q))
              .slice(0, limit)
          : listTasks({ ...filter, limit });
        result = rows.map(({ id, title, status, priority, publisherId, assigneeId }) => ({
          id,
          title,
          status,
          priority,
          publisherId,
          assigneeId,
          url: taskLink(id),
        }));
        break;
      }
      case "get_task": {
        const { id } = toolSchemas.get_task.parse(call.input);
        const task = getTask(id);
        result = task
          ? { ...task, events: taskEvents(id), url: taskLink(id) }
          : { error: "Task not found" };
        break;
      }
      case "list_agents":
        toolSchemas.list_agents.parse(call.input);
        result = agentSummary();
        break;
      case "list_servers":
        toolSchemas.list_servers.parse(call.input);
        result = serverSummary();
        break;
      case "automation_summary":
        result = automationSummary(toolSchemas.automation_summary.parse(call.input));
        break;
      case "list_schedules":
        toolSchemas.list_schedules.parse(call.input);
        result = scheduleSummary();
        break;
      case "human_inbox":
        toolSchemas.human_inbox.parse(call.input);
        result = humanInbox();
        break;
      case "draft_task": {
        if (person.role !== "member") return '{"error":"Read only"}';
        const task = toolSchemas.draft_task.parse(call.input);
        session.draft = { kind: "task", task: { ...task, priority: task.priority ?? "normal" } };
        result = { draft: session.draft, confirmationRequired: true };
        break;
      }
      case "request_cancel": {
        if (person.role !== "member") return '{"error":"Read only"}';
        const { taskId } = toolSchemas.request_cancel.parse(call.input);
        const task = getTask(taskId);
        if (!task || task.publisherId !== person.id || ["done", "cancelled"].includes(task.status))
          return '{"error":"Cannot cancel this task"}';
        session.draft = { kind: "cancel", taskId };
        result = { draft: session.draft, title: task.title, confirmationRequired: true };
        break;
      }
      default:
        return '{"error":"Unknown tool"}';
    }
    return redact(JSON.stringify(result));
  } catch (error) {
    if (error instanceof z.ZodError) return '{"error":"Invalid tool arguments"}';
    throw error;
  }
}
