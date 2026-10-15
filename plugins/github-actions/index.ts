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
    .default("https://api.github.com")
    .meta({ title: "地址" })
    .transform((url) => url.replace(/\/+$/, "")),
  token: z.string().min(1).meta({ title: "Token" }),
  repo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .meta({ title: "仓库" }),
  ref: z.string().min(1).default("main").meta({ title: "分支" }),
});
type Config = z.output<typeof configSchema>;
type RunStatus = (typeof RUN_STATUSES)[number];
type Status = "queued" | "waiting" | "pending" | "requested" | "in_progress" | "completed";
type Workflow = { id: number; name: string; state: string; html_url: string };
type Run = {
  id: number;
  workflow_id: number;
  status: Status;
  conclusion: string | null;
  event: string;
  run_started_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
};

const statuses: Record<Exclude<Status, "completed">, RunStatus> = {
  queued: "waiting",
  waiting: "waiting",
  pending: "waiting",
  requested: "waiting",
  in_progress: "running",
};
const conclusions: Partial<Record<string, RunStatus>> = {
  success: "success",
  failure: "failed",
  timed_out: "failed",
  startup_failure: "failed",
  action_required: "failed",
  cancelled: "canceled",
  skipped: "canceled",
  neutral: "canceled",
  stale: "canceled",
};
const connectionErrors: Partial<Record<number, string>> = {
  401: "Token 无效",
  403: "Token 无效",
  404: "仓库不存在或无权访问",
};

async function githubFetch(config: Config, path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${config.baseUrl}/repos/${config.repo}${path}`, {
    ...options,
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub 返回 HTTP ${response.status}`), {
      status: response.status,
    });
  }
  return response;
}

export default {
  id: "github-actions",
  name: "GitHub Actions",
  version: "0.1.0",
  kind: "connector",
  configSchema,
  async testConnection(config) {
    try {
      await githubFetch(config as Config, "");
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
    const response = await githubFetch(config as Config, "/actions/workflows?per_page=100");
    const page = (await response.json()) as { workflows: Workflow[] };
    return page.workflows.map(
      (workflow): ExternalJob => ({
        externalId: String(workflow.id),
        name: workflow.name,
        group: (config as Config).repo,
        enabled: workflow.state === "active",
        url: workflow.html_url,
      }),
    );
  },
  async listRuns(config, { since, limit }) {
    const query = new URLSearchParams({ per_page: String(limit) });
    if (since !== null) query.set("created", `>=${since.toISOString()}`);
    const response = await githubFetch(config as Config, `/actions/runs?${query}`);
    const page = (await response.json()) as { workflow_runs: Run[] };
    return page.workflow_runs.map(
      (run): ExternalRun => ({
        externalId: String(run.id),
        jobExternalId: String(run.workflow_id),
        status:
          run.status === "completed"
            ? (conclusions[run.conclusion ?? ""] ?? "canceled")
            : statuses[run.status],
        trigger: run.event,
        startedAt: new Date(run.run_started_at ?? run.created_at),
        finishedAt: run.status === "completed" ? new Date(run.updated_at) : null,
        url: run.html_url,
        error: null,
      }),
    );
  },
  async trigger(config, jobExternalId) {
    const settings = config as Config;
    const response = await githubFetch(settings, `/actions/workflows/${jobExternalId}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: settings.ref }),
    });
    if (response.status !== 204) throw new Error(`GitHub 返回 HTTP ${response.status}`);
    return {};
  },
} satisfies ConnectorPlugin;
