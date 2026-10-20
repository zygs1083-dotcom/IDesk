import { z } from "zod";
import { imChannelSchema } from "./people-schemas.ts";
import { publishTaskSchema } from "./task-schemas.ts";

export const ASSISTANT_CHANNELS = ["web", "feishu", "dingtalk", "wecom"] as const;
export type AssistantChannel = (typeof ASSISTANT_CHANNELS)[number];
export const assistantSettingsSchema = z.object({
  protocol: z.enum(["openai-chat", "anthropic"]),
  baseUrl: z.string(),
  apiKey: z.string(),
  model: z.string(),
  enabled: z.boolean(),
});
// GET/PUT respond with this shape; a configured apiKey is always ••••••.
export type AssistantSettings = z.infer<typeof assistantSettingsSchema>;
export const assistantTestResultSchema = z.object({
  ok: z.boolean(),
  durationMs: z.number().nonnegative(),
  error: z.string().nullable(),
});
export const assistantChannelSchema = z.object({
  channel: imChannelSchema,
  enabled: z.boolean(),
  connected: z.boolean(),
  lastError: z.string().nullable(),
  lastMessageAt: z.iso.datetime().nullable(),
});
export const assistantChannelsSchema = z.array(assistantChannelSchema);
export const assistantChatSchema = z.object({ personId: z.string(), text: z.string() });
export const assistantReplySchema = z.object({
  text: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).exactOptional(),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;
export type AssistantChat = z.infer<typeof assistantChatSchema>;
export type AssistantChannelStatus = z.infer<typeof assistantChannelSchema>;
export const assistantHistorySchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
  .max(20);
export type AssistantHistory = z.infer<typeof assistantHistorySchema>;
export const assistantDraftSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("task"),
    task: publishTaskSchema.pick({
      title: true,
      body: true,
      priority: true,
      capabilities: true,
      dueAt: true,
      dispatch: true,
    }),
  }),
  z.object({ kind: z.literal("cancel"), taskId: z.string() }),
]);
export type AssistantDraft = z.infer<typeof assistantDraftSchema>;
// Only IM plugins call receive. Web chat uses personId and the web session channel.
export type AssistantReceiveInput = {
  channel: z.infer<typeof imChannelSchema>;
  chatId: string;
  externalUserId: string;
  displayName: string;
  text?: string;
  action?: string;
  isGroup: boolean;
  reply(message: AssistantReply): Promise<void>;
};
export type AssistantConnectionStatus = { connected: boolean; lastError?: string };
