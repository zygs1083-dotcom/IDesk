import { z } from "zod";
import type { RUN_STATUSES } from "../../apps/api/src/db/schema.ts";
import type { ConnectorPlugin, ExternalRun } from "../../apps/api/src/plugins/types.ts";

const configSchema = z.object({
  baseUrl: z
    .url()
    .meta({ title: "地址" })
    .transform((url) => url.replace(/\/+$/, "")),
  token: z.string().min(1).meta({ title: "Token" }),
  projectCode: z.string().regex(/^\d+$/).meta({ title: "项目编码" }),
});
type Config = z.output<typeof configSchema>;
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
type Page<T> = { totalList: T[]; currentPage: number; totalPage: number };

async function dsGet<T>(config: Config, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, { headers: { token: config.token } });
  } catch (failure) {
    throw new Error(`无法连接 DolphinScheduler：${(failure as Error).message}`);
  }
  if (!response.ok)
    throw Object.assign(new Error(`DolphinScheduler 返回 HTTP ${response.status}`), {
      status: response.status,
    });
  // 在 JSON.parse 丢失精度前保留长整数标识符。
  const body = (await response.text()).replace(
    /("(?:code|processDefinitionCode|projectCode)"\s*:\s*)(\d{16,})(?=\s*[,}])/g,
    '$1"$2"',
  );
  const envelope = JSON.parse(body) as { code: number; msg: string; data: T };
  if (envelope.code !== 0)
    throw Object.assign(new Error(`DolphinScheduler ${envelope.code}：${envelope.msg}`), {
      code: envelope.code,
    });
  return envelope.data;
}

function parseDate(value: string | null): Date | null {
  // DolphinScheduler 不带时区的日期按 UTC 解析。
  return value ? new Date(`${value.replace(" ", "T")}Z`) : null;
}

const connectionErrors: Record<number, string> = {
  30002: "没有该项目的权限",
  10190: "项目不存在",
};

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
        `/projects/${settings.projectCode}/process-definition?pageNo=1&pageSize=1`,
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
  async listJobs(config) {
    const settings = config as Config;
    const definitions: Definition[] = [];
    for (let pageNo = 1; ; pageNo++) {
      const page = await dsGet<Page<Definition>>(
        settings,
        `/projects/${settings.projectCode}/process-definition?pageNo=${pageNo}&pageSize=100`,
      );
      definitions.push(...page.totalList);
      if (page.currentPage >= page.totalPage) break;
    }
    return definitions.map((definition) => ({
      externalId: String(definition.code),
      name: definition.name,
      enabled: definition.releaseState === "ONLINE",
      // UI 深链未在真实实例上验证。
      url: `${settings.baseUrl}/ui/projects/${settings.projectCode}/workflow/definitions/${definition.code}`,
    }));
  },
  async listRuns(config, { since, limit }) {
    const settings = config as Config;
    const runs: ExternalRun[] = [];
    for (let pageNo = 1; runs.length < limit; pageNo++) {
      const query = new URLSearchParams({ pageNo: String(pageNo), pageSize: "100" });
      if (since !== null)
        query.set("startDate", since.toISOString().slice(0, 19).replace("T", " "));
      const page = await dsGet<Page<Instance>>(
        settings,
        `/projects/${settings.projectCode}/process-instances?${query}`,
      );
      runs.push(
        ...page.totalList.map((instance) => ({
          externalId: String(instance.id),
          jobExternalId: String(instance.processDefinitionCode),
          status: statuses[instance.state],
          trigger: instance.commandType,
          startedAt: parseDate(instance.startTime),
          finishedAt: parseDate(instance.endTime),
          url: `${settings.baseUrl}/ui/projects/${settings.projectCode}/workflow/instances/${instance.id}`,
          error: instance.state === "FAILURE" ? "DolphinScheduler 执行失败" : null,
        })),
      );
      if (page.currentPage >= page.totalPage) break;
    }
    return runs
      .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))
      .slice(0, limit);
  },
} satisfies ConnectorPlugin;
