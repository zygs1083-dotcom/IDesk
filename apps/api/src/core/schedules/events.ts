import { and, desc, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { events } from "../../db/schema.ts";

export function scheduleEvents(id: string) {
  return db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.type, ["schedule.started", "schedule.fired"]),
        sql`json_extract(${events.payload}, '$.scheduleId') = ${id}`,
      ),
    )
    .orderBy(desc(events.ts), desc(events.id))
    .limit(50)
    .all();
}
