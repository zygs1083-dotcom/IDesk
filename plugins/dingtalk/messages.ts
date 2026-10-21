import type { AssistantReceiveInput, AssistantReply } from "@idesk/shared/assistant-schemas";
import { z } from "zod";

export const robotMessage = z.object({
  conversationId: z.string(),
  conversationType: z.enum(["1", "2"]),
  senderStaffId: z.string().min(1),
  senderNick: z.string(),
  sessionWebhook: z.url(),
  msgtype: z.string(),
  isInAtList: z.boolean().optional(),
  text: z.object({ content: z.string() }).optional(),
});
export type RobotMessage = z.infer<typeof robotMessage>;
type Incoming = Omit<AssistantReceiveInput, "reply">;
const commands: Record<string, string> = { confirm: "确认", cancel: "取消", publish: "发布" };
const route = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("group"), id: z.string() }),
  z.object({ kind: z.literal("single"), id: z.string() }),
]);

export function incomingMessage(message: RobotMessage): Incoming | null {
  const isGroup = message.conversationType === "2";
  if (isGroup && !message.isInAtList) return null;
  return {
    channel: "dingtalk",
    chatId: JSON.stringify({
      kind: isGroup ? "group" : "single",
      id: isGroup ? message.conversationId : message.senderStaffId,
    }),
    externalUserId: message.senderStaffId,
    displayName: message.senderNick,
    isGroup,
    ...(message.msgtype === "text" && message.text ? { text: message.text.content.trim() } : {}),
  };
}

export function replyText(message: AssistantReply): string {
  return [
    message.text,
    ...(message.options?.map((option) => commands[option.id] ?? option.label) ?? []),
  ].join("\n");
}

export function outgoingMessage(chatId: string, message: AssistantReply, robotCode: string) {
  const target = route.parse(JSON.parse(chatId));
  return {
    url: `https://api.dingtalk.com/v1.0/robot/${target.kind === "group" ? "groupMessages/send" : "oToMessages/batchSend"}`,
    body: {
      robotCode,
      msgKey: "sampleText",
      msgParam: JSON.stringify({ content: replyText(message) }),
      ...(target.kind === "group" ? { openConversationId: target.id } : { userIds: [target.id] }),
    },
  };
}
