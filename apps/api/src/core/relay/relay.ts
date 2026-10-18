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
  to?: RelayRecipient;
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
  let to = input.to as RelayRecipient;
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
      .select({ id: relayMessages.id, fromAgentId: relayMessages.fromAgentId })
      .from(relayMessages)
      .where(and(eq(relayMessages.id, input.replyTo), visible))
      .get();
    if (!parent) throw new HttpError(404, "relay.notFound");
    to ??=
      parent.fromAgentId === "human"
        ? { kind: "human" }
        : { kind: "agent", id: parent.fromAgentId };
  }
  if (to.kind === "human" && fromAgentId === "human")
    throw new HttpError(400, "relay.selfRecipient");
  if (
    to.kind === "agent" &&
    !tx.select({ id: agents.id }).from(agents).where(eq(agents.id, to.id)).get()
  )
    throw new HttpError(404, "agent.notFound");
  const now = new Date();
  const message = tx
    .insert(relayMessages)
    .values({ ...input, to, fromAgentId, createdAt: now })
    .returning()
    .get();
  const event = recordEvent(tx, {
    type: "relay.sent",
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    ...(fromAgentId === "human" ? {} : { agentId: fromAgentId }),
    payload: { messageId: message.id, to },
  });
  return { message, event };
}

export function sendRelay(input: RelayInput, fromAgentId: string): RelayMessage {
  const { message, event } = db.transaction((tx) => writeRelay(tx, input, fromAgentId));
  publishEvent(event);
  return message;
}

export function markRelayRead(id: string, viewer: Viewer): RelayMessage | undefined {
  const reader = viewer.kind === "human" ? "human" : viewer.id;
  const { message, event } = db.transaction((tx) => {
    const message = tx
      .select()
      .from(relayMessages)
      .where(and(eq(relayMessages.id, id), viewer.kind === "human" ? undefined : inbox(viewer)))
      .get();
    if (viewer.kind === "human" && message && message.to.kind !== "human")
      throw new HttpError(403, "relay.humanInboxOnly");
    if (!message || message.readBy.includes(reader)) return { message };
    const updated = tx
      .update(relayMessages)
      .set({ readBy: [...message.readBy, reader] })
      .where(eq(relayMessages.id, id))
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "relay.read",
      ...(viewer.kind === "agent" ? { agentId: viewer.id } : {}),
      payload: { messageId: id, ...(viewer.kind === "human" ? { reader: "human" } : {}) },
    });
    return { message: updated, event };
  });
  if (event) publishEvent(event);
  return message;
}
