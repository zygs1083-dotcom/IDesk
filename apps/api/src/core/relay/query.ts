import type { relayQuerySchema } from "@idesk/shared/relay-schemas";
import { and, asc, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { relayMessages as messages } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import type { Viewer } from "./relay.ts";
import { visibility } from "./visibility.ts";

type Filters = Omit<z.infer<typeof relayQuerySchema>, "box" | "taskId">;

export function getRelay(id: string, viewer: Viewer) {
  const message = db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), visibility(viewer)))
    .get();
  if (!message) throw new HttpError(404, "relay.notFound");
  return message;
}

function visibleNodes(viewer: Viewer) {
  return sql`visible as (
    select id, reply_to, kind, from_agent_id from ${messages}
    where ${visibility(viewer) ?? sql`1`}
  )`;
}

export function listRelay(
  viewer: Viewer,
  box: "inbox" | "sent" | "all",
  taskId?: string,
  filters: Filters = {},
) {
  const cursor = filters.before ? getRelay(filters.before, viewer) : undefined;
  const pattern = filters.q === undefined ? undefined : `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
  const answered = sql`exists (
    with recursive ${visibleNodes(viewer)}, descendants(id, kind, sender) as (
      select id, kind, from_agent_id from ${messages} descendants_seed where reply_to = ${messages.id}
      union
      select v.id, v.kind, v.from_agent_id from ${messages} v join descendants d on v.reply_to = d.id
    ) select 1 from descendants where kind = 'reply' and sender != ${messages.fromAgentId} and id in (select id from visible)
  )`;
  return db
    .select()
    .from(messages)
    .where(
      and(
        visibility(viewer, box),
        taskId === undefined ? undefined : eq(messages.taskId, taskId),
        filters.kind === undefined ? undefined : eq(messages.kind, filters.kind),
        filters.toKind === undefined
          ? undefined
          : sql`json_extract(${messages.to}, '$.kind') = ${filters.toKind}`,
        filters.hasTask === undefined
          ? undefined
          : filters.hasTask === "true"
            ? isNotNull(messages.taskId)
            : isNull(messages.taskId),
        pattern === undefined
          ? undefined
          : sql`(${messages.subject} like ${pattern} escape '\\' or ${messages.body} like ${pattern} escape '\\')`,
        filters.requestStatus === undefined
          ? undefined
          : and(
              eq(messages.kind, "request"),
              filters.requestStatus === "answered" ? answered : sql`not ${answered}`,
            ),
        cursor
          ? or(
              lt(messages.createdAt, cursor.createdAt),
              and(eq(messages.createdAt, cursor.createdAt), lt(messages.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(filters.limit ?? -1)
    .all();
}

export function relayThread(id: string, viewer: Viewer) {
  getRelay(id, viewer);
  return db
    .select()
    .from(messages)
    .where(sql`${messages.id} in (
    with recursive ${visibleNodes(viewer)}, ancestors(id, reply_to) as (
      select id, reply_to from visible where id = ${id}
      union
      select v.id, v.reply_to from visible v join ancestors a on v.id = a.reply_to
    ), thread(id) as (
      select id from ancestors where reply_to is null or reply_to not in (select id from visible)
      union
      select v.id from ${messages} v join thread t on v.reply_to = t.id
    ) select id from thread where id in (select id from visible)
  )`)
    .orderBy(asc(messages.createdAt), asc(messages.id))
    .all();
}
