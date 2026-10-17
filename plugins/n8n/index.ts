import { z } from "zod";
import type { RUN_STATUSES } from "../../apps/api/src/db/schema.ts";
import type {
  ConnectorPlugin,
  ExternalJob,
  ExternalRun,
} from "../../apps/api/src/plugins/types.ts";

const configSchema = z.object({
  baseUrl: z
    .url()
    .meta({ title: "地址", titleEn: "Base URL" })
    .transform((url) => url.replace(/\/+$/, "")),
  apiKey: z.string().min(1).meta({ title: "API Key", titleEn: "API Key" }),
});
type Config = z.output<typeof configSchema>;
type RunStatus = (typeof RUN_STATUSES)[number];
type N8nStatus =
  | "new"
  | "waiting"
  | "running"
  | "success"
  | "error"
  | "crashed"
  | "canceled"
  | "unknown";
type Workflow = {
  id: string;
  name: string;
  active: boolean;
  isArchived?: boolean;
  activeVersionId?: string | null;
  activeVersion?: object | null;
};
type Execution = {
  id: number;
  workflowId: string;
  mode: string;
  status: N8nStatus;
  startedAt: string | null;
  stoppedAt: string | null;
};
type Page<T> = { data: T[]; nextCursor?: string };

const statuses: Record<N8nStatus, RunStatus> = {
  new: "waiting",
  waiting: "waiting",
  running: "running",
  success: "success",
  error: "failed",
  crashed: "failed",
  canceled: "canceled",
  unknown: "failed",
};

const executionErrors: Partial<Record<N8nStatus, string>> = {
  error: "n8n 执行失败（error）",
  crashed: "n8n 执行失败（crashed）",
  unknown: "n8n 状态未知",
};
const connectionErrors: Partial<Record<number, string>> = {
  401: "API key 无效",
  403: "API key 无效",
};

async function n8nGet<T>(config: Config, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/v1${path}`, {
      headers: { "X-N8N-API-KEY": config.apiKey },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (failure) {
    throw new Error(`无法连接 n8n：${(failure as Error).message}`);
  }
  if (!response.ok) {
    throw Object.assign(new Error(`n8n 返回 HTTP ${response.status}`), { status: response.status });
  }
  return response.json() as Promise<T>;
}

function toRun(settings: Config, execution: Execution): ExternalRun {
  return {
    externalId: String(execution.id),
    jobExternalId: execution.workflowId,
    status: statuses[execution.status],
    trigger: execution.mode,
    startedAt: execution.startedAt === null ? null : new Date(execution.startedAt),
    finishedAt: execution.stoppedAt === null ? null : new Date(execution.stoppedAt),
    url: `${settings.baseUrl}/workflow/${execution.workflowId}/executions/${execution.id}`,
    error: executionErrors[execution.status] ?? null,
  };
}

export default {
  id: "n8n",
  name: "n8n",
  version: "0.1.0",
  kind: "connector",
  configSchema,
  async testConnection(config) {
    try {
      await n8nGet<Page<Workflow>>(config as Config, "/workflows?limit=1");
      return { success: true };
    } catch (failure) {
      const error = failure as Error & { status?: number };
      return {
        success: false,
        error:
          error.status === undefined
            ? error.message
            : (connectionErrors[error.status] ?? `HTTP ${error.status}`),
      };
    }
  },
  async listJobs(config) {
    const settings = config as Config;
    const jobs: ExternalJob[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ limit: "250" });
      if (cursor) query.set("cursor", cursor);
      const page = await n8nGet<Page<Workflow>>(settings, `/workflows?${query}`);
      for (const workflow of page.data) {
        if (workflow.isArchived === true) continue;
        jobs.push({
          externalId: workflow.id,
          name: workflow.name,
          schedule: null,
          group: null,
          enabled:
            workflow.active === true ||
            workflow.activeVersionId != null ||
            workflow.activeVersion != null,
          url: `${settings.baseUrl}/workflow/${workflow.id}`,
        });
      }
      cursor = page.nextCursor;
    } while (cursor);
    return jobs;
  },
  async listRuns(config, { since, limit, activeRuns = [] }) {
    const settings = config as Config;
    const runs: ExternalRun[] = [];
    let cursor: string | undefined;
    while (true) {
      const query = new URLSearchParams({
        limit: String(Math.min(250, limit)),
        includeData: "false",
      });
      if (cursor) query.set("cursor", cursor);
      const page = await n8nGet<Page<Execution>>(settings, `/executions?${query}`);
      for (const execution of page.data) {
        const startedAt = execution.startedAt === null ? null : new Date(execution.startedAt);
        // n8n 2.32.6 的 startedAfter 不生效，因此在客户端截断倒序列表。
        if (since !== null && startedAt !== null && startedAt < since) continue;
        runs.push(toRun(settings, execution));
      }
      cursor = page.nextCursor;
      if (
        !cursor ||
        page.data.some(
          (execution) =>
            execution.startedAt !== null && since !== null && new Date(execution.startedAt) < since,
        )
      )
        break;
    }
    for (const active of activeRuns) {
      if (runs.some((run) => run.externalId === active.externalId)) continue;
      const execution = await n8nGet<Execution>(
        settings,
        `/executions/${encodeURIComponent(active.externalId)}?includeData=false`,
      );
      runs.push(toRun(settings, execution));
    }
    return runs;
  },
} satisfies ConnectorPlugin;
