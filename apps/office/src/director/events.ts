import type { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";

export type OfficeEvent = z.infer<typeof eventSchema>;
export type Task = z.infer<typeof taskSchema>;

export function eventPull(
  lastId: string,
  request: (since: string) => Promise<OfficeEvent[]>,
  handle: (event: OfficeEvent) => Promise<void>,
) {
  let running: Promise<void> | undefined;
  let again = false;
  const pull = async () => {
    do {
      again = false;
      const events = await request(lastId);
      if (events.length === 200) again = true;
      for (const event of events) {
        await handle(event);
        lastId = event.id;
      }
    } while (again);
  };
  return () => {
    if (running) {
      again = true;
      return running;
    }
    // Defer one microtask so notifications in the same turn share their first fetch.
    running = Promise.resolve()
      .then(pull)
      .finally(() => {
        running = undefined;
      });
    return running;
  };
}
