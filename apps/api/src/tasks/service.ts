import { and, desc, eq, inArray, like, lt, or, type SQL } from "drizzle-orm";
import {
  actionsFor,
  canTransition,
  capabilitiesMatch,
  initialStatus,
  nextStatus,
  resolveHandoff,
  resolveJoin,
  assignSchema,
  completeTaskSchema,
  handoffSchema,
  publishTaskSchema,
  type PublishTaskInput,
  type TaskAction,
  type TaskStatus,
} from "@idesk/core";
import { getDb, schema } from "../db/index.js";
import type { AssignmentRow, TaskRow } from "../db/schema.js";
import { newId } from "../lib/id.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/http-error.js";
import { emitEvent } from "../events/bus.js";
import type { Actor } from "../auth/actor.js";
import { actorId, actorKind } from "../auth/actor.js";
import { agentNameMap, countActiveTasks, getAgent } from "../agents/service.js";
import { sendRelay } from "../relay/service.js";

export type Assignee = { agentId: string; name: string; role: AssignmentRow["role"]; joinedAt: Date };
export type TaskView = TaskRow & { assignees: Assignee[]; availableActions: TaskAction[]; publisherName: string | null };

export interface ListTasksOptions {
  status?: TaskStatus[];
  capability?: string;
  fit?: boolean;
  q?: string;
  agentId?: string;
  limit?: number;
}

export function listTasks(actor: Actor, opts: ListTasksOptions = {}): TaskView[] {
  const t = schema.tasks;
  const where: SQL[] = [];
  if (opts.status?.length) where.push(inArray(t.status, opts.status));
  if (opts.q) where.push(or(like(t.title, `%${opts.q}%`), like(t.description, `%${opts.q}%`))!);
  if (opts.agentId) {
    const ids = getDb().select({ taskId: schema.taskAssignments.taskId }).from(schema.taskAssignments).where(eq(schema.taskAssignments.agentId, opts.agentId)).all().map((r) => r.taskId);
    if (ids.length === 0) return [];
    where.push(inArray(t.id, ids));
  }
  let rows = getDb()
    .select()
    .from(t)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(t.priority), desc(t.updatedAt))
    .limit(Math.min(opts.limit ?? 300, 1000))
    .all();
  if (opts.capability) {
    const cap = opts.capability.toLowerCase();
    rows = rows.filter((r) => r.requiredCapabilities.some((c) => c.toLowerCase() === cap));
  }
  if (opts.fit && actor.kind === "agent") {
    rows = rows.filter((r) => capabilitiesMatch(r.requiredCapabilities, actor.agent.capabilities));
  }
  return decorate(actor, rows);
}

export function getTask(actor: Actor, id: string): TaskView {
  const row = getDb().select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!row) notFound("Task not found");
  return decorate(actor, [row])[0]!;
}

export function publishTask(actor: Actor, raw: PublishTaskInput, publisher?: { kind: TaskRow["publisherKind"]; id: string | null }): TaskView {
  const input = publishTaskSchema.parse(raw);
  const db = getDb();
  const now = new Date();
  let status = initialStatus(input.minAgents);
  if (input.assigneeId) {
    getAgent(input.assigneeId);
    status = "assigned";
  }
  if (input.parentId && !db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.id, input.parentId)).get()) notFound("Parent task not found");
  const row = db
    .insert(schema.tasks)
    .values({
      id: newId(),
      title: input.title,
      description: input.description,
      status,
      priority: input.priority,
      tags: input.tags,
      requiredCapabilities: input.requiredCapabilities,
      minAgents: input.minAgents,
      publisherKind: publisher?.kind ?? actorKind(actor),
      publisherId: publisher ? publisher.id : actorId(actor),
      payload: input.payload ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      leaseTtlSeconds: input.leaseTtlSeconds,
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  if (input.assigneeId) {
    db.insert(schema.taskAssignments).values({ taskId: row.id, agentId: input.assigneeId, role: "owner", joinedAt: now }).run();
  }
  emitEvent({
    type: "task.published",
    taskId: row.id,
    agentId: input.assigneeId ?? null,
    actorKind: publisher?.kind === "schedule" || publisher?.kind === "plugin" ? publisher.kind : actorKind(actor),
    actorId: publisher ? publisher.id : actorId(actor),
    payload: { title: row.title, status: row.status, requiredCapabilities: row.requiredCapabilities, priority: row.priority },
  });
  return getTask(actor, row.id);
}

export function updateTask(actor: Actor, id: string, patch: Partial<Pick<TaskRow, "title" | "description" | "priority" | "tags" | "requiredCapabilities" | "payload">> & { deadline?: string | null }): TaskView {
  const task = rawTask(id);
  if (!isOwnerOrPublisher(actor, task)) forbidden("Only the owner or the publisher can edit a task");
  const { deadline, ...rest } = patch;
  getDb()
    .update(schema.tasks)
    .set({ ...rest, ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}), updatedAt: new Date() })
    .where(eq(schema.tasks.id, id))
    .run();
  emitEvent({ type: "task.updated", taskId: id, actorKind: actorKind(actor), actorId: actorId(actor), payload: { fields: Object.keys(patch) } });
  return getTask(actor, id);
}

