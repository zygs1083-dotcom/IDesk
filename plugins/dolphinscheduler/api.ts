import { z } from "zod";

export const configSchema = z.object({
  baseUrl: z
    .url()
    .meta({ title: "地址", titleEn: "Base URL" })
    .transform((url) => url.replace(/\/+$/, "")),
  token: z.string().min(1).meta({ title: "Token", titleEn: "Token" }),
  timezone: z
    .string()
    .refine((timeZone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone });
        return true;
      } catch {
        return false;
      }
    }, "无效的时区")
    .default("Asia/Shanghai")
    .meta({ title: "时区（海豚服务器）", titleEn: "Time zone (DolphinScheduler server)" }),
  projectCode: z.string().regex(/^\d*$/).default("").meta({
    title: "项目编码（留空 = Token 可见的全部项目）",
    titleEn: "Project code (empty = all projects visible to the token)",
  }),
});
export type Config = z.output<typeof configSchema>;
export type Page<T> = { totalList: T[]; currentPage: number; totalPage: number };
type Project = { code: string | number; name: string };

export async function dsGet<T>(config: Config, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      headers: { token: config.token },
      signal: AbortSignal.timeout(30_000),
    });
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

export function formatDate(value: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function parseDate(value: string | null, timeZone: string): Date | null {
  if (!value) return null;
  const local = Date.parse(`${value.replace(" ", "T")}Z`);
  let instant = local;
  // 再求一次偏移，避免初始 UTC 猜测和实际时间跨过夏令时切换点。
  for (let pass = 0; pass < 2; pass++) {
    const formatted = formatDate(new Date(instant), timeZone);
    const offset = Date.parse(`${formatted.replace(" ", "T")}Z`) - instant;
    instant = local - offset;
  }
  return new Date(instant);
}

export async function listProjects(config: Config): Promise<Project[]> {
  if (config.projectCode) return [await dsGet<Project>(config, `/projects/${config.projectCode}`)];
  const projects: Project[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const page = await dsGet<Page<Project>>(config, `/projects?pageNo=${pageNo}&pageSize=100`);
    projects.push(...page.totalList);
    if (page.currentPage >= page.totalPage) break;
  }
  return projects;
}
