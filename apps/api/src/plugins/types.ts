import type { ZodType } from "zod";
import type { Event, NewEvent } from "../core/events/bus.ts";
import type { Db } from "../db/client.ts";
import type { automationJobs, automationRuns } from "../db/schema.ts";

export type Unsubscribe = () => void;
export type Listener = (event: Event) => void;
export interface PluginContext {
  db: Db;
  events: { emit(event: NewEvent): void; on(type: string, fn: Listener): Unsubscribe };
}
export interface Plugin {
  id: string;
  name: string;
  version: string;
  kind: "connector" | "notifier" | "action";
  configSchema: ZodType;
  setup?(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}
export type ConnectionResult = { success: boolean; error?: string };
export type ExternalJob = Omit<typeof automationJobs.$inferSelect, "id" | "connectorId">;
export type ExternalRun = Omit<typeof automationRuns.$inferSelect, "id" | "jobId">;
export interface ConnectorPlugin extends Plugin {
  kind: "connector";
  testConnection(config: unknown): Promise<ConnectionResult>;
  listJobs(config: unknown): Promise<ExternalJob[]>;
  listRuns(config: unknown, opts: { since: Date | null; limit: number }): Promise<ExternalRun[]>;
  trigger?(
    config: unknown,
    jobExternalId: string,
    params?: unknown,
  ): Promise<{ runExternalId?: string }>;
}
