import { randomUUID } from "node:crypto";
import type { AssistantReceiveInput, AssistantReply } from "@idesk/shared/assistant-schemas";
import type {
  BaseMessage,
  EventMessageWith,
  TemplateCard,
  TemplateCardEventData,
} from "@wecom/aibot-node-sdk";
import { z } from "zod";

type Incoming = Omit<AssistantReceiveInput, "reply">;
const textMessage = z.object({ text: z.object({ content: z.string() }) });

export function incomingMessage(body: BaseMessage): Incoming | null {
  const isGroup = body.chattype === "group";
  const chatId = isGroup ? body.chatid : body.from.userid;
  if (!chatId) return null;
  return {
    channel: "wecom",
    chatId,
    externalUserId: body.from.userid,
    displayName: body.from.userid,
    isGroup,
    ...(body.msgtype === "text" ? { text: textMessage.parse(body).text.content.trim() } : {}),
  };
}

export function incomingAction(body: EventMessageWith<TemplateCardEventData>): Incoming | null {
  const key = body.event.event_key;
  if (!key?.startsWith("action:")) return null;
  const isGroup = body.chattype === "group";
  const chatId = isGroup ? body.chatid : body.from.userid;
  if (!chatId) return null;
  return {
    channel: "wecom",
    chatId,
    externalUserId: body.from.userid,
    displayName: body.from.userid,
    isGroup,
    action: key.slice("action:".length),
  };
}

export function replyCard(message: AssistantReply): TemplateCard {
  return {
    card_type: "button_interaction",
    main_title: { title: "IDesk" },
    task_id: randomUUID(),
    button_list:
      message.options?.map((option) => ({
        text: option.label,
        key: `action:${option.id}`,
      })) ?? [],
  };
}
