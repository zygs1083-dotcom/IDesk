import { z } from "zod";
import { capabilitySchema } from "./capabilities.ts";
import { RELAY_KINDS, type RelayRecipient } from "./relay.ts";

export const relayRecipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent"), id: z.string() }),
  z.object({ kind: z.literal("capability"), value: capabilitySchema }),
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
  limit: z.coerce.number().int().min(1).max(100).exactOptional(),
  before: z.string().min(1).exactOptional(),
  q: z.string().exactOptional(),
  kind: z.enum(RELAY_KINDS).exactOptional(),
  toKind: z.enum(["agent", "capability", "broadcast"]).exactOptional(),
  hasTask: z.enum(["true", "false"]).exactOptional(),
  requestStatus: z.enum(["pending", "answered"]).exactOptional(),
  box: z.enum(["inbox", "sent", "all"]).default("inbox"),
  taskId: z.string().exactOptional(),
});
export const relayMessageSchema = z
  .object({
    id: z.string(),
    createdAt: z.iso.datetime(),
    fromAgentId: z.string(),
    to: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("agent"), id: z.string() }),
      z.object({ kind: z.literal("capability"), value: z.string() }),
      z.object({ kind: z.literal("broadcast") }),
    ]),
    kind: z.enum(RELAY_KINDS),
    taskId: z.string().nullable(),
    replyTo: z.string().nullable(),
    subject: z.string(),
    body: z.string(),
    readBy: z.array(z.string()),
  })
  .meta({ id: "RelayMessage" });
