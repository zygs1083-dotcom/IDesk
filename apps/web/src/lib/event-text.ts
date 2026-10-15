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
  if (event.type === "task.lease_expired") return "租约到期，放回了";
  if (event.type.startsWith("task.")) {
    const action = event.type.slice(5);
    if (action in ACTION_LABEL)
      return `${agentName(event.agentId)} ${ACTION_LABEL[action as TaskAction["type"]]}了`;
  }
  if (event.type === "agent.registered") return `新建了智能体 ${String(event.payload.name)}`;
  if (event.type === "agent.updated") return `修改了智能体 ${String(event.payload.name)}`;
  if (event.type === "agent.deleted") return `删除了智能体 ${String(event.payload.name)}`;
  if (event.type === "connector.polled") {
    const name = event.payload.name === undefined ? "连接器" : ` ${String(event.payload.name)}`;
    return `同步了${name}，${String(event.payload.changed)} 项变化`;
  }
  if (event.type === "schedule.fired") {
    const name = event.payload.name === undefined ? "" : `「${String(event.payload.name)}」`;
    return event.payload.status === "success"
      ? `定时任务${name}执行了`
      : `定时任务${name}执行失败：${String(event.payload.error)}`;
  }
  if (event.type === "webhook.failed")
    return `推送给 ${agentName(String(event.payload.agentId))} 失败：${String(event.payload.error)}`;
  if (event.type === "chat.failed") return `聊天通知失败：${String(event.payload.error)}`;
  if (event.type === "archive.events") return `归档了 ${String(event.payload.count)} 条事件`;
  const dot = event.type.indexOf(".");
  return `${event.type.slice(0, dot)}插件：${event.type.slice(dot + 1)}`;
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
