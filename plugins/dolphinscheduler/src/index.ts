import { z } from "zod";
import { defineConnector, type ExternalRun } from "@idesk/plugin-sdk";
import type { AutomationStatus } from "@idesk/core";

/**
 * Apache DolphinScheduler 3.x connector.
 * - header literally named `token`; base `http://host:12345/dolphinscheduler`
 * - envelope `{ code, msg, data }`, `code === 0` means success (30002 no permission, 10190 not found)
 * - dates `yyyy-MM-dd HH:mm:ss` (server timezone, assumed UTC)
 * - project codes are 19-digit longs: always kept as strings
 */
const configSchema = z.object({
  baseUrl: z
    .url()
    .transform((u) => u.replace(/\/+$/, ""))
    .transform((u) => (u.endsWith("/dolphinscheduler") ? u : `${u}/dolphinscheduler`)),
  token: z.string().min(1),
  projectCode: z.string().min(1),
  projectName: z.string().optional(),
});
type Config = z.infer<typeof configSchema>;

type Envelope<T> = { code: number; msg: string; data: T };
type PageInfo<T> = { totalList: T[]; total: number; totalPage: number; currentPage: number };
type Definition = { code: number | string; name: string; releaseState: "ONLINE" | "OFFLINE"; description?: string };
type Instance = { id: number; name: string; processDefinitionCode: number | string; state: string; startTime?: string | null; endTime?: string | null; commandType?: string };

const STATUS: Record<string, AutomationStatus> = {
  SUCCESS: "success",
  FAILURE: "failed",
  STOP: "cancelled",
  PAUSE: "waiting",
  BLOCK: "waiting",
  SERIAL_WAIT: "waiting",
  WAIT_TO_RUN: "waiting",
  DELAY_EXECUTION: "waiting",
  SUBMITTED_SUCCESS: "running",
  RUNNING_EXECUTION: "running",
  READY_PAUSE: "running",
  READY_STOP: "running",
  READY_BLOCK: "running",
};

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function call<T>(c: Config, ctx: Parameters<NonNullable<ReturnType<typeof defineConnector<Config>>["listJobs"]>>[1], pathAndQuery: string): Promise<T> {
  const env = await ctx.fetchJson<Envelope<T>>(`${c.baseUrl}${pathAndQuery}`, { headers: { token: c.token, Accept: "application/json" } });
  if (typeof env?.code !== "number") throw Object.assign(new Error("Not a DolphinScheduler response"), { kind: "wrong_product" });
  if (env.code !== 0) throw Object.assign(new Error(`DolphinScheduler ${env.code}: ${String(env.msg).slice(0, 200)}`), { dsCode: env.code });
  return env.data;
}

function toRun(i: Instance, c: Config): ExternalRun {
  return {
    externalId: String(i.id),
    jobExternalId: String(i.processDefinitionCode),
    status: STATUS[i.state] ?? "unknown",
    trigger: i.commandType ?? null,
    startedAt: parseDate(i.startTime),
    finishedAt: parseDate(i.endTime),
    externalUrl: `${c.baseUrl.replace(/\/dolphinscheduler$/, "")}/dolphinscheduler/ui/projects/${c.projectCode}/workflow/instances/${i.id}`,
    error: i.state === "FAILURE" ? "FAILURE" : null,
  };
}

export default defineConnector<Config>({
  id: "dolphinscheduler",
  name: "海豚调度 DolphinScheduler",
  kind: "connector",
  configSchema,
  secretFields: ["token"],

  async testConnection(c, ctx) {
    try {
      const projects = await call<{ code: number | string; name: string }[]>(c, ctx, "/projects/list");
      const found = projects.find((p) => String(p.code) === c.projectCode);
      if (!found) return { ok: false, reason: "not_found", message: `Project ${c.projectCode} not visible to this token` };
      return { ok: true, message: `Connected, project "${found.name}"`, detail: { projects: projects.length } };
    } catch (err: any) {
      if (err?.status === 401) return { ok: false, reason: "unauthorized", message: "Invalid token" };
      if (err?.dsCode === 30002) return { ok: false, reason: "forbidden", message: "No permission on this project" };
      if (err?.dsCode === 10190) return { ok: false, reason: "not_found", message: "Project not found" };
      if (err?.kind === "wrong_product" || err?.kind === "invalid_json") return { ok: false, reason: "wrong_product", message: "Not a DolphinScheduler instance" };
      return { ok: false, reason: "unreachable", message: err?.message ?? "Unreachable" };
    }
  },

  async listJobs(c, ctx) {
    const jobs = [];
    let pageNo = 1;
    for (;;) {
      const page = await call<PageInfo<Definition>>(c, ctx, `/projects/${c.projectCode}/process-definition?pageNo=${pageNo}&pageSize=100`);
      for (const d of page.totalList) {
        jobs.push({
          externalId: String(d.code),
          name: d.name,
          enabled: d.releaseState === "ONLINE",
          externalUrl: `${c.baseUrl}/ui/projects/${c.projectCode}/workflow/definitions/${d.code}`,
          tags: [],
        });
      }
      if (pageNo >= page.totalPage || page.totalList.length === 0) break;
      pageNo += 1;
    }
    return jobs;
  },

  async listRuns(c, { cursor, limit }, ctx) {
    const since = cursor ? new Date(cursor) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const start = new Date(since.getTime() - 3600 * 1000);
    const runs: ExternalRun[] = [];
    let pageNo = 1;
    while (runs.length < limit && pageNo <= 3) {
      const q = `/projects/${c.projectCode}/process-instances?pageNo=${pageNo}&pageSize=100&startDate=${encodeURIComponent(formatDate(start))}&endDate=${encodeURIComponent(formatDate(new Date(Date.now() + 60_000)))}`;
      const page = await call<PageInfo<Instance>>(c, ctx, q);
      for (const i of page.totalList) runs.push(toRun(i, c));
      if (pageNo >= page.totalPage || page.totalList.length === 0) break;
      pageNo += 1;
    }
    runs.sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));
    const newest = runs[0]?.startedAt ?? since;
    return { runs: runs.slice(0, limit), cursor: newest.toISOString() };
  },

  async refreshRuns(c, ids, ctx) {
    const out: ExternalRun[] = [];
    for (const id of ids) {
      const i = await call<Instance>(c, ctx, `/projects/${c.projectCode}/process-instances/${id}`);
      out.push(toRun(i, c));
    }
    return out;
  },
});
