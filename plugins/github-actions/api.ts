import { z } from "zod";
import type { RUN_STATUSES } from "../../apps/api/src/db/schema.ts";

export const configSchema = z.object({
  baseUrl: z
    .url()
    .default("https://api.github.com")
    .meta({ title: "地址", titleEn: "Base URL" })
    .transform((url) => url.replace(/\/+$/, "")),
  token: z.string().min(1).meta({ title: "Token", titleEn: "Token" }),
  repo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .meta({ title: "仓库", titleEn: "Repository" }),
  ref: z.string().min(1).default("main").meta({ title: "分支", titleEn: "Branch" }),
});
export type Config = z.output<typeof configSchema>;
type RunStatus = (typeof RUN_STATUSES)[number];
type Status = "queued" | "waiting" | "pending" | "requested" | "in_progress" | "completed";
export type Workflow = { id: number; name: string; state: string; html_url: string };
export type Run = {
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

export const statuses: Record<Exclude<Status, "completed">, RunStatus> = {
  queued: "waiting",
  waiting: "waiting",
  pending: "waiting",
  requested: "waiting",
  in_progress: "running",
};
export const conclusions: Partial<Record<string, RunStatus>> = {
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
export const connectionErrors: Partial<Record<number, string>> = {
  401: "Token 无效",
  403: "Token 无效",
  404: "仓库不存在或无权访问",
};

export async function githubFetch(
  config: Config,
  path: string,
  options?: RequestInit,
): Promise<Response> {
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
