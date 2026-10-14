import { and, eq, inArray } from "drizzle-orm";
import type { RegisterAgentInput } from "@idesk/core";
import { registerAgentSchema } from "@idesk/core";
import { getDb, schema } from "../db/index.js";
import type { AgentRow } from "../db/schema.js";
import { generateApiKey } from "../lib/crypto.js";
import { newId, newSecret } from "../lib/id.js";
import { conflict, notFound } from "../lib/http-error.js";
import { emitEvent } from "../events/bus.js";
import type { Actor } from "../auth/actor.js";
import { actorId, actorKind } from "../auth/actor.js";

export const ONLINE_WINDOW_MS = 90_000;

export type PublicAgent = Omit<AgentRow, "apiKeyHash" | "webhookSecret"> & { online: boolean };

export function toPublicAgent(row: AgentRow): PublicAgent {
  const { apiKeyHash: _h, webhookSecret: _s, ...rest } = row;
  const online = !!row.lastSeenAt && Date.now() - row.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
  return { ...rest, presence: online ? row.presence : "offline", online };
}

export function listAgents(): PublicAgent[] {
  return getDb().select().from(schema.agents).orderBy(schema.agents.name).all().map(toPublicAgent);
}

export function getAgent(id: string): AgentRow {
  const row = getDb().select().from(schema.agents).where(eq(schema.agents.id, id)).get();
  if (!row) notFound("Agent not found");
  return row;
}

export function agentNameMap(ids?: string[]): Map<string, string> {
  const db = getDb();
  const rows = ids && ids.length
    ? db.select({ id: schema.agents.id, name: schema.agents.name }).from(schema.agents).where(inArray(schema.agents.id, ids)).all()
    : db.select({ id: schema.agents.id, name: schema.agents.name }).from(schema.agents).all();
  return new Map(rows.map((r) => [r.id, r.name]));
}

export function registerAgent(actor: Actor | null, raw: RegisterAgentInput): { agent: PublicAgent; apiKey: string } {
  const input = registerAgentSchema.parse(raw);
  const db = getDb();
  if (db.select({ id: schema.agents.id }).from(schema.agents).where(eq(schema.agents.name, input.name)).get()) {
    conflict(`Agent name "${input.name}" is already taken`);
  }
  const { key, hash, prefix } = generateApiKey();
  const row = db
    .insert(schema.agents)
    .values({
      id: newId(),
      name: input.name,
      kind: input.kind,
      host: input.host,
      capabilities: input.capabilities,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      webhookUrl: input.webhookUrl ?? null,
      webhookSecret: input.webhookUrl ? newSecret() : null,
      maxConcurrent: input.maxConcurrent,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    })
    .returning()
    .get();
  emitEvent({
    type: "agent.registered",
    agentId: row.id,
    actorKind: actor ? actorKind(actor) : "system",
    actorId: actor ? actorId(actor) : null,
    payload: { name: row.name, kind: row.kind, capabilities: row.capabilities },
  });
  return { agent: toPublicAgent(row), apiKey: key };
}

export function rotateApiKey(id: string): { agent: PublicAgent; apiKey: string } {
  getAgent(id);
  const { key, hash, prefix } = generateApiKey();
  const row = getDb()
    .update(schema.agents)
    .set({ apiKeyHash: hash, apiKeyPrefix: prefix })
    .where(eq(schema.agents.id, id))
    .returning()
    .get()!;
  return { agent: toPublicAgent(row), apiKey: key };
}

export function updateAgent(id: string, patch: Partial<Pick<AgentRow, "name" | "kind" | "host" | "capabilities" | "maxConcurrent" | "disabled" | "webhookUrl" | "metadata">>): PublicAgent {
  getAgent(id);
  const row = getDb().update(schema.agents).set(patch).where(eq(schema.agents.id, id)).returning().get()!;
  return toPublicAgent(row);
}

export function deleteAgent(id: string) {
  getAgent(id);
  getDb().delete(schema.agents).where(eq(schema.agents.id, id)).run();
}

/** Heartbeat: refresh presence and extend the lease of every task the agent is working on. */
export function heartbeat(agent: AgentRow, presence: "online" | "busy", load?: number): { extendedTasks: number } {
  const db = getDb();
  const now = new Date();
  db.update(schema.agents)
    .set({ lastSeenAt: now, presence, load: load === undefined ? null : Math.round(load * 100) })
    .where(eq(schema.agents.id, agent.id))
    .run();
  const taskIds = db
    .select({ taskId: schema.taskAssignments.taskId })
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.agentId, agent.id))
    .all()
    .map((r) => r.taskId);
  if (taskIds.length === 0) return { extendedTasks: 0 };
  const active = db
    .select({ id: schema.tasks.id, ttl: schema.tasks.leaseTtlSeconds })
    .from(schema.tasks)
    .where(and(inArray(schema.tasks.id, taskIds), eq(schema.tasks.status, "in_progress")))
    .all();
  for (const t of active) {
    db.update(schema.tasks)
      .set({ leaseExpiresAt: new Date(now.getTime() + t.ttl * 1000) })
      .where(eq(schema.tasks.id, t.id))
      .run();
  }
  return { extendedTasks: active.length };
}

export function countActiveTasks(agentId: string): number {
  const db = getDb();
  const ids = db
    .select({ taskId: schema.taskAssignments.taskId })
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.agentId, agentId))
    .all()
    .map((r) => r.taskId);
  if (ids.length === 0) return 0;
  return db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(inArray(schema.tasks.id, ids), inArray(schema.tasks.status, ["in_progress", "assigned"])))
    .all().length;
}
