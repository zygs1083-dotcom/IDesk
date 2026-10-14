import type { RelayRecipient } from "@idesk/shared/relay";
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
    const to = event.payload.to as RelayRecipient;
    return `${agentName(event.agentId)} 发消息给 ${recipientText(to, agentName)}`;
  }
  if (event.type === "task.dependencies") return `${agentName(event.agentId)} 修改了依赖`;
  if (event.type === "task.created") return `${agentName(event.agentId)} 发布了`;
  if (event.type.startsWith("task.")) {
    const action = event.type.slice(5);
    if (action in ACTION_LABEL)
      return `${agentName(event.agentId)} ${ACTION_LABEL[action as TaskAction["type"]]}了`;
  }
  if (event.type === "agent.registered") return `新建了智能体 ${String(event.payload.name)}`;
  return event.type;
}

function recipientText(to: RelayRecipient, agentName: (id: string | null) => string): string {
  switch (to.kind) {
    case "agent":
      return agentName(to.id);
    case "capability":
      return `能力 ${to.value}`;
    case "broadcast":
      return "全体";
  }
}
