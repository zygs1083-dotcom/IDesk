import type { RelayKind, RelayRecipient } from "@idesk/shared/relay";
import type { Actor } from "@idesk/shared/task-machine";
import { and, eq, or } from "drizzle-orm";
import { db, type Tx } from "../../db/client.ts";
import { agents, relayMessages, tasks } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { type Event, publishEvent, recordEvent } from "../events/bus.ts";

import { inbox } from "./visibility.ts";

export { listRelay } from "./query.ts";

export type RelayMessage = typeof relayMessages.$inferSelect;
export type Viewer = Exclude<Actor, { kind: "system" }>;
export type RelayInput = {
  to: RelayRecipient;
  kind: RelayKind;
  subject: string;
  body?: string;
  taskId?: string;
  replyTo?: string;
};

export function writeRelay(
  tx: Tx,
  input: RelayInput,
  fromAgentId: string,
): { message: RelayMessage; event: Event } {
  if (
    input.to.kind === "agent" &&
    !tx.select({ id: agents.id }).from(agents).where(eq(agents.id, input.to.id)).get()
  )
    throw new HttpError(404, "agent.notFound");
  if (
    input.taskId !== undefined &&
    !tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, input.taskId)).get()
  )
    throw new HttpError(404, "task.notFound");
  if (input.replyTo !== undefined) {
    const sender =
      fromAgentId === "human"
        ? undefined
        : tx.select().from(agents).where(eq(agents.id, fromAgentId)).get();
    const visible =
      fromAgentId === "human"
        ? undefined
        : or(
            eq(relayMessages.fromAgentId, fromAgentId),
            sender
              ? inbox({ kind: "agent", id: sender.id, capabilities: sender.capabilities })
              : undefined,
          );
    const parent = tx
      .select({ id: relayMessages.id })
      .from(relayMessages)
      .where(and(eq(relayMessages.id, input.replyTo), visible))
      .get();
    if (!parent) throw new HttpError(404, "relay.notFound");
  }
  const now = new Date();
  const message = tx
    .insert(relayMessages)
    .values({ ...input, fromAgentId, createdAt: now })
    .returning()
    .get();
  const event = recordEvent(tx, {
    type: "relay.sent",
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    ...(fromAgentId === "human" ? {} : { agentId: fromAgentId }),
    payload: { messageId: message.id, to: input.to },
  });
  return { message, event };
}

export function sendRelay(input: RelayInput, fromAgentId: string): RelayMessage {
  const { message, event } = db.transaction((tx) => writeRelay(tx, input, fromAgentId));
  publishEvent(event);
  return message;
}

export function markRelayRead(
  id: string,
  viewer: Extract<Viewer, { kind: "agent" }>,
): RelayMessage | undefined {
  const { message, event } = db.transaction((tx) => {
    const message = tx
      .select()
      .from(relayMessages)
      .where(and(eq(relayMessages.id, id), inbox(viewer)))
      .get();
    if (!message || message.readBy.includes(viewer.id)) return { message };
    const updated = tx
      .update(relayMessages)
      .set({ readBy: [...message.readBy, viewer.id] })
      .where(eq(relayMessages.id, id))
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "relay.read",
      agentId: viewer.id,
      payload: { messageId: id },
    });
    return { message: updated, event };
  });
  if (event) publishEvent(event);
  return message;
}
