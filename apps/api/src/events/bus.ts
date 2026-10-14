import { EventEmitter } from "node:events";
import { getDb, schema } from "../db/index.js";
import type { EventRow } from "../db/schema.js";

export type EventInput = {
  type: string;
  taskId?: string | null;
  agentId?: string | null;
  actorKind: EventRow["actorKind"];
  actorId?: string | null;
  payload?: Record<string, unknown>;
};

class EventBus extends EventEmitter {}
export const bus = new EventBus();
bus.setMaxListeners(500);

export function emitEvent(input: EventInput): EventRow {
  const row = getDb()
    .insert(schema.events)
    .values({
      ts: new Date(),
      type: input.type,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
      actorKind: input.actorKind,
      actorId: input.actorId ?? null,
      payload: input.payload ?? {},
    })
    .returning()
    .get();
  bus.emit("event", row);
  return row;
}

export function onEvent(listener: (e: EventRow) => void): () => void {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}
