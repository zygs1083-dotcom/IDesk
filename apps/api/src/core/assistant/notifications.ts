import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { agents, taskOrigins } from "../../db/schema.ts";
import { channelPlugin } from "../../plugins/registry.ts";
import { type Event, emitEvent, onEvent } from "../events/bus.ts";
import { getTask } from "../tasks/store.ts";
import { taskLink } from "./queries.ts";
import { redact } from "./settings.ts";

async function notify(event: Event): Promise<void> {
  if (event.taskId === null) return;
  const origin = db.select().from(taskOrigins).where(eq(taskOrigins.taskId, event.taskId)).get();
  const task = getTask(event.taskId);
  if (!origin || !task) return;
  const agentId = event.agentId ?? task.assigneeId;
  const agent = agentId
    ? db.select({ name: agents.name }).from(agents).where(eq(agents.id, agentId)).get()
    : undefined;
  const text =
    event.type === "task.cancel"
      ? `${task.title} 已取消`
      : event.type === "task.complete"
        ? `${agent?.name ?? "智能体"} 完成了 ${task.title}\n${(task.result ?? "").slice(0, 500)}\n${taskLink(task.id)}`
        : `${agent?.name ?? "智能体"} 开始处理 ${task.title}`;
  try {
    const plugin = channelPlugin(origin.channel);
    if (!plugin) throw new Error("渠道未启用");
    await plugin.send(origin.chatId, { text: redact(text).slice(0, 1500) });
  } catch (error) {
    emitEvent({
      type: "assistant.notify_failed",
      taskId: task.id,
      payload: {
        taskId: task.id,
        channel: origin.channel,
        error: redact(error instanceof Error ? error.message : String(error)),
      },
    });
  }
}

export function startAssistantNotifications(): () => void {
  const unsubscribes = ["task.claim", "task.accept", "task.complete", "task.cancel"].map((type) =>
    onEvent(type, (event) => {
      void notify(event);
    }),
  );
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}
