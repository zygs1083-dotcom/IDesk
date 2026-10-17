import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { events } from "../../db/schema.ts";
import type { Event } from "./bus.ts";

export const ACTIVITY_LIMIT = 200;
export function listEvents(filter: {
  taskId?: string;
  since?: string;
  before?: string;
  typePrefix?: string;
  limit?: number;
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
        filter.before === undefined ? undefined : lt(events.id, filter.before),
        filter.typePrefix === undefined
          ? undefined
          : sql`substr(${events.type}, 1, ${filter.typePrefix.length + 1}) = ${`${filter.typePrefix}.`}`,
        filter.type === undefined ? undefined : eq(events.type, filter.type),
        filter.agentId === undefined ? undefined : eq(events.agentId, filter.agentId),
      ),
    )
    .orderBy(filter.since === undefined ? desc(events.id) : asc(events.id))
    .limit(filter.limit ?? ACTIVITY_LIMIT)
    .all();
}
