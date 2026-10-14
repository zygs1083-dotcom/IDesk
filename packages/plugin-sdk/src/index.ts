import type { ZodType } from "zod";
import type { AutomationStatus } from "@idesk/core";

/** A workflow / process definition in the external system. */
export interface ExternalJob {
  externalId: string;
  name: string;
  enabled: boolean;
  externalUrl: string | null;
  tags: string[];
}

/** One execution of an ExternalJob. */
export interface ExternalRun {
  externalId: string;
  jobExternalId: string;
  status: AutomationStatus;
  trigger: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  externalUrl: string | null;
  error: string | null;
}

export type ConnectionTest =
  | { ok: true; message: string; detail?: Record<string, string | number> }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "wrong_product" | "unreachable";
      message: string;
    };

export interface FetchJsonOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export class PluginHttpError extends Error {
  constructor(
    message: string,
    public readonly kind: "http" | "redirect" | "invalid_json" | "timeout" | "network" | "blocked_destination",
    public readonly status?: number,
    public readonly bodySnippet?: string,
  ) {
    super(message);
    this.name = "PluginHttpError";
  }
}

/** What the core hands to a plugin. Plugins never touch the database. */
export interface PluginContext {
  /** Outbound JSON fetch with timeout, no redirects, private-destination guard. */
  fetchJson<T = unknown>(url: string, opts?: FetchJsonOptions): Promise<T>;
  log: {
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
  };
  /** Emit a custom event into the IDesk event stream (type is prefixed with the plugin id). */
  emit(type: string, payload: Record<string, unknown>): void;
}

export interface ConnectorPlugin<C = unknown> {
  id: string;
  name: string;
  kind: "connector";
  /** Validates/normalises the config. Mark secrets with `secretFields`. */
  configSchema: ZodType<C>;
  /** Config keys that hold credentials: masked in API responses, stripped from errors. */
  secretFields: readonly (keyof C & string)[];
  /** Optional URL builder so the board can deep-link to the external UI. */
  testConnection(config: C, ctx: PluginContext): Promise<ConnectionTest>;
  listJobs(config: C, ctx: PluginContext): Promise<ExternalJob[]>;
  listRuns(
    config: C,
    opts: { cursor: string | null; limit: number },
    ctx: PluginContext,
  ): Promise<{ runs: ExternalRun[]; cursor: string | null }>;
  refreshRuns?(config: C, externalIds: string[], ctx: PluginContext): Promise<ExternalRun[]>;
  trigger?(
    config: C,
    jobExternalId: string,
    params: unknown,
    ctx: PluginContext,
  ): Promise<{ runExternalId?: string }>;
}

export type IDeskPlugin = ConnectorPlugin<any>;

/** Identity helper that gives authors type inference. */
export function defineConnector<C>(plugin: ConnectorPlugin<C>): ConnectorPlugin<C> {
  return plugin;
}

/** Mask a secret the way the UI shows it: first 4 + last 2 chars. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-2)}`;
}