export function deleteTask(actor: Actor, id: string) {
  const task = rawTask(id);
  if (!isOwnerOrPublisher(actor, task)) forbidden("Only the owner or the publisher can delete a task");
  getDb().delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  emitEvent({ type: "task.deleted", taskId: id, actorKind: actorKind(actor), actorId: actorId(actor), payload: { title: task.title } });
}

export function reportProgress(actor: Actor, id: string, message: string, percent?: number): TaskView {
  const task = rawTask(id);
  const assignees = assignmentsOf(id);
  if (!(actor.kind === "owner" || assignees.some((a) => a.agentId === actorId(actor)))) forbidden("Only participants can report progress");
  const patch: Partial<TaskRow> = { updatedAt: new Date() };
  if (task.status === "in_progress") patch.leaseExpiresAt = leaseFrom(task);
  getDb().update(schema.tasks).set(patch).where(eq(schema.tasks.id, id)).run();
  emitEvent({ type: "task.progress", taskId: id, agentId: actorId(actor), actorKind: actorKind(actor), actorId: actorId(actor), payload: { message, percent: percent ?? null } });
  return getTask(actor, id);
}

export function renewLease(actor: Actor, id: string): TaskView {
  const task = rawTask(id);
  if (actor.kind !== "agent" || !assignmentsOf(id).some((a) => a.agentId === actor.agent.id)) forbidden("Only a participant can renew the lease");
  if (task.status === "in_progress") {
    getDb().update(schema.tasks).set({ leaseExpiresAt: leaseFrom(task) }).where(eq(schema.tasks.id, id)).run();
  }
  return getTask(actor, id);
}

/** Apply a state-machine action. `body` is action specific (assign/handoff/complete). */
export function actOnTask(actor: Actor, id: string, action: TaskAction, body: unknown = {}): TaskView {
  const db = getDb();
  const task = rawTask(id);
  const assignees = assignmentsOf(id);
  if (!canTransition(task.status, action)) conflict(`Cannot "${action}" a task that is ${task.status}`);
  if (!allowed(actor, task, assignees, action)) forbidden(`You are not allowed to "${action}" this task`);

  const now = new Date();
  let next: TaskStatus = nextStatus(task.status, action)!;
  const patch: Partial<TaskRow> = { updatedAt: now };
  const payload: Record<string, unknown> = { from: task.status };
  const me = actor.kind === "agent" ? actor.agent : null;

  switch (action) {
    case "claim": {
      if (!me) badRequest("Only an agent can claim; use assign instead");
      checkConcurrency(me.id, me.maxConcurrent);
      db.insert(schema.taskAssignments).values({ taskId: id, agentId: me.id, role: "owner", joinedAt: now }).run();
      patch.leaseExpiresAt = leaseFrom(task, now);
      break;
    }
    case "join": {
      if (!me) badRequest("Only an agent can join");
      checkConcurrency(me.id, me.maxConcurrent);
      const role = assignees.some((a) => a.role === "owner") ? "member" : "owner";
      db.insert(schema.taskAssignments).values({ taskId: id, agentId: me.id, role, joinedAt: now }).run();
      next = resolveJoin(assignees.length + 1, task.minAgents);
      payload.joined = assignees.length + 1;
      payload.minAgents = task.minAgents;
      if (next === "in_progress") patch.leaseExpiresAt = leaseFrom(task, now);
      break;
    }
    case "assign": {
      const { agentId } = assignSchema.parse(body);
      getAgent(agentId);
      db.delete(schema.taskAssignments).where(and(eq(schema.taskAssignments.taskId, id), eq(schema.taskAssignments.role, "owner"))).run();
      db.insert(schema.taskAssignments).values({ taskId: id, agentId, role: "owner", joinedAt: now }).onConflictDoUpdate({ target: [schema.taskAssignments.taskId, schema.taskAssignments.agentId], set: { role: "owner" } }).run();
      payload.agentId = agentId;
      break;
    }
    case "start":
    case "resume":
      patch.leaseExpiresAt = leaseFrom(task, now);
      break;
    case "pause":
      patch.leaseExpiresAt = null;
      break;
    case "release":
      db.delete(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, id)).run();
      patch.leaseExpiresAt = null;
      break;
    case "handoff": {
      const input = handoffSchema.parse(body);
      if (input.toAgentId) getAgent(input.toAgentId);
      db.delete(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, id)).run();
      if (input.toAgentId) {
        db.insert(schema.taskAssignments).values({ taskId: id, agentId: input.toAgentId, role: "owner", joinedAt: now }).run();
      }
      next = resolveHandoff(!!input.toAgentId);
      patch.leaseExpiresAt = null;
      const relay = sendRelay(actor, {
        kind: "handoff",
        taskId: id,
        toAgentId: input.toAgentId ?? null,
        toCapability: input.toAgentId ? null : (task.requiredCapabilities[0] ?? null),
        subject: `交接：${task.title}`,
        body: input.context,
        artifacts: input.artifacts,
      });
      payload.toAgentId = input.toAgentId ?? null;
      payload.relayId = relay.id;
      break;
    }
    case "complete": {
      const input = completeTaskSchema.parse(body);
      patch.outcome = input.outcome;
      patch.result = input.result ?? null;
      patch.summary = input.summary ?? null;
      patch.completedAt = now;
      patch.leaseExpiresAt = null;
      payload.outcome = input.outcome;
      break;
    }
    case "cancel":
      patch.outcome = "cancelled";
      patch.completedAt = now;
      patch.leaseExpiresAt = null;
      break;
    case "reopen":
      db.delete(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, id)).run();
      patch.outcome = null;
      patch.completedAt = null;
      patch.leaseExpiresAt = null;
      break;
  }

  patch.status = next;
  payload.to = next;
  db.update(schema.tasks).set(patch).where(eq(schema.tasks.id, id)).run();
  emitEvent({ type: `task.${action}`, taskId: id, agentId: me?.id ?? (payload.agentId as string | undefined) ?? null, actorKind: actorKind(actor), actorId: actorId(actor), payload });
  return getTask(actor, id);
}

