import { afterEach, expect, test, vi } from "vitest";
import plugin from "./index.ts";

const config = plugin.configSchema.parse({ baseUrl: "http://ds", token: "secret" });
const code = "1234567890123456789";
const schedule = {
  processDefinitionCode: code,
  crontab: "0 0 9 ? * 2-6 *",
  releaseState: "ONLINE",
};
function page(totalList: object[], currentPage = 1, totalPage = 1) {
  return new Response(JSON.stringify({ code: 0, data: { totalList, currentPage, totalPage } }));
}
afterEach(() => vi.unstubAllGlobals());

test("pages schedules, ignores offline, preserves long codes and keeps the first online schedule", async () => {
  const fetch = vi.fn((url: string) => {
    if (url.includes("/projects?"))
      return Promise.resolve(
        page([
          { code: 1, name: "Alpha" },
          { code: 2, name: "Empty" },
        ]),
      );
    if (url.includes("/projects/2/process-definition")) return Promise.resolve(page([]));
    if (url.includes("/process-definition"))
      return Promise.resolve(
        page([
          { code, name: "daily", releaseState: "ONLINE" },
          { code: 3, name: "offline", releaseState: "ONLINE" },
          { code: 4, name: "unsupported", releaseState: "ONLINE" },
          { code: 5, name: "UTC", releaseState: "ONLINE" },
        ]),
      );
    if (url.includes("pageNo=1"))
      return Promise.resolve(
        new Response(
          '{"code":0,"data":{"totalList":[{"processDefinitionCode":1234567890123456789,"crontab":"0 0 9 ? * 2-6 *","releaseState":"ONLINE"},{"processDefinitionCode":3,"crontab":"0 0 9 * * ? *","releaseState":"OFFLINE"}],"currentPage":1,"totalPage":2}}',
        ),
      );
    return Promise.resolve(
      page(
        [
          { ...schedule, crontab: "0 0 10 * * ? *", timezoneId: "UTC" },
          { ...schedule, processDefinitionCode: 4, crontab: "0 0 9 L * ? *" },
          { ...schedule, processDefinitionCode: 5, timezoneId: "UTC" },
        ],
        2,
        2,
      ),
    );
  });
  vi.stubGlobal("fetch", fetch);
  const jobs = await plugin.listJobs(config);
  expect(jobs.map((job) => [job.externalId, job.schedule])).toEqual([
    [`1/${code}`, { cron: "0 0 9 * * 1-5", timezone: "Asia/Shanghai" }],
    ["1/3", null],
    ["1/4", null],
    ["1/5", { cron: "0 0 9 * * 1-5", timezone: "UTC" }],
  ]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    "http://ds/projects?pageNo=1&pageSize=100",
    "http://ds/projects/1/process-definition?pageNo=1&pageSize=100",
    "http://ds/projects/1/schedules?pageNo=1&pageSize=100",
    "http://ds/projects/1/schedules?pageNo=2&pageSize=100",
    "http://ds/projects/2/process-definition?pageNo=1&pageSize=100",
  ]);
});
