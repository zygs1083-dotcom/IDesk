import type { Tx } from "../../db/client.ts";
import { events } from "../../db/schema.ts";

export type Event = typeof events.$inferSelect;
export type NewEvent = {
  type: string;
  taskId?: string;
  agentId?: string;
  payload?: Record<string, unknown>;
};
type Listener = (event: Event) => void;
const listeners = new Map<string, Set<Listener>>();

export function recordEvent(tx: Tx, event: NewEvent): Event {
  const now = new Date();
  return tx
    .insert(events)
    .values({ ...event, ts: now })
    .returning()
    .get();
}

export function publishEvent(event: Event): void {
  for (const type of [event.type, "*"]) {
    for (const listener of listeners.get(type) ?? []) listener(event);
  }
}

export function onEvent(type: string, listener: Listener): () => void {
  let subscriptions = listeners.get(type);
  if (!subscriptions) {
    subscriptions = new Set();
    listeners.set(type, subscriptions);
  }
  subscriptions.add(listener);
  return () => {
    subscriptions.delete(listener);
  };
}
