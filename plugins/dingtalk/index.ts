import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import { TOPIC_ROBOT } from "dingtalk-stream";
import { z } from "zod";
import type { ChannelPlugin } from "../../apps/api/src/plugins/types.ts";
import { incomingMessage, outgoingMessage, replyText, robotMessage } from "./messages.ts";
import { DingTalkStream } from "./stream.ts";

const configSchema = z.object({
  clientKey: z
    .string()
    .default("")
    .meta({ title: "Client ID / AppKey", titleEn: "Client ID / AppKey" }),
  clientSecret: z.string().default("").meta({ title: "Client Secret", titleEn: "Client Secret" }),
  robotCode: z.string().default("").meta({ title: "Robot Code", titleEn: "Robot Code" }),
});
const webhookResult = z.object({ errcode: z.number() });
let client: DingTalkStream | undefined;
let robotCode = "";
let stop: (() => void) | undefined;

async function send(chatId: string, message: AssistantReply): Promise<void> {
  if (!client) throw new Error("钉钉连接未就绪");
  try {
    const token = z.string().parse(await client.getAccessToken());
    const request = outgoingMessage(chatId, message, robotCode);
    const response = await fetch(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-acs-dingtalk-access-token": token },
      body: JSON.stringify(request.body),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error("钉钉消息发送失败");
  } catch {
    throw new Error("钉钉消息发送失败：请检查凭据、机器人权限与网络");
  }
}

export default {
  id: "dingtalk",
  name: "钉钉",
  version: "0.1.0",
  kind: "channel",
  channel: "dingtalk",
  enabledByDefault: false,
  configSchema,
  send,
  async setup(ctx) {
    const config = ctx.config as z.infer<typeof configSchema>;
    if (!config.clientKey || !config.clientSecret || !config.robotCode) {
      ctx.assistant.status({
        connected: false,
        lastError: "连接失败：缺少 Client ID、Client Secret 或 Robot Code",
      });
      return;
    }
    let active = true;
    const ws = new DingTalkStream(
      { clientId: config.clientKey, clientSecret: config.clientSecret },
      (value) => {
        if (active) ctx.assistant.status(value);
      },
    );
    client = ws;
    robotCode = config.robotCode;
    ws.registerCallbackListener(TOPIC_ROBOT, (frame) => {
      ws.socketCallBackResponse(frame.headers.messageId, {});
      const process = async () => {
        const message = robotMessage.parse(JSON.parse(frame.data));
        const input = incomingMessage(message);
        if (!input) return;
        const reply = async (value: AssistantReply) => {
          if (!active) return;
          const response = await fetch(message.sessionWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ msgtype: "text", text: { content: replyText(value) } }),
          });
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error("钉钉回复失败");
          }
          if (webhookResult.parse(await response.json()).errcode !== 0)
            throw new Error("钉钉回复失败");
        };
        if (input.text === undefined) await reply({ text: "目前只支持文字" });
        else await ctx.assistant.receive({ ...input, reply });
      };
      void process().catch(() => {
        if (active)
          ctx.assistant.status({ connected: ws.connected, lastError: "钉钉消息处理失败" });
      });
    });
    stop = () => {
      active = false;
      client = undefined;
      robotCode = "";
      ws.disconnect();
      ws.removeAllListeners();
      ctx.assistant.status({ connected: false });
    };
    await ws.connect();
  },
  teardown() {
    stop?.();
    stop = undefined;
  },
} satisfies ChannelPlugin;
