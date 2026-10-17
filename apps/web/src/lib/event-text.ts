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
    return t("event.reported", {
      agent: agentName(event.agentId),
      message: String(event.payload.message),
    });
  if (event.type === "relay.read")
    return t("event.messageRead", { agent: agentName(event.agentId) });
  if (event.type === "relay.sent") {
    const to = event.payload.to as RelayRecipient;
    return t("event.messageSent", {
      agent: agentName(event.agentId),
      recipient: recipientText(to, agentName, lang),
    });
  }
  if (event.type === "task.dependencies")
    return t("event.dependenciesChanged", { agent: agentName(event.agentId) });
  if (event.type === "task.created")
    return t("event.published", { agent: agentName(event.agentId) });
  if (event.type === "task.lease_expired") return t("event.leaseExpiredReleased");
  if (event.type.startsWith("task.")) {
    const action = event.type.slice(5);
    if (action in actionKeys)
      return t(actionKeys[action as TaskAction["type"]], { agent: agentName(event.agentId) });
  }
  if (event.type === "agent.registered")
    return t("event.agentCreated", { name: String(event.payload.name) });
  if (event.type === "agent.updated")
    return t("event.agentUpdated", { name: String(event.payload.name) });
  if (event.type === "agent.deleted")
    return t("event.agentDeleted", { name: String(event.payload.name) });
  if (event.type === "connector.polled") {
    const changed = String(event.payload.changed);
    return event.payload.name === undefined
      ? t("event.connectorSyncedUnnamed", { changed })
      : t("event.connectorSynced", { name: String(event.payload.name), changed });
  }
  if (event.type === "schedule.fired") {
    const { name, status, error } = event.payload;
    if (status === "success")
      return name === undefined
        ? t("event.scheduleRanUnnamed")
        : t("event.scheduleRan", { name: String(name) });
    return name === undefined
      ? t("event.scheduleFailedUnnamed", { error: String(error) })
      : t("event.scheduleFailed", { name: String(name), error: String(error) });
  }
  if (event.type === "webhook.failed")
    return t("event.webhookFailed", {
      agent: agentName(String(event.payload.agentId)),
      error: String(event.payload.error),
    });
  if (event.type === "chat.failed")
    return t("event.chatFailed", { error: String(event.payload.error) });
  if (event.type === "archive.events")
    return t("event.archived", { count: String(event.payload.count) });
  const dot = event.type.indexOf(".");
  return t("event.plugin", { plugin: event.type.slice(0, dot), event: event.type.slice(dot + 1) });
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
      return t("event.capability", { capability: to.value });
    case "broadcast":
      return t("common.everyone");
  }
}
