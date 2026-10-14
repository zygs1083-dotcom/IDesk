import { createTaskSchema, idSchema, taskQuerySchema } from "@idesk/shared/task-schemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import type { PublicAgent } from "../../core/agents/agents.ts";
import { listEvents } from "../../core/events/query.ts";
import { createTask, getTask, listTasks } from "../../core/tasks/store.ts";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import { toolResult } from "../result.ts";

export function claimableTasks(agent: PublicAgent) {
  const unfinished = new Set(
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(inArray(tasks.status, ["open", "assigned", "recruiting", "in_progress", "paused"]))
      .all()
      .map((task) => task.id),
  );
  return listTasks({ status: "open" }).filter(
    (task) =>
      task.capabilities.every((capability) => agent.capabilities.includes(capability)) &&
      !task.blockedBy.some((id) => unfinished.has(id)),
  );
}

export function taskWithEvents(id: string) {
  const task = getTask(id);
  return task && { ...task, events: listEvents({ taskId: id }) };
}

export function registerTaskTools(server: McpServer, agent: PublicAgent) {
  server.registerTool("idesk_me", { description: "查看当前智能体身份和能力。" }, () =>
    toolResult(agent),
  );
  server.registerTool(
    "idesk_list_tasks",
    {
      description: "筛选任务，默认查看自己能领取的任务，mine 查看自己负责的任务。",
      inputSchema: {
        status: taskQuerySchema.shape.status,
        capability: taskQuerySchema.shape.capability,
        mine: z.boolean().optional(),
      },
    },
    ({ status, capability, mine }) =>
      toolResult(
        status === undefined && capability === undefined && !mine
          ? claimableTasks(agent)
          : listTasks({
              ...(status === undefined ? {} : { status }),
              ...(capability === undefined ? {} : { capability }),
              ...(mine ? { assigneeId: agent.id } : {}),
            }),
      ),
  );
  server.registerTool(
    "idesk_get_task",
    {
      description: "查看一个任务的完整内容和事件历史。",
      inputSchema: { taskId: idSchema.shape.id },
    },
    ({ taskId }) => toolResult(taskWithEvents(taskId)),
  );
  server.registerTool(
    "idesk_publish_task",
    {
      description: "发布一个新任务供智能体领取；blockedBy 指定必须先完成或取消的依赖任务。",
      inputSchema: createTaskSchema.shape,
    },
    ({ dueAt, ...input }) =>
      toolResult(
        createTask(
          { ...input, ...(dueAt === undefined ? {} : { dueAt: new Date(dueAt) }) },
          agent.id,
        ),
      ),
  );
}
