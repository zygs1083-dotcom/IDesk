import type { TaskAction } from "@idesk/shared/task-machine";
import { idSchema, reportSchema, taskActionSchema } from "@idesk/shared/task-schemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { agentActor, type PublicAgent } from "../../core/agents/agents.ts";
import { actOnTask, reportProgress } from "../../core/tasks/transition.ts";
import { toolResult } from "../result.ts";

const actions = [
  ["claim", "领取一个能力匹配的待领取任务。"],
  ["accept", "接受指定给自己的任务。"],
  ["join", "加入一个能力匹配的招募任务。"],
  ["complete", "提交结果并完成自己负责的任务。"],
  ["handoff", "附上上下文，将任务交给指定智能体或放回待领取。"],
  ["pause", "暂停自己负责的任务。"],
  ["release", "将自己负责的任务放回待领取。"],
  ["resume", "恢复自己暂停的任务。"],
] as const;

export function registerActionTools(server: McpServer, agent: PublicAgent) {
  const actor = agentActor(agent);
  for (const [type, description] of actions) {
    const schema = taskActionSchema.options.find(
      (option) => option.shape.type.value === type,
    ) as (typeof taskActionSchema.options)[number];
    const { type: actionType, ...shape } = schema.shape;
    server.registerTool(
      `idesk_${type}_task`,
      { description, inputSchema: { taskId: idSchema.shape.id, ...shape } },
      ({
        taskId,
        ...input
      }: {
        taskId: string;
        result?: string;
        to?: string | null;
        note?: string;
      }) =>
        toolResult(actOnTask(taskId, { ...input, type: actionType.value } as TaskAction, actor)),
    );
  }
  server.registerTool(
    "idesk_report",
    {
      description: "汇报自己负责的任务进展并续租。",
      inputSchema: { taskId: idSchema.shape.id, ...reportSchema.shape },
    },
    ({ taskId, message }) => toolResult(reportProgress(taskId, actor, message)),
  );
}
