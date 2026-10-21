import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import {
  Client,
  EventDispatcher,
  type RawCardActionEvent,
  WSClient,
} from "@larksuiteoapi/node-sdk";
import { z } from "zod";
import type { ChannelPlugin } from "../../apps/api/src/plugins/types.ts";
import { incomingAction, incomingMessage, outgoingMessage } from "./messages.ts";

const configSchema = z.object({
  appId: z.string().default("").meta({ title: "App ID", titleEn: "App ID" }),
  appSecret: z.string().default("").meta({ title: "App Secret", titleEn: "App Secret" }),
});
const botInfo = z.object({ code: z.literal(0), bot: z.object({ open_id: z.string() }) });
const logger = { error() {}, warn() {}, info() {}, debug() {}, trace() {} };
let client: Client | undefined;
let stop: (() => void) | undefined;

async function send(chatId: string, message: AssistantReply): Promise<void> {
  if (!client) throw new Error("飞书连接未就绪");
  try {
    const result = await client.im.v1.message.create(outgoingMessage(chatId, message));
    if (result.code !== 0) throw new Error("飞书消息发送失败");
  } catch {
    throw new Error("飞书消息发送失败：请检查凭据、机器人权限与网络");
  }
}

export default {
  id: "feishu",
  name: "飞书",
  version: "0.1.0",
  kind: "channel",
  channel: "feishu",
  enabledByDefault: false,
  configSchema,
  send,
  async setup(ctx) {
    const config = ctx.config as z.infer<typeof configSchema>;
    if (!config.appId || !config.appSecret) {
      ctx.assistant.status({ connected: false, lastError: "连接失败：缺少 App ID 或 App Secret" });
      return;
    }
    let active = true;
    const status: typeof ctx.assistant.status = (value) => {
      if (active) ctx.assistant.status(value);
    };
    const api = new Client({ ...config, logger });
    const ws = new WSClient({
      ...config,
      logger,
      onReady: () => status({ connected: true }),
      onReconnected: () => status({ connected: true }),
      onReconnecting: () => status({ connected: false, lastError: "连接断开，SDK 正在重连" }),
      onError: () => status({ connected: false, lastError: "连接失败：请检查飞书凭据与网络" }),
    });
    stop = () => {
      active = false;
      client = undefined;
      ws.close({ force: true });
      ctx.assistant.status({ connected: false });
    };
    const failed = () =>
      status({
        connected: ws.getConnectionStatus().state === "connected",
        lastError: "飞书消息处理失败",
      });
    try {
      const info = botInfo.parse(
        await api.request({ url: "/open-apis/bot/v3/info", method: "GET" }),
      );
      if (!active) return;
      client = api;
      const dispatcher = new EventDispatcher({ logger }).register({
        "im.message.receive_v1": (event) => {
          const process = async () => {
            const input = incomingMessage(event, info.bot.open_id);
            if (!input) return;
            const reply = (message: AssistantReply) => send(input.chatId, message);
            if (input.text === undefined) await reply({ text: "目前只支持文字" });
            else await ctx.assistant.receive({ ...input, reply });
          };
          void process().catch(failed);
        },
        "card.action.trigger": (event: RawCardActionEvent) => {
          const process = async () => {
            const chatId = event.context?.open_chat_id;
            if (!chatId) return;
            const chat = await api.im.v1.chat.get({ path: { chat_id: chatId } });
            if (chat.code !== 0 || !chat.data?.chat_mode) throw new Error("飞书会话读取失败");
            const input = incomingAction(event, chat.data.chat_mode !== "p2p");
            if (input && active) {
              await ctx.assistant.receive({ ...input, reply: (message) => send(chatId, message) });
            }
          };
          // 飞书要求三秒内确认回调；模型处理与后续发信在确认后继续。
          void process().catch(failed);
          return {};
        },
      });
      await ws.start({ eventDispatcher: dispatcher });
    } catch {
      client = undefined;
      ws.close({ force: true });
      status({ connected: false, lastError: "连接失败：请检查飞书凭据、机器人权限与网络" });
    }
  },
  teardown() {
    stop?.();
    stop = undefined;
  },
} satisfies ChannelPlugin;
