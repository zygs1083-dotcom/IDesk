import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import {
  type BaseMessage,
  type EventMessageWith,
  type TemplateCardEventData,
  WSClient,
  type WsFrame,
} from "@wecom/aibot-node-sdk";
import { z } from "zod";
import type { ChannelPlugin } from "../../apps/api/src/plugins/types.ts";
import { incomingAction, incomingMessage, replyCard } from "./messages.ts";

const configSchema = z.object({
  botId: z.string().default("").meta({ title: "Bot ID", titleEn: "Bot ID" }),
  botSecret: z.string().default("").meta({ title: "Bot Secret", titleEn: "Bot Secret" }),
});
const logger = { error() {}, warn() {}, info() {}, debug() {} };
let client: WSClient | undefined;
let stop: (() => void) | undefined;

async function send(chatId: string, message: AssistantReply): Promise<void> {
  if (!client) throw new Error("企业微信连接未就绪");
  try {
    await client.sendMessage(chatId, { msgtype: "markdown", markdown: { content: message.text } });
    if (message.options?.length) {
      await client.sendMessage(chatId, {
        msgtype: "template_card",
        template_card: replyCard(message),
      });
    }
  } catch {
    throw new Error("企业微信消息发送失败：请检查凭据、机器人权限与网络");
  }
}

export default {
  id: "wecom",
  name: "企业微信",
  version: "0.1.0",
  kind: "channel",
  channel: "wecom",
  enabledByDefault: false,
  configSchema,
  send,
  setup(ctx) {
    const config = ctx.config as z.infer<typeof configSchema>;
    if (!config.botId || !config.botSecret) {
      ctx.assistant.status({ connected: false, lastError: "连接失败：缺少 Bot ID 或 Bot Secret" });
      return;
    }
    const ws = new WSClient({ botId: config.botId, secret: config.botSecret, logger });
    client = ws;
    let active = true;
    const status: typeof ctx.assistant.status = (value) => {
      if (active) ctx.assistant.status(value);
    };
    const failed = () => status({ connected: ws.isConnected, lastError: "企业微信消息处理失败" });
    const reply = async (frame: WsFrame<BaseMessage>, message: AssistantReply) => {
      if (!active) return;
      await ws.replyStream(frame, frame.headers.req_id, message.text, true);
      if (message.options?.length) await ws.replyTemplateCard(frame, replyCard(message));
    };
    ws.on("authenticated", () => status({ connected: true }));
    ws.on("disconnected", () => status({ connected: false, lastError: "连接断开" }));
    ws.on("reconnecting", () => status({ connected: false, lastError: "连接断开，SDK 正在重连" }));
    ws.on("error", () => status({ connected: false, lastError: "连接失败：请检查企微凭据与网络" }));
    ws.on("message", (frame: WsFrame<BaseMessage>) => {
      const process = async () => {
        if (!frame.body) return;
        const input = incomingMessage(frame.body);
        if (!input) return;
        if (input.text === undefined) await reply(frame, { text: "目前只支持文字" });
        else await ctx.assistant.receive({ ...input, reply: (message) => reply(frame, message) });
      };
      void process().catch(failed);
    });
    ws.on(
      "event.template_card_event",
      (frame: WsFrame<EventMessageWith<TemplateCardEventData>>) => {
        const process = async () => {
          if (!frame.body) return;
          const input = incomingAction(frame.body);
          const taskId = frame.body.event.task_id;
          if (!input || !taskId) return;
          await ws.updateTemplateCard(frame, {
            card_type: "text_notice",
            main_title: { title: "IDesk", desc: "正在处理" },
            task_id: taskId,
          });
          if (active)
            await ctx.assistant.receive({
              ...input,
              reply: (message) => send(input.chatId, message),
            });
        };
        void process().catch(failed);
      },
    );
    stop = () => {
      active = false;
      client = undefined;
      ws.disconnect();
      ws.removeAllListeners();
      ctx.assistant.status({ connected: false });
    };
    try {
      ws.connect();
    } catch {
      client = undefined;
      ws.disconnect();
      status({ connected: false, lastError: "连接失败：请检查企微凭据与网络" });
    }
  },
  teardown() {
    stop?.();
    stop = undefined;
  },
} satisfies ChannelPlugin;
