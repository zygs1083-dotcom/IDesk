import { afterEach, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const baseUrl = "http://ds/dolphinscheduler";
const config = plugin.configSchema.parse({ baseUrl, token: "secret", projectCode: "" });
const definition = { code: 7, name: "daily", releaseState: "ONLINE" };
const instance = {
  id: 1,
  processDefinitionCode: 7,
  state: "SUCCESS",
  commandType: "SCHEDULER",
  startTime: "2026-10-14 01:00:00",
  endTime: null,
};
function page(totalList: object[], currentPage = 1, totalPage = 1): Response {
  return new Response(
    JSON.stringify({ code: 0, msg: "success", data: { totalList, currentPage, totalPage } }),
  );
}
afterEach(() => vi.unstubAllGlobals());

it("pages visible projects, preserves 19-digit codes and prefixes workflow identity and names", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        '{"code":0,"msg":"success","data":{"totalList":[{"code":9123456789012345678,"name":"Alpha"}],"currentPage":1,"totalPage":2}}',
      ),
    )
    .mockResolvedValueOnce(page([{ code: 42, name: "Beta" }], 2, 2))
    .mockResolvedValueOnce(page([definition]))
    .mockResolvedValueOnce(page([definition]));
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.listJobs(config)).toEqual([
    {
      externalId: "9123456789012345678/7",
      name: "Alpha / daily",
      enabled: true,
      url: `${baseUrl}/ui/projects/9123456789012345678/workflow/definitions/7`,
    },
    {
      externalId: "42/7",
      name: "Beta / daily",
      enabled: true,
      url: `${baseUrl}/ui/projects/42/workflow/definitions/7`,
    },
  ]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    `${baseUrl}/projects?pageNo=1&pageSize=100`,
    `${baseUrl}/projects?pageNo=2&pageSize=100`,
    `${baseUrl}/projects/9123456789012345678/process-definition?pageNo=1&pageSize=100`,
    `${baseUrl}/projects/42/process-definition?pageNo=1&pageSize=100`,
  ]);
});

it("keeps single-project names and never requests the project list", async () => {
  const fetch = vi.fn().mockResolvedValue(page([definition]));
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.listJobs({ ...config, projectCode: "42" })).toEqual([
    {
      externalId: "42/7",
      name: "daily",
      enabled: true,
      url: `${baseUrl}/ui/projects/42/workflow/definitions/7`,
    },
  ]);
  expect(fetch.mock.calls.every(([url]) => !url.includes("/projects?"))).toBe(true);
});

it("pages each project's runs with the same since before sorting and applying the global limit", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      page([
        { code: 41, name: "Alpha" },
        { code: 42, name: "Beta" },
      ]),
    )
    .mockResolvedValueOnce(page([instance], 1, 2))
    .mockResolvedValueOnce(page([{ ...instance, id: 2, startTime: "2026-10-14 02:00:00" }], 2, 2))
    .mockResolvedValueOnce(page([{ ...instance, id: 3, startTime: "2026-10-14 03:00:00" }], 1, 2))
    .mockResolvedValueOnce(page([], 2, 2));
  vi.stubGlobal("fetch", fetch);
  const runs = await plugin.listRuns(config, { since: new Date("2026-10-14T00:00:00Z"), limit: 2 });
  expect(runs.map(({ externalId, jobExternalId }) => ({ externalId, jobExternalId }))).toEqual([
    { externalId: "3", jobExternalId: "42/7" },
    { externalId: "2", jobExternalId: "41/7" },
  ]);
  expect(runs[0]?.url).toBe(`${baseUrl}/ui/projects/42/workflow/instances/3`);
  const urls = fetch.mock.calls.slice(1).map(([url]) => new URL(url));
  expect(urls.map((url) => url.pathname)).toEqual(
    [41, 41, 42, 42].map((code) => `/dolphinscheduler/projects/${code}/process-instances`),
  );
  expect(urls.map((url) => url.searchParams.get("startDate"))).toEqual(
    Array(4).fill("2026-10-14 00:00:00"),
  );
  expect(urls.map((url) => url.searchParams.get("pageNo"))).toEqual(["1", "2", "1", "2"]);
});

it("tests all-project access with a single project-list item", async () => {
  const fetch = vi.fn().mockResolvedValue(page([]));
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.testConnection(config)).toEqual({ success: true });
  expect(fetch).toHaveBeenCalledWith(`${baseUrl}/projects?pageNo=1&pageSize=1`, {
    headers: { token: "secret" },
    signal: expect.any(AbortSignal),
  });
});

it("allows omitted projectCode and refreshes the project list on every listing", async () => {
  const settings = plugin.configSchema.parse({ baseUrl, token: "secret" });
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(page([])));
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.listJobs(settings)).toEqual([]);
  expect(await plugin.listRuns(settings, { since: null, limit: 50 })).toEqual([]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(
    Array(2).fill(`${baseUrl}/projects?pageNo=1&pageSize=100`),
  );
});
