import type { RUN_STATUSES } from "../../apps/api/src/db/schema.ts";
import type {
  ConnectorPlugin,
  ExternalJob,
  ExternalRun,
  Progress,
} from "../../apps/api/src/plugins/types.ts";
import {
  type Config,
  configSchema,
  dsGet,
  formatDate,
  listProjects,
  type Page,
  parseDate,
} from "./api.ts";
import { listSchedules } from "./schedules.ts";

type RunStatus = (typeof RUN_STATUSES)[number];
type DsState =
  | "SUBMITTED_SUCCESS"
  | "RUNNING_EXECUTION"
  | "READY_PAUSE"
  | "PAUSE"
  | "READY_STOP"
  | "STOP"
  | "FAILURE"
  | "SUCCESS"
  | "DELAY_EXECUTION"
  | "SERIAL_WAIT"
  | "READY_BLOCK"
  | "BLOCK"
  | "WAIT_TO_RUN";

const statuses: Record<DsState, RunStatus> = {
  SUCCESS: "success",
  FAILURE: "failed",
  STOP: "canceled",
  SUBMITTED_SUCCESS: "running",
  RUNNING_EXECUTION: "running",
  READY_PAUSE: "running",
  READY_STOP: "running",
  READY_BLOCK: "running",
  PAUSE: "waiting",
  BLOCK: "waiting",
  SERIAL_WAIT: "waiting",
  WAIT_TO_RUN: "waiting",
  DELAY_EXECUTION: "waiting",
};
type Definition = { code: string | number; name: string; releaseState: "ONLINE" | "OFFLINE" };
type Instance = {
  id: number;
  processDefinitionCode: string | number;
  state: DsState;
  commandType: string | null;
  startTime: string | null;
  endTime: string | null;
};

const connectionErrors: Record<number, string> = {
  30002: "没有该项目的权限",
  10190: "项目不存在",
};

function toRun(settings: Config, projectCode: string, instance: Instance): ExternalRun {
  return {
    externalId: String(instance.id),
    jobExternalId: `${projectCode}/${instance.processDefinitionCode}`,
    status: statuses[instance.state],
    trigger: instance.commandType,
    startedAt: parseDate(instance.startTime, settings.timezone),
    finishedAt: parseDate(instance.endTime, settings.timezone),
    url: `${settings.baseUrl}/ui/projects/${projectCode}/workflow/instances/${instance.id}`,
    error: instance.state === "FAILURE" ? "DolphinScheduler 执行失败" : null,
  };
}

export default {
  id: "dolphinscheduler",
  name: "DolphinScheduler",
  version: "0.1.0",
  kind: "connector",
  configSchema,
  async testConnection(config) {
    const settings = config as Config;
    try {
      await dsGet<Page<Definition>>(
        settings,
        settings.projectCode
          ? `/projects/${settings.projectCode}/process-definition?pageNo=1&pageSize=1`
          : "/projects?pageNo=1&pageSize=1",
      );
      return { success: true };
    } catch (failure) {
      const error = failure as Error & { status?: number; code?: number };
      return {
        success: false,
        error:
          error.status === 401
            ? "token 无效"
            : (error.code !== undefined && connectionErrors[error.code]) || error.message,
      };
    }
  },
  async listJobs(config, { progress }: { progress?: Progress } = {}) {
    const settings = config as Config;
    const jobs: ExternalJob[] = [];
    const projects = await listProjects(settings);
    for (const [index, project] of projects.entries()) {
      progress?.(index, projects.length);
      const projectJobs: ExternalJob[] = [];
      for (let pageNo = 1; ; pageNo++) {
        const page = await dsGet<Page<Definition>>(
          settings,
          `/projects/${project.code}/process-definition?pageNo=${pageNo}&pageSize=100`,
        );
        projectJobs.push(
          ...page.totalList.map((definition) => ({
            externalId: `${project.code}/${definition.code}`,
            name: definition.name,
            group: project.name,
            schedule: null,
            enabled: definition.releaseState === "ONLINE",
            // UI 深链未在真实实例上验证。
            url: `${settings.baseUrl}/ui/projects/${project.code}/workflow/definitions/${definition.code}`,
          })),
        );
        if (page.currentPage >= page.totalPage) break;
      }
      if (projectJobs.length > 0) {
        const schedules = await listSchedules(settings, project.code);
        for (const job of projectJobs) {
          job.schedule =
            schedules.get(job.externalId.slice(job.externalId.indexOf("/") + 1)) ?? null;
        }
        jobs.push(...projectJobs);
      }
    }
    return jobs;
  },
  async listRuns(config, { since, limit, progress, jobs, activeRuns = [] }) {
    const settings = config as Config;
    const runs: ExternalRun[] = [];
    // 全部项目模式下多数项目一个工作流都没有，只查本次 listJobs 见到工作流的项目
    const withJobs = jobs && new Set(jobs.map((job) => job.externalId.split("/")[0]));
    const projects = (await listProjects(settings)).filter(
      (project) => !withJobs || withJobs.has(String(project.code)),
    );
    for (const [index, project] of projects.entries()) {
      progress?.(index, projects.length);
      for (let pageNo = 1; ; pageNo++) {
        const query = new URLSearchParams({
          pageNo: String(pageNo),
          pageSize: String(Math.min(100, limit)),
        });
        // 首次轮询（since 为 null）只看最近 7 天：不带 startDate 时海豚要对整张实例表分页，大库上会等很久
        const from = since ?? new Date(Date.now() - 7 * 86_400_000);
        query.set("startDate", formatDate(from, settings.timezone));
        const page = await dsGet<Page<Instance>>(
          settings,
          `/projects/${project.code}/process-instances?${query}`,
        );
        runs.push(
          ...page.totalList.map((instance) => toRun(settings, String(project.code), instance)),
        );
        if (page.currentPage >= page.totalPage) break;
      }
    }
    for (const active of activeRuns) {
      if (
        runs.some(
          (run) =>
            run.externalId === active.externalId && run.jobExternalId === active.jobExternalId,
        )
      )
        continue;
      const projectCode = active.jobExternalId.split("/")[0] as string;
      if (withJobs && !withJobs.has(projectCode)) continue;
      const instance = await dsGet<Instance>(
        settings,
        `/projects/${projectCode}/process-instances/${encodeURIComponent(active.externalId)}`,
      );
      runs.push(toRun(settings, projectCode, instance));
    }
    return runs.sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));
  },
} satisfies ConnectorPlugin;
