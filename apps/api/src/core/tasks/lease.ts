import { and, eq, lt } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { tasks } from "../../db/schema.ts";
import type { Task } from "./store.ts";
import { actOnTask } from "./transition.ts";

export function expireLeases(now: Date): Task[] {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "in_progress"), lt(tasks.leaseExpiresAt, now)))
    .all()
    .map((task) => actOnTask(task.id, { type: "lease_expired" }, { kind: "system" }) as Task);
}
