import type { TaskAction, TransitionError } from "@idesk/shared/task-machine";
import type { Hono } from "hono";
import type { ZodType } from "zod";
import type { Event, NewEvent } from "../core/events/bus.ts";
import type { Task } from "../core/tasks/store.ts";
import type { Db } from "../db/client.ts";
import type { automationJobs, automationRuns } from "../db/schema.ts";

export type Unsubscribe = () => void;
export type Listener = (event: Event) => void;
export interface PluginContext {
  db: Db;
  config: unknown;
  dataDir: string;
  publicUrl: string | undefined;
  tasks: { act(id: string, action: TaskAction): Task | TransitionError | undefined };
  schedule(cron: string, fn: () => Promise<void>): Unsubscribe;
  registerRoutes(app: Hono): void;
  events: { emit(event: NewEvent): void; on(type: string, fn: Listener): Unsubscribe };
}
export interface Plugin {
  id: string;
  name: string;
  version: string;
  kind: "connector" | "notifier" | "action";
  configSchema: ZodType;
  enabledByDefault?: boolean;
  setup?(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}
export type ConnectionResult = { success: boolean; error?: string };
// 轮询进度，插件在逐项目之类的长循环里汇报，连接器页据此画进度条
export type Progress = (done: number, total: number) => void;
export type ExternalJob = Omit<
  typeof automationJobs.$inferSelect,
  "id" | "connectorId" | "lastRunStatus" | "lastRunAt"
>;
export type ExternalRun = Omit<typeof automationRuns.$inferSelect, "id" | "jobId"> & {
  jobExternalId: string;
};
export interface ConnectorPlugin extends Plugin {
  kind: "connector";
  testConnection(config: unknown): Promise<ConnectionResult>;
  listJobs(config: unknown, opts?: { progress?: Progress }): Promise<ExternalJob[]>;
  listRuns(
    config: unknown,
    opts: { since: Date | null; limit: number; progress?: Progress; jobs?: ExternalJob[] },
  ): Promise<ExternalRun[]>;
  trigger?(
    config: unknown,
    jobExternalId: string,
    params?: unknown,
  ): Promise<{ runExternalId?: string }>;
}
