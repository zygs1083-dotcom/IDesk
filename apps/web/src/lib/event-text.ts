import type { Lang } from "@idesk/shared/labels";
import type { RelayRecipient } from "@idesk/shared/relay";
import type { TaskAction } from "@idesk/shared/task-machine";
import type { eventSchema } from "@idesk/shared/task-schemas";
import type { z } from "zod";
import { translator } from "../i18n/translate.ts";

const actionKeys = {
  claim: "event.claim",
  assign: "event.assign",
  recruit: "event.recruit",
  cancel: "event.cancel",
  accept: "event.accept",
  decline: "event.decline",
  join: "event.join",
  cancel_recruit: "event.cancelRecruit",
  heartbeat: "event.heartbeat",
  complete: "event.complete",
  pause: "event.pause",
  handoff: "event.handoff",
  release: "event.release",
  lease_expired: "event.leaseExpired",
  resume: "event.resume",
  reopen: "event.reopen",
} as const;

export function eventText(
  event: z.infer<typeof eventSchema>,
  agentName: (id: string | null) => string,
  lang: Lang,
): string {
  const t = translator(lang);
  if (event.type === "task.reported")
    return t("common.reported", {
      p1: agentName(event.agentId),
      p2: String(event.payload.message),
    });
  if (event.type === "relay.sent") {
    const to = event.payload.to as RelayRecipient;
    return t("common.sentAMessageTo", {
      p1: agentName(event.agentId),
      p2: recipientText(to, agentName, lang),
    });
  }
  if (event.type === "task.dependencies")
    return t("common.updatedDependencies", { p1: agentName(event.agentId) });
  if (event.type === "task.created") return t("common.published", { p1: agentName(event.agentId) });
  if (event.type === "task.lease_expired") return t("common.leaseExpiredReleased");
  if (event.type.startsWith("task.")) {
    const action = event.type.slice(5);
    if (action in actionKeys)
      return t(actionKeys[action as TaskAction["type"]], { name: agentName(event.agentId) });
  }
  if (event.type === "agent.registered")
    return t("common.createdAgent", { p1: String(event.payload.name) });
  if (event.type === "agent.updated")
    return t("common.updatedAgent", { p1: String(event.payload.name) });
  if (event.type === "agent.deleted")
    return t("common.deletedAgent", { p1: String(event.payload.name) });
  if (event.type === "connector.polled") {
    const name =
      event.payload.name === undefined
        ? t("event.connector")
        : lang === "zh"
          ? ` ${String(event.payload.name)}`
          : String(event.payload.name);
    return t("common.syncedChanges", { p1: name, p2: String(event.payload.changed) });
  }
  if (event.type === "schedule.fired") {
    const name =
      event.payload.name === undefined
        ? ""
        : lang === "zh"
          ? `「${String(event.payload.name)}」`
          : ` “${String(event.payload.name)}”`;
    return event.payload.status === "success"
      ? t("common.scheduleRan", { p1: name })
      : t("common.scheduleFailed", { p1: name, p2: String(event.payload.error) });
  }
  if (event.type === "webhook.failed")
    return t("common.webhookToFailed", {
      p1: agentName(String(event.payload.agentId)),
      p2: String(event.payload.error),
    });
  if (event.type === "chat.failed")
    return t("common.chatNotificationFailed", { p1: String(event.payload.error) });
  if (event.type === "archive.events")
    return t("common.archivedEvents", { p1: String(event.payload.count) });
  const dot = event.type.indexOf(".");
  return t("common.plugin", { p1: event.type.slice(0, dot), p2: event.type.slice(dot + 1) });
}

function recipientText(
  to: RelayRecipient,
  agentName: (id: string | null) => string,
  lang: Lang,
): string {
  const t = translator(lang);
  switch (to.kind) {
    case "agent":
      return agentName(to.id);
    case "capability":
      return t("common.capability", { p1: to.value });
    case "broadcast":
      return t("common.everyone");
  }
}
