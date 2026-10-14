import { and, desc, eq, inArray, isNull, lt, ne, or, type SQL } from "drizzle-orm";
import type { SendRelayInput } from "@idesk/core";
import { sendRelaySchema } from "@idesk/core";
import { getDb, schema } from "../db/index.js";
import type { RelayRow } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { badRequest, forbidden, notFound } from "../lib/http-error.js";
import { emitEvent } from "../events/bus.js";
import type { Actor } from "../auth/actor.js";
import { actorId, actorKind } from "../auth/actor.js";
import { agentNameMap, getAgent } from "../agents/service.js";

export type RelayBox = "inbox" | "sent" | "broadcast" | "all" | `task:${string}`;

export type RelayView = RelayRow & { fromName: string | null; toName: string | null; taskTitle: string | null };

export function sendRelay(actor: Actor, raw: SendRelayInput, fromKind: RelayRow["fromKind"] = actorKind(actor)): RelayView {
  const input = sendRelaySchema.parse(raw);
  if (input.toAgentId && input.toCapability) badRequest("Use either toAgentId or toCapability, not both");
  if (input.toAgentId) getAgent(input.toAgentId);
  const db = getDb();
  if (input.taskId && !db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.id, input.taskId)).get()) {
    notFound("Task not found");
  }
  const row = db
    .insert(schema.relayMessages)
    .values({
      id: newId(),
      kind: input.kind,
      taskId: input.taskId ?? null,
      fromKind,
      fromAgentId: actorId(actor),
      toAgentId: input.toAgentId ?? null,
      toCapability: input.toCapability ?? null,
      subject: input.subject,
      body: input.body,
      artifacts: input.artifacts,
      replyTo: input.replyTo ?? null,
      createdAt: new Date(),
    })
    .returning()
    .get();
  emitEvent({
    type: "relay.message",
    taskId: row.taskId,
    agentId: row.toAgentId,
    actorKind: fromKind,
    actorId: row.fromAgentId,
    payload: { relayId: row.id, kind: row.kind, subject: row.subject, toAgentId: row.toAgentId, toCapability: row.toCapability },
  });
  return decorate([row])[0]!;
}

export function listRelay(
  actor: Actor,
  opts: { box?: RelayBox; unread?: boolean; limit?: number; before?: Date },
): RelayView[] {
  const box = opts.box ?? "inbox";
  const where: SQL[] = [];
  const m = schema.relayMessages;
  if (box.startsWith("task:")) {
    where.push(eq(m.taskId, box.slice(5)));
  } else if (actor.kind === "agent") {
    const me = actor.agent;
    const caps = me.capabilities.map((c) => c.toLowerCase());
    const toMe = or(
      eq(m.toAgentId, me.id),
      caps.length ? inArray(m.toCapability, caps) : undefined,
      and(isNull(m.toAgentId), isNull(m.toCapability), or(isNull(m.fromAgentId), ne(m.fromAgentId, me.id))),
    )!;
    if (box === "inbox") where.push(toMe);
    else if (box === "sent") where.push(eq(m.fromAgentId, me.id));
    else if (box === "broadcast") where.push(and(isNull(m.toAgentId), isNull(m.toCapability))!);
    else where.push(or(toMe, eq(m.fromAgentId, me.id))!);
  } else {
    if (box === "sent") where.push(eq(m.fromKind, "human"));
    else if (box === "broadcast") where.push(and(isNull(m.toAgentId), isNull(m.toCapability))!);
    // owner inbox / all: everything
  }
  if (opts.unread) where.push(isNull(m.readAt));
  if (opts.before) where.push(lt(m.createdAt, opts.before));
  const rows = getDb()
    .select()
    .from(m)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(m.createdAt))
    .limit(Math.min(opts.limit ?? 100, 500))
    .all();
  return decorate(rows);
}

export function getRelay(actor: Actor, id: string): RelayView {
  const row = getDb().select().from(schema.relayMessages).where(eq(schema.relayMessages.id, id)).get();
  if (!row) notFound("Relay message not found");
  if (actor.kind === "agent" && !canSee(actor, row)) forbidden("Not a recipient of this message");
  return decorate([row])[0]!;
}

export function markRead(actor: Actor, id: string): RelayView {
  const current = getRelay(actor, id);
  if (current.readAt) return current;
  const row = getDb()
    .update(schema.relayMessages)
    .set({ readAt: new Date() })
    .where(eq(schema.relayMessages.id, id))
    .returning()
    .get()!;
  return decorate([row])[0]!;
}

export function unreadCount(actor: Actor): number {
  return listRelay(actor, { box: "inbox", unread: true, limit: 500 }).length;
}

function canSee(actor: Actor, row: RelayRow): boolean {
  if (actor.kind === "owner") return true;
  const me = actor.agent;
  if (row.fromAgentId === me.id || row.toAgentId === me.id) return true;
  if (row.toCapability) return me.capabilities.some((c) => c.toLowerCase() === row.toCapability!.toLowerCase());
  if (!row.toAgentId && !row.toCapability) return true;
  return !!row.taskId;
}

function decorate(rows: RelayRow[]): RelayView[] {
  if (rows.length === 0) return [];
  const names = agentNameMap();
  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((x): x is string => !!x))];
  const titles = new Map(
    taskIds.length
      ? getDb().select({ id: schema.tasks.id, title: schema.tasks.title }).from(schema.tasks).where(inArray(schema.tasks.id, taskIds)).all().map((t) => [t.id, t.title])
      : [],
  );
  return rows.map((r) => ({
    ...r,
    fromName: r.fromKind === "human" ? "所有者" : r.fromKind === "system" ? "系统" : (names.get(r.fromAgentId ?? "") ?? null),
    toName: r.toAgentId ? (names.get(r.toAgentId) ?? null) : r.toCapability ? `能力:${r.toCapability}` : "广播",
    taskTitle: r.taskId ? (titles.get(r.taskId) ?? null) : null,
  }));
}