/** Called by the sweeper: in_progress tasks whose lease expired go back to open. */
export function expireLeases(now = new Date()): string[] {
  const db = getDb();
  const expired = db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.status, "in_progress"), lt(schema.tasks.leaseExpiresAt, now)))
    .all();
  for (const task of expired) {
    const holders = assignmentsOf(task.id).map((a) => a.agentId);
    db.delete(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, task.id)).run();
    db.update(schema.tasks).set({ status: "open", leaseExpiresAt: null, updatedAt: now }).where(eq(schema.tasks.id, task.id)).run();
    emitEvent({ type: "task.lease_expired", taskId: task.id, actorKind: "system", payload: { from: "in_progress", to: "open", holders } });
  }
  return expired.map((t) => t.id);
}

// ---------- helpers ----------

function rawTask(id: string): TaskRow {
  const row = getDb().select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!row) notFound("Task not found");
  return row;
}

function assignmentsOf(taskId: string): AssignmentRow[] {
  return getDb().select().from(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, taskId)).all();
}

function leaseFrom(task: TaskRow, now = new Date()): Date {
  return new Date(now.getTime() + task.leaseTtlSeconds * 1000);
}

function checkConcurrency(agentId: string, max: number) {
  if (countActiveTasks(agentId) >= max) conflict(`Agent already has ${max} active task(s)`);
}

function isOwnerOrPublisher(actor: Actor, task: TaskRow): boolean {
  return actor.kind === "owner" || (task.publisherKind === "agent" && task.publisherId === actor.agent.id);
}

function allowed(actor: Actor, task: TaskRow, assignees: AssignmentRow[], action: TaskAction): boolean {
  if (actor.kind === "owner") return action !== "claim" && action !== "join";
  const me = actor.agent;
  const participant = assignees.some((a) => a.agentId === me.id);
  const publisher = task.publisherKind === "agent" && task.publisherId === me.id;
  switch (action) {
    case "claim":
    case "join":
      return !participant && capabilitiesMatch(task.requiredCapabilities, me.capabilities);
    case "assign":
    case "cancel":
    case "reopen":
      return publisher;
    case "start":
      return task.status === "assigned" ? participant : publisher || participant;
    case "pause":
    case "resume":
    case "release":
    case "complete":
    case "handoff":
      return participant;
  }
}

function decorate(actor: Actor, rows: TaskRow[]): TaskView[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const assignments = getDb().select().from(schema.taskAssignments).where(inArray(schema.taskAssignments.taskId, ids)).all();
  const names = agentNameMap();
  const byTask = new Map<string, Assignee[]>();
  for (const a of assignments) {
    const list = byTask.get(a.taskId) ?? [];
    list.push({ agentId: a.agentId, name: names.get(a.agentId) ?? "?", role: a.role, joinedAt: a.joinedAt });
    byTask.set(a.taskId, list);
  }
  return rows.map((row) => {
    const assignees = byTask.get(row.id) ?? [];
    const rawAssignments = assignments.filter((a) => a.taskId === row.id);
    return {
      ...row,
      assignees,
      publisherName: row.publisherKind === "agent" ? (names.get(row.publisherId ?? "") ?? null) : row.publisherKind === "human" ? "所有者" : row.publisherKind,
      availableActions: actionsFor(row.status).filter((a) => allowed(actor, row, rawAssignments, a)),
    };
  });
}
