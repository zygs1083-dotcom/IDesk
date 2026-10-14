import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { events } from "../../db/schema.ts";
import type { Event } from "./bus.ts";

export const ACTIVITY_LIMIT = 200;
export function listEvents(filter: {
  taskId?: string;
  since?: string;
  type?: string;
  agentId?: string;
}): Event[] {
  if (filter.taskId !== undefined) {
    return db
      .select()
      .from(events)
      .where(eq(events.taskId, filter.taskId))
      .orderBy(asc(events.id))
      .all();
  }
  return db
    .select()
    .from(events)
    .where(
      and(
        filter.since === undefined ? undefined : gt(events.id, filter.since),
        filter.type === undefined ? undefined : eq(events.type, filter.type),
        filter.agentId === undefined ? undefined : eq(events.agentId, filter.agentId),
      ),
    )
    .orderBy(filter.since === undefined ? desc(events.id) : asc(events.id))
    .limit(ACTIVITY_LIMIT)
    .all();
}
