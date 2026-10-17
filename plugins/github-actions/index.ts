import type {
  ConnectorPlugin,
  ExternalJob,
  ExternalRun,
} from "../../apps/api/src/plugins/types.ts";
import {
  type Config,
  conclusions,
  configSchema,
  connectionErrors,
  githubFetch,
  type Run,
  statuses,
  type Workflow,
} from "./api.ts";
import { listWindow } from "./runs.ts";

function toRun(run: Run): ExternalRun {
  return {
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
  };
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
    const workflows = new Map<number, Workflow>();
    for (let pageNo = 1; ; pageNo++) {
      const response = await githubFetch(
        config as Config,
        `/actions/workflows?per_page=100${pageNo > 1 ? `&page=${pageNo}` : ""}`,
      );
      const page = (await response.json()) as { workflows: Workflow[]; total_count?: number };
      for (const workflow of page.workflows) workflows.set(workflow.id, workflow);
      if (!response.headers.get("link")?.includes('rel="next"')) {
        if (page.total_count !== undefined && workflows.size >= page.total_count) break;
        if (page.workflows.length < 100) {
          if (page.total_count !== undefined)
            throw new Error(
              "GitHub workflow listing ended before total_count unique results were collected",
            );
          break;
        }
      }
    }
    return [...workflows.values()].map(
      (workflow): ExternalJob => ({
        externalId: String(workflow.id),
        name: workflow.name,
        schedule: null,
        group: (config as Config).repo,
        enabled: workflow.state === "active",
        url: workflow.html_url,
      }),
    );
  },
  async listRuns(config, { since, limit, activeRuns = [] }) {
    const from = Math.floor((since?.getTime() ?? Date.now() - 7 * 86_400_000) / 1000);
    const to = Math.max(from, Math.ceil(Date.now() / 1000));
    const executions = await listWindow(config as Config, from, to, Math.min(100, limit));
    for (const active of activeRuns) {
      if (executions.some((run) => String(run.id) === active.externalId)) continue;
      const response = await githubFetch(
        config as Config,
        `/actions/runs/${encodeURIComponent(active.externalId)}`,
      );
      executions.push((await response.json()) as Run);
    }
    return executions.map(toRun);
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
