import type { ExternalJob } from "../../apps/api/src/plugins/types.ts";
import { type Config, dsGet, type Page } from "./api.ts";

type Schedule = {
  processDefinitionCode: string | number;
  crontab: string;
  timezoneId?: string | null;
  releaseState: "ONLINE" | "OFFLINE";
};

export function quartzToCron(crontab: string): string | null {
  const fields = crontab.trim().split(/\s+/);
  if (
    fields.length !== 7 ||
    fields.some((field) =>
      /[LW#]/i.test(
        field.replace(
          /JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT/gi,
          "",
        ),
      ),
    )
  )
    return null;
  const weekday = fields[5] as string;
  if (weekday.includes("/")) return null;
  fields[5] = weekday.replace(/\d+/g, (value) => String(Number(value) - 1));
  return fields.slice(0, 6).join(" ").replaceAll("?", "*");
}

export async function listSchedules(config: Config, projectCode: string | number) {
  const schedules = new Map<string, ExternalJob["schedule"]>();
  for (let pageNo = 1; ; pageNo++) {
    const page = await dsGet<Page<Schedule>>(
      config,
      `/projects/${projectCode}/schedules?pageNo=${pageNo}&pageSize=100`,
    );
    for (const schedule of page.totalList) {
      const code = String(schedule.processDefinitionCode);
      if (schedule.releaseState !== "ONLINE" || schedules.has(code)) continue;
      const cron = quartzToCron(schedule.crontab);
      schedules.set(
        code,
        cron === null
          ? null
          : {
              cron,
              timezone: schedule.timezoneId || "Asia/Shanghai",
            },
      );
    }
    if (page.currentPage >= page.totalPage) break;
  }
  return schedules;
}
