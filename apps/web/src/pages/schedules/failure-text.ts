import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import type { Translate } from "../../i18n/translate.ts";
import type { Schedule } from "./types.ts";

export function failureText(
  schedule: Pick<Schedule, "id" | "name">,
  event: Pick<z.infer<typeof eventSchema>, "ts" | "payload">,
  t: Translate,
): string {
  const { payload } = event;
  const text = (value: unknown, fallback = "—") =>
    typeof value === "string" && value.trim() ? value : fallback;
  return [
    `${t("schedules.name")}: ${text(payload.name, schedule.name)}`,
    `${t("schedules.id")}: ${schedule.id}`,
    `${t("schedules.runId")}: ${text(payload.runId)}`,
    `${t("schedules.status")}: ${t("common.failed")}`,
    `${t("schedules.startedAt")}: ${text(payload.startedAt)}`,
    `${t("schedules.finishedAt")}: ${text(payload.finishedAt, event.ts)}`,
    `${t("schedules.duration")}: ${typeof payload.durationMs === "number" ? `${payload.durationMs} ms` : "—"}`,
    "",
    `${t("automation.errorSummary")}:`,
    text(payload.error, t("schedules.noErrorSummary")),
  ].join("\n");
}
