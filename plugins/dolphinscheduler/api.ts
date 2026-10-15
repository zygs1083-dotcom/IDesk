export type Config = { baseUrl: string; token: string; projectCode: string };
export type Page<T> = { totalList: T[]; currentPage: number; totalPage: number };
type Project = { code: string | number; name: string };

export async function dsGet<T>(config: Config, path: string): Promise<T> {
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

export function parseDate(value: string | null): Date | null {
  // DolphinScheduler 不带时区的日期按 UTC 解析。
  return value ? new Date(`${value.replace(" ", "T")}Z`) : null;
}

export async function listProjects(config: Config): Promise<Project[]> {
  if (config.projectCode) return [{ code: config.projectCode, name: "" }];
  const projects: Project[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const page = await dsGet<Page<Project>>(config, `/projects?pageNo=${pageNo}&pageSize=100`);
    projects.push(...page.totalList);
    if (page.currentPage >= page.totalPage) break;
  }
  return projects;
}
