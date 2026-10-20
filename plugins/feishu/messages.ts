import type { AssistantReceiveInput, AssistantReply } from "@idesk/shared/assistant-schemas";
import type { Client, EventHandles, RawCardActionEvent } from "@larksuiteoapi/node-sdk";
import { z } from "zod";

type MessageEvent = Parameters<NonNullable<EventHandles["im.message.receive_v1"]>>[0];
type Incoming = Omit<AssistantReceiveInput, "reply">;
const textContent = z.object({ text: z.string() });
const cardValue = z.object({ action: z.string().startsWith("action:") });

export function incomingMessage(event: MessageEvent, botOpenId: string): Incoming | null {
  const { message, sender } = event;
  const externalUserId = sender.sender_id?.open_id;
  if (sender.sender_type !== "user" || !externalUserId) return null;
  const isGroup = message.chat_type === "group";
  const botMention = message.mentions?.find((mention) => mention.id.open_id === botOpenId);
  if (isGroup && !botMention) return null;
  let text: string | undefined;
  if (message.message_type === "text") {
    text = textContent.parse(JSON.parse(message.content)).text;
    if (botMention) text = text.replaceAll(botMention.key, "");
    text = text.trim();
  }
  return {
    channel: "feishu",
    chatId: message.chat_id,
    externalUserId,
    displayName: externalUserId,
    isGroup,
    ...(text === undefined ? {} : { text }),
  };
}

export function incomingAction(event: RawCardActionEvent, isGroup: boolean): Incoming | null {
  const chatId = event.context?.open_chat_id;
  const externalUserId = event.operator?.open_id;
  const value = cardValue.safeParse(event.action?.value);
  if (!chatId || !externalUserId || !value.success) return null;
  return {
    channel: "feishu",
    chatId,
    externalUserId,
    displayName: event.operator?.name ?? externalUserId,
    isGroup,
    action: value.data.action.slice("action:".length),
  };
}

export function outgoingMessage(
  chatId: string,
  message: AssistantReply,
): Parameters<Client["im"]["v1"]["message"]["create"]>[0] {
  const options = message.options;
  const content = options?.length
    ? {
        schema: "2.0",
        body: {
          elements: [
            { tag: "markdown", content: message.text },
            ...options.map((option) => ({
              tag: "button",
              text: { tag: "plain_text", content: option.label },
              type: "default",
              behaviors: [{ type: "callback", value: { action: `action:${option.id}` } }],
            })),
          ],
        },
      }
    : { text: message.text };
  return {
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      msg_type: options?.length ? "interactive" : "text",
      content: JSON.stringify(content),
    },
  };
}
