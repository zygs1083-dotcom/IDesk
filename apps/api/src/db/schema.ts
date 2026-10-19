import { AGENT_KINDS } from "@idesk/shared/agent-schemas";
import { RELAY_KINDS, type RelayRecipient } from "@idesk/shared/relay";
import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import type { serverDiskSchema, serverInfoSchema } from "@idesk/shared/server-schemas";
import type { TaskRecruit } from "@idesk/shared/task-machine";
import { TASK_PRIORITIES, TASK_STATUSES } from "@idesk/shared/task-status";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ulid } from "ulid";
import type { z } from "zod";

export const RUN_STATUSES = ["waiting", "running", "success", "failed", "canceled"] as const;

export const tasks = sqliteTable(
  "tasks",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    title: text().notNull(),
    body: text().notNull().default(""),
    status: text({ enum: TASK_STATUSES }).notNull().default("open"),
    priority: text({ enum: TASK_PRIORITIES }).notNull().default("normal"),
    blockedBy: text("blocked_by", { mode: "json" }).$type<string[]>().notNull().default([]),
    tags: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    capabilities: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    publisherId: text("publisher_id").notNull(),
    // 不建外键：agent 可删除，任务与事件历史要保留
    assigneeId: text("assignee_id"),
    recruit: text({ mode: "json" }).$type<TaskRecruit>(),
    leaseExpiresAt: integer("lease_expires_at", { mode: "timestamp_ms" }),
    result: text(),
    dueAt: integer("due_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("tasks_status_idx").on(table.status)],
);

export const agents = sqliteTable(
  "agents",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text().notNull(),
    kind: text({ enum: AGENT_KINDS }).notNull(),
    host: text().notNull(),
    capabilities: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    apiKeyHash: text("api_key_hash").notNull(),
    webhookUrl: text("webhook_url"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("agents_api_key_hash_unique").on(table.apiKeyHash)],
);

export const servers = sqliteTable(
  "servers",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text().notNull(),
    tokenHash: text("token_hash").notNull(),
    info: text({ mode: "json" }).$type<z.infer<typeof serverInfoSchema>>(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("servers_token_hash_unique").on(table.tokenHash)],
);

export const serverSamples = sqliteTable(
  "server_samples",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    serverId: text("server_id").notNull(),
    ts: integer({ mode: "timestamp_ms" }).notNull(),
    cpu: real().notNull(),
    cores: text({ mode: "json" }).$type<number[]>().notNull(),
    load1: real().notNull(),
    load5: real().notNull(),
    load15: real().notNull(),
    memUsed: integer("mem_used").notNull(),
    memTotal: integer("mem_total").notNull(),
    swapUsed: integer("swap_used").notNull(),
    swapTotal: integer("swap_total").notNull(),
    diskUsed: integer("disk_used").notNull(),
    diskTotal: integer("disk_total").notNull(),
    disks: text({ mode: "json" }).$type<z.infer<typeof serverDiskSchema>[]>().notNull(),
    netRx: real("net_rx").notNull(),
    netTx: real("net_tx").notNull(),
    uptime: real().notNull(),
  },
  (table) => [index("server_samples_server_ts_idx").on(table.serverId, table.ts)],
);

export const events = sqliteTable(
  "events",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    ts: integer({ mode: "timestamp_ms" }).notNull(),
    type: text().notNull(),
    taskId: text("task_id"),
    agentId: text("agent_id"),
    payload: text({ mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("events_task_id_idx").on(table.taskId), index("events_ts_idx").on(table.ts)],
);

export const schedules = sqliteTable("schedules", {
  id: text()
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text().notNull(),
  cron: text().notNull(),
  timezone: text().notNull().default("Asia/Shanghai"),
  enabled: integer({ mode: "boolean" }).notNull().default(true),
  action: text({ mode: "json" }).$type<ScheduleAction>().notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  lastStatus: text("last_status", { enum: ["success", "failed"] }),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }),
});

export const connectors = sqliteTable("connectors", {
  id: text()
    .primaryKey()
    .$defaultFn(() => ulid()),
  pluginId: text("plugin_id").notNull(),
  name: text().notNull(),
  config: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  enabled: integer({ mode: "boolean" }).notNull().default(true),
  pollIntervalSec: integer("poll_interval_sec").notNull().default(60),
  lastSucceededAt: integer("last_succeeded_at", { mode: "timestamp_ms" }),
  lastPolledAt: integer("last_polled_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
});

export const automationJobs = sqliteTable(
  "automation_jobs",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    connectorId: text("connector_id")
      .notNull()
      .references(() => connectors.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text().notNull(),
    group: text(),
    schedule: text({ mode: "json" }).$type<{ cron: string; timezone: string }>(),
    enabled: integer({ mode: "boolean" }).notNull().default(true),
    url: text(),
    lastRunStatus: text("last_run_status", { enum: RUN_STATUSES }),
    lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("automation_jobs_connector_external_unique").on(
      table.connectorId,
      table.externalId,
    ),
  ],
);

export const automationRuns = sqliteTable(
  "automation_runs",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    jobId: text("job_id")
      .notNull()
      .references(() => automationJobs.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    status: text({ enum: RUN_STATUSES }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
    trigger: text(),
    url: text(),
    error: text(),
  },
  (table) => [uniqueIndex("automation_runs_job_external_unique").on(table.jobId, table.externalId)],
);

export const pluginState = sqliteTable("plugin_state", {
  pluginId: text("plugin_id").primaryKey(),
  config: text({ mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  enabled: integer({ mode: "boolean" }).notNull(),
});

export const relayMessages = sqliteTable(
  "relay_messages",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => ulid()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    fromAgentId: text("from_agent_id").notNull(),
    to: text({ mode: "json" }).$type<RelayRecipient>().notNull(),
    kind: text({ enum: RELAY_KINDS }).notNull(),
    taskId: text("task_id"),
    replyTo: text("reply_to"),
    subject: text().notNull(),
    body: text().notNull().default(""),
    readBy: text("read_by", { mode: "json" }).$type<string[]>().notNull().default([]),
  },
  (table) => [
    index("relay_messages_task_id_idx").on(table.taskId),
    index("relay_messages_created_at_idx").on(table.createdAt),
  ],
);
