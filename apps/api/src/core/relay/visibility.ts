import { and, eq, ne, or, sql } from "drizzle-orm";
import { relayMessages } from "../../db/schema.ts";
import type { Viewer } from "./relay.ts";

export function inbox(viewer: Extract<Viewer, { kind: "agent" }>) {
  return and(
    ne(relayMessages.fromAgentId, viewer.id),
    or(
      and(
        sql`json_extract(${relayMessages.to}, '$.kind') = 'agent'`,
        sql`json_extract(${relayMessages.to}, '$.id') = ${viewer.id}`,
      ),
      and(
        sql`json_extract(${relayMessages.to}, '$.kind') = 'capability'`,
        sql`json_extract(${relayMessages.to}, '$.value') in (
          select value from json_each(${JSON.stringify(viewer.capabilities)})
        )`,
      ),
      sql`json_extract(${relayMessages.to}, '$.kind') = 'broadcast'`,
    ),
  );
}

export function visibility(viewer: Viewer, box: "inbox" | "sent" | "all" = "all") {
  if (viewer.kind === "human") return undefined;
  return {
    inbox: inbox(viewer),
    sent: eq(relayMessages.fromAgentId, viewer.id),
    all: or(inbox(viewer), eq(relayMessages.fromAgentId, viewer.id)),
  }[box];
}
