import { desc } from "drizzle-orm";
import { decodeTime, monotonicFactory } from "ulid";
import { db, type Tx } from "../../db/client.ts";
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

let nextId: ReturnType<typeof monotonicFactory> | undefined;
let minimumTime = 0;

export function recordEvent(tx: Tx, event: NewEvent): Event {
  if (!nextId) {
    const latest = tx
      .select({ id: events.id })
      .from(events)
      .orderBy(desc(events.id))
      .limit(1)
      .get();
    // A new process must sort after persisted events even if its clock moved backwards.
    minimumTime = latest ? decodeTime(latest.id) + 1 : 0;
    nextId = monotonicFactory();
  }
  const now = new Date();
  return tx
    .insert(events)
    .values({ ...event, id: nextId(Math.max(now.getTime(), minimumTime)), ts: now })
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

export function emitEvent(event: NewEvent): Event {
  const recorded = db.transaction((tx) => recordEvent(tx, event));
  publishEvent(recorded);
  return recorded;
}
