import type { RelayKind, RelayRecipient } from "@idesk/shared/relay";
import type { Actor } from "@idesk/shared/task-machine";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db, type Tx } from "../../db/client.ts";
import { agents, relayMessages } from "../../db/schema.ts";
import { type Event, publishEvent, recordEvent } from "../events/bus.ts";

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

function inbox(viewer: Extract<Viewer, { kind: "agent" }>) {
  return and(
    ne(relayMessages.fromAgentId, viewer.id),
    or(
      and(
        sql`json_extract(${relayMessages.to}, '$.kind') = 'agent'`,
        sql`json_extract(${relayMessages.to}, '$.id') = ${viewer.id}`,
      ),
      and(
        sql`json_extract(${relayMessages.to}, '$.kind') = 'capability'`,
        sql`json_extract(${relayMessages.to}, '$.value') in (
          select value from json_each(${JSON.stringify(viewer.capabilities)})
        )`,
      ),
      sql`json_extract(${relayMessages.to}, '$.kind') = 'broadcast'`,
    ),
  );
}

export function writeRelay(
  tx: Tx,
  input: RelayInput,
  fromAgentId: string,
): { message: RelayMessage; event: Event } {
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

export function listRelay(
  viewer: Viewer,
  box: "inbox" | "sent" | "all",
  taskId?: string,
): RelayMessage[] {
  const visibility =
    viewer.kind === "human"
      ? undefined
      : {
          inbox: inbox(viewer),
          sent: eq(relayMessages.fromAgentId, viewer.id),
          all: or(inbox(viewer), eq(relayMessages.fromAgentId, viewer.id)),
        }[box];
  return db
    .select()
    .from(relayMessages)
    .where(and(visibility, taskId === undefined ? undefined : eq(relayMessages.taskId, taskId)))
    .orderBy(desc(relayMessages.createdAt))
    .all();
}

export function markRelayRead(id: string, agentId: string): RelayMessage | undefined {
  return db.transaction(
    (tx) => {
      const agent = tx.select().from(agents).where(eq(agents.id, agentId)).get();
      if (!agent) return undefined;
      const message = tx
        .select()
        .from(relayMessages)
        .where(
          and(
            eq(relayMessages.id, id),
            inbox({ kind: "agent", id: agentId, capabilities: agent.capabilities }),
          ),
        )
        .get();
      if (!message || message.readBy.includes(agentId)) return message;
      return tx
        .update(relayMessages)
        .set({ readBy: [...message.readBy, agentId] })
        .where(eq(relayMessages.id, id))
        .returning()
        .get();
    },
    { behavior: "immediate" },
  );
}
