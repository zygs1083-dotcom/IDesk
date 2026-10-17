import type { patchScheduleSchema, updateScheduleSchema } from "@idesk/shared/schedule-schemas";
import type { z } from "zod";
import { MASK } from "../connectors/connectors.ts";
import { runningSchedules } from "./run.ts";
import type { Schedule } from "./schedules.ts";

export function publicSchedule(row: Schedule): Schedule & { running: boolean } {
  const running = runningSchedules.has(row.id);
  if (row.action.type !== "http") return { ...row, running };
  return {
    ...row,
    running,
    action: {
      ...row.action,
      url: MASK,
      headers: Object.fromEntries(Object.keys(row.action.headers).map((key) => [key, MASK])),
      ...(row.action.body ? { body: MASK } : {}),
    },
  };
}

export function mergeScheduleSecrets(
  input: z.infer<typeof patchScheduleSchema>,
  row: Schedule,
): z.input<typeof updateScheduleSchema> {
  if (input.action?.type !== "http" || row.action.type !== "http") return input;
  const previous = row.action;
  const action = input.action;
  return {
    ...input,
    action: {
      ...action,
      url: action.url === MASK ? previous.url : action.url,
      headers: Object.fromEntries(
        Object.entries(action.headers).map(([key, value]) => [
          key,
          value === MASK && Object.hasOwn(previous.headers, key)
            ? (previous.headers[key] as string)
            : value,
        ]),
      ),
      ...(action.body === MASK && previous.body ? { body: previous.body } : {}),
    },
  };
}
