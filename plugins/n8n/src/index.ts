import { z } from "zod";
import { defineConnector, type ExternalRun } from "@idesk/plugin-sdk";
import type { AutomationStatus } from "@idesk/core";

/**
 * n8n connector (verified against n8n 2.x public API):
 * - header `X-N8N-API-KEY`, base `${baseUrl}/api/v1`
 * - pagination `limit` (max 250) + `cursor`, response `{ data, nextCursor? }`
 * - executions are returned newest first (id descending)
 */
const configSchema = z.object({
  baseUrl: z.url().transform((u) => u.replace(/\/+$/, "")),
  apiKey: z.string().min(1),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
type Config = z.infer<typeof configSchema>;

type N8nWorkflow = { id: string; name: string; active: boolean; isArchived?: boolean; tags?: { name: string }[]; activeVersionId?: string | null };
type N8nExecution = { id: number; status: string; mode?: string; startedAt?: string; stoppedAt?: string | null; workflowId: string; finished?: boolean };
type Page<T> = { data: T[]; nextCursor?: string | null };

const STATUS: Record<string, AutomationStatus> = {
  success: "success",
  error: "failed",
  crashed: "failed",
  running: "running",
  new: "running",
  waiting: "waiting",
  canceled: "cancelled",
};

function headers(c: Config) {
  return { "X-N8N-API-KEY": c.apiKey, Accept: "application/json" };
}

function toRun(e: N8nExecution, baseUrl: string): ExternalRun {
  return {
    externalId: String(e.id),
    jobExternalId: e.workflowId,
    status: STATUS[e.status] ?? "unknown",
    trigger: e.mode ?? null,
    startedAt: e.startedAt ? new Date(e.startedAt) : null,
    finishedAt: e.stoppedAt ? new Date(e.stoppedAt) : null,
    externalUrl: `${baseUrl}/workflow/${e.workflowId}/executions/${e.id}`,
    error: null,
  };
}

export default defineConnector<Config>({
  id: "n8n",
  name: "n8n",
  kind: "connector",
  configSchema,
  secretFields: ["apiKey"],

  async testConnection(c, ctx) {
    try {
      const page = await ctx.fetchJson<Page<N8nWorkflow>>(`${c.baseUrl}/api/v1/workflows?limit=1`, { headers: headers(c) });
      if (!page || !Array.isArray(page.data)) return { ok: false, reason: "wrong_product", message: "Response is not an n8n workflow list" };
      return { ok: true, message: "Connected to n8n" };
    } catch (err: any) {
      if (err?.status === 401) return { ok: false, reason: "unauthorized", message: "Invalid API key" };
      if (err?.kind === "invalid_json") return { ok: false, reason: "wrong_product", message: "Not an n8n instance" };
      return { ok: false, reason: "unreachable", message: err?.message ?? "Unreachable" };
    }
  },

  async listJobs(c, ctx) {
    const jobs = [];
    let cursor: string | null | undefined;
    do {
      const url = new URL(`${c.baseUrl}/api/v1/workflows`);
      url.searchParams.set("limit", "250");
      url.searchParams.set("excludePinnedData", "true");
      if (c.projectId) url.searchParams.set("projectId", c.projectId);
      if (c.tags?.length) url.searchParams.set("tags", c.tags.join(","));
      if (cursor) url.searchParams.set("cursor", cursor);
      const page = await ctx.fetchJson<Page<N8nWorkflow>>(url.toString(), { headers: headers(c) });
      for (const w of page.data) {
        if (w.isArchived) continue;
        jobs.push({
          externalId: w.id,
          name: w.name,
          enabled: w.active === true || !!w.activeVersionId,
          externalUrl: `${c.baseUrl}/workflow/${w.id}`,
          tags: (w.tags ?? []).map((t) => t.name),
        });
      }
      cursor = page.nextCursor;
    } while (cursor);
    return jobs;
  },

  async listRuns(c, { cursor, limit }, ctx) {
    const runs: ExternalRun[] = [];
    const since = cursor ? Number(cursor) : 0;
    let pageCursor: string | null | undefined;
    let newest: number | null = null;
    outer: do {
      const url = new URL(`${c.baseUrl}/api/v1/executions`);
      url.searchParams.set("limit", String(Math.min(limit, 250)));
      url.searchParams.set("includeData", "false");
      if (c.projectId) url.searchParams.set("projectId", c.projectId);
      if (pageCursor) url.searchParams.set("cursor", pageCursor);
      const page = await ctx.fetchJson<Page<N8nExecution>>(url.toString(), { headers: headers(c) });
      for (const e of page.data) {
        if (newest === null) newest = e.id;
        if (e.id <= since) break outer;
        runs.push(toRun(e, c.baseUrl));
        if (runs.length >= limit) break outer;
      }
      pageCursor = page.nextCursor;
    } while (pageCursor);
    return { runs, cursor: newest !== null ? String(Math.max(newest, since)) : cursor };
  },

  async refreshRuns(c, ids, ctx) {
    const out: ExternalRun[] = [];
    for (const id of ids) {
      const e = await ctx.fetchJson<N8nExecution>(`${c.baseUrl}/api/v1/executions/${id}?includeData=false`, { headers: headers(c) });
      out.push(toRun(e, c.baseUrl));
    }
    return out;
  },
});
