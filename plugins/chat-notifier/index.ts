import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Event } from "../../apps/api/src/core/events/bus.ts";
import { agents, tasks } from "../../apps/api/src/db/schema.ts";
import type { Plugin, PluginContext } from "../../apps/api/src/plugins/types.ts";

type Task = typeof tasks.$inferSelect;

const configSchema = z.object({
  format: z.enum(["feishu", "slack", "telegram", "text"]).default("text").meta({ title: "格式" }),
  webhookUrl: z.url().optional().meta({ title: "Webhook 地址" }),
  chatId: z.string().optional().meta({ title: "Chat ID" }),
  events: z
    .string()
    .default("task.created,task.complete,task.lease_expired,webhook.failed")
    .meta({ title: "事件" }),
});
type Config = z.infer<typeof configSchema>;

const messages: Record<string, (title: string, agent: string) => string> = {
  "task.created": (title) => `新任务：${title}`,
  "task.claim": (title, agent) => `${agent} 领取了 ${title}`,
  "task.accept": (title, agent) => `${agent} 领取了 ${title}`,
  "task.complete": (title, agent) => `${agent} 完成了 ${title}`,
  "task.handoff": (title, agent) => `${agent} 交接了 ${title}`,
  "task.lease_expired": (title) => `租约到期：${title}`,
  "webhook.failed": (_title, agent) => `Webhook 失败：${agent}`,
};

const bodies: Record<Config["format"], (text: string, chatId?: string) => object> = {
  feishu: (text) => ({ msg_type: "text", content: { text } }),
  slack: (text) => ({ text }),
  telegram: (text, chatId) => ({ chat_id: chatId, text }),
  text: (text) => ({ text }),
};

function message(ctx: PluginContext, event: Event): string {
  const title = event.taskId
    ? (ctx.db.select().from(tasks).where(eq(tasks.id, event.taskId)).get() as Task).title
    : "";
  const agentId =
    event.type === "webhook.failed" ? (event.payload.agentId as string) : event.agentId;
  const agent = agentId
    ? (ctx.db.select().from(agents).where(eq(agents.id, agentId)).get()?.name ?? agentId)
    : "管理员";
  const text = messages[event.type]?.(title, agent) ?? `${event.type}：${title}`;
  return ctx.publicUrl && event.taskId
    ? `${text}\n${ctx.publicUrl.replace(/\/+$/, "")}/desk?task=${event.taskId}`
    : text;
}

async function send(
  ctx: PluginContext,
  event: Event,
  webhookUrl: string,
  body: string,
): Promise<void> {
  let error: string;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    await response.body?.cancel();
    if (response.ok) return;
    error = `HTTP ${response.status}`;
  } catch (failure) {
    error = failure instanceof Error ? failure.message : String(failure);
  }
  ctx.events.emit({ type: "chat.failed", payload: { type: event.type, error } });
}

export default {
  id: "chat-notifier",
  name: "Chat notifier",
  version: "0.1.0",
  kind: "notifier",
  enabledByDefault: false,
  configSchema,
  setup(ctx) {
    const config = ctx.config as Config;
    const { webhookUrl } = config;
    if (!webhookUrl) throw new Error("请先配置 Webhook 地址");
    const selected = new Set(
      config.events
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean),
    );
    ctx.events.on("*", (event) => {
      // chat.failed 不推送：推送失败会再触发 chat.failed，无限循环。
      if (event.type === "chat.failed" || !selected.has(event.type)) return;
      const body = JSON.stringify(bodies[config.format](message(ctx, event), config.chatId));
      void send(ctx, event, webhookUrl, body);
    });
  },
} satisfies Plugin;
