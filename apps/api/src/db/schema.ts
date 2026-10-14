import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority } from "@idesk/shared/task-status";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ulid } from "ulid";

export const AGENT_KINDS = ["claude-code", "codex", "n8n", "script", "custom"] as const;
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
    tags: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    capabilities: text({ mode: "json" }).$type<string[]>().notNull().default([]),
    // Agent deletion must preserve task ownership and event history.
    publisherId: text("publisher_id").notNull(),
    assigneeId: text("assignee_id"),
    recruit: text({ mode: "json" }).$type<{ needed: number; joined: string[] }>(),
    handoff: text({ mode: "json" }).$type<{ from: string; to: string | null; note: string }>(),
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
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("agents_api_key_hash_unique").on(table.apiKeyHash)],
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
  action: text({ mode: "json" })
    .$type<
      | {
          type: "publish_task";
          template: {
            title: string;
            body?: string;
            priority?: TaskPriority;
            tags?: string[];
            capabilities?: string[];
          };
        }
      | {
          type: "connector_trigger";
          connectorId: string;
          jobExternalId: string;
          params?: Record<string, string>;
        }
      | {
          type: "http";
          url: string;
          method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
          headers: Record<string, string>;
          body?: string;
        }
    >()
    .notNull(),
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
    url: text(),
    error: text(),
  },
  (table) => [uniqueIndex("automation_runs_job_external_unique").on(table.jobId, table.externalId)],
);

export const pluginState = sqliteTable("plugin_state", {
  pluginId: text("plugin_id").primaryKey(),
  enabled: integer({ mode: "boolean" }).notNull(),
});
