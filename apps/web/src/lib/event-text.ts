import { ACTION_LABEL, type TaskAction } from "@idesk/shared/task-machine";
import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";

export function eventText(
  event: z.infer<typeof eventSchema>,
  agentName: (id: string | null) => string,
): string {
  if (event.type === "task.reported")
    return `${agentName(event.agentId)} 汇报：${String(event.payload.message)}`;
  if (event.type === "relay.sent") {
    const to = event.payload.to as
      | { kind: "agent"; id: string }
      | { kind: "capability"; value: string }
      | { kind: "broadcast" };
    return `${agentName(event.agentId)} 发消息给 ${to.kind === "agent" ? agentName(to.id) : to.kind === "capability" ? `能力 ${to.value}` : "全体"}`;
  }
  if (event.type === "task.created") return `${agentName(event.agentId)} 发布了`;
  if (event.type.startsWith("task.")) {
    const action = event.type.slice(5);
    if (action in ACTION_LABEL)
      return `${agentName(event.agentId)} ${ACTION_LABEL[action as TaskAction["type"]]}了`;
  }
  if (event.type === "agent.registered") return `新建了智能体 ${String(event.payload.name)}`;
  return event.type;
}
