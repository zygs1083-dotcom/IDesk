import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import type { Translate } from "../i18n/translate.ts";
import { eventText } from "./event-text.ts";

export function profileEventSummary(
  event: z.infer<typeof eventSchema>,
  t: Translate,
  agentName: (id: string | null) => string,
): string {
  if (event.type === "task.reported") return t("profile.reported");
  return eventText(
    event,
    (key, params) =>
      t(key, {
        ...params,
        ...(key !== "event.webhookFailed" && params?.agent === agentName(event.agentId)
          ? { agent: "" }
          : {}),
        ...(event.type.startsWith("agent.") ? { name: "" } : {}),
      }),
    agentName,
  ).trim();
}
