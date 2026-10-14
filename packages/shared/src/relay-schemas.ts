import { z } from "zod";
import { RELAY_KINDS, type RelayRecipient } from "./relay.ts";

export const relayRecipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent"), id: z.string() }),
  z.object({ kind: z.literal("capability"), value: z.string() }),
  z.object({ kind: z.literal("broadcast") }),
]) satisfies z.ZodType<RelayRecipient>;
export const sendRelaySchema = z.object({
  to: relayRecipientSchema,
  kind: z.enum(RELAY_KINDS),
  subject: z.string().min(1),
  body: z.string().exactOptional(),
  taskId: z.string().exactOptional(),
  replyTo: z.string().exactOptional(),
});
export const relayQuerySchema = z.object({
  box: z.enum(["inbox", "sent", "all"]).default("inbox"),
  taskId: z.string().exactOptional(),
});
export const relayMessageSchema = z
  .object({
    id: z.string(),
    createdAt: z.iso.datetime(),
    fromAgentId: z.string(),
    to: relayRecipientSchema,
    kind: z.enum(RELAY_KINDS),
    taskId: z.string().nullable(),
    replyTo: z.string().nullable(),
    subject: z.string(),
    body: z.string(),
    readBy: z.array(z.string()),
  })
  .meta({ id: "RelayMessage" });
