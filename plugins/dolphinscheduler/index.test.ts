import { afterEach, describe, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const config = plugin.configSchema.parse({
  baseUrl: "http://ds:12345/dolphinscheduler/",
  token: "secret",
  projectCode: "9876543210987654321",
});
const baseUrl = "http://ds:12345/dolphinscheduler";
const projectPath = `${baseUrl}/projects/9876543210987654321`;
const definition = { code: "1234567890123456789", name: "daily", releaseState: "ONLINE" };
const instance = {
  id: 1,
  processDefinitionCode: "1234567890123456789",
  state: "SUCCESS",
  commandType: "SCHEDULER",
  startTime: "2026-10-14 01:00:00",
  endTime: "2026-10-14 02:00:00",
};
function page(totalList: object[], currentPage = 1, totalPage = 1): Response {
  return new Response(
    JSON.stringify({ code: 0, msg: "success", data: { totalList, currentPage, totalPage } }),
  );
}
afterEach(() => vi.unstubAllGlobals());
const project = () =>
  new Response('{"code":0,"data":{"code":"9876543210987654321","name":"Alpha"}}');
describe("listJobs", () => {
  it("preserves long codes, pages definitions and authenticates with token", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(
        new Response(
          '{"code":0,"msg":"success","data":{"totalList":[{"code":1234567890123456789,"name":"daily","releaseState":"ONLINE"}],"currentPage":1,"totalPage":2}}',
        ),
      )
      .mockResolvedValueOnce(page([{ ...definition, code: "2", releaseState: "OFFLINE" }], 2, 2));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.listJobs(config)).toEqual([
      {
        externalId: "9876543210987654321/1234567890123456789",
        name: "daily",
        group: "Alpha",
        enabled: true,
        url: `${baseUrl}/ui/projects/9876543210987654321/workflow/definitions/1234567890123456789`,
      },
      {
        externalId: "9876543210987654321/2",
        name: "daily",
        group: "Alpha",
        enabled: false,
        url: `${baseUrl}/ui/projects/9876543210987654321/workflow/definitions/2`,
      },
    ]);
    expect(fetch.mock.calls.slice(1)).toEqual(
      [1, 2].map((pageNo) => [
        `${projectPath}/process-definition?pageNo=${pageNo}&pageSize=100`,
        { headers: { token: "secret" }, signal: expect.any(AbortSignal) },
      ]),
    );
  });
  it("propagates envelope errors with the code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"code":30002,"msg":"denied","data":null}')),
    );
    await expect(plugin.listJobs(config)).rejects.toMatchObject({
      message: "DolphinScheduler 30002：denied",
      code: 30002,
    });
  });
});
describe("listRuns", () => {
  it.each([
    ["SUCCESS", "success"],
    ["FAILURE", "failed"],
    ["STOP", "canceled"],
    ["SUBMITTED_SUCCESS", "running"],
    ["RUNNING_EXECUTION", "running"],
    ["READY_PAUSE", "running"],
    ["READY_STOP", "running"],
    ["READY_BLOCK", "running"],
    ["PAUSE", "waiting"],
    ["BLOCK", "waiting"],
    ["SERIAL_WAIT", "waiting"],
    ["WAIT_TO_RUN", "waiting"],
    ["DELAY_EXECUTION", "waiting"],
  ])("maps %s to %s", async (state, status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(project())
        .mockResolvedValue(page([{ ...instance, state }])),
    );
    expect(await plugin.listRuns(config, { since: null, limit: 50 })).toEqual([
      {
        externalId: "1",
        jobExternalId: "9876543210987654321/1234567890123456789",
        status,
        trigger: "SCHEDULER",
        startedAt: new Date("2026-10-14T01:00:00Z"),
        finishedAt: new Date("2026-10-14T02:00:00Z"),
        url: `${baseUrl}/ui/projects/9876543210987654321/workflow/instances/1`,
        error: state === "FAILURE" ? "DolphinScheduler 执行失败" : null,
      },
    ]);
  });
  it("formats since in UTC, pages, sorts and limits unsorted instances", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(page([{ ...instance, id: 1, startTime: null, endTime: "" }], 1, 3))
      .mockResolvedValueOnce(
        page(
          [
            { ...instance, id: 2, startTime: "2026-10-14 03:00:00" },
            { ...instance, id: 3, startTime: "2026-10-14 02:00:00" },
          ],
          2,
          3,
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const runs = await plugin.listRuns(config, {
      since: new Date("2026-10-14T08:00:00+08:00"),
      limit: 2,
    });
    expect(runs.map((run) => run.externalId)).toEqual(["2", "3"]);
    expect(runs[0]?.startedAt).toEqual(new Date("2026-10-14T03:00:00Z"));
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const [index, call] of fetch.mock.calls.slice(1).entries()) {
      const url = new URL(call[0]);
      expect(url.pathname).toBe("/dolphinscheduler/projects/9876543210987654321/process-instances");
      expect(url.searchParams.get("pageNo")).toBe(String(index + 1));
      expect(url.searchParams.get("pageSize")).toBe("100");
      expect(url.searchParams.get("startDate")).toBe("2026-10-14 00:00:00");
    }
  });
  it("preserves long processDefinitionCode and nullable dates, bounding the first poll to 7 days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(project())
      .mockResolvedValue(
        new Response(
          '{"code":0,"msg":"success","data":{"totalList":[{"id":1,"processDefinitionCode":1234567890123456789,"state":"WAIT_TO_RUN","commandType":null,"startTime":null,"endTime":""}],"currentPage":1,"totalPage":1}}',
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const runs = await plugin.listRuns(config, { since: null, limit: 50 });
    expect(runs[0]).toMatchObject({
      jobExternalId: "9876543210987654321/1234567890123456789",
      trigger: null,
      startedAt: null,
      finishedAt: null,
    });
    expect(new URL(fetch.mock.calls[1]?.[0]).searchParams.get("startDate")).toBe(
      "2026-10-08 12:00:00",
    );
    vi.useRealTimers();
  });
  it("propagates HTTP and network failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    await expect(plugin.listRuns(config, { since: null, limit: 50 })).rejects.toMatchObject({
      message: "DolphinScheduler 返回 HTTP 503",
      status: 503,
    });
    await expect(plugin.listRuns(config, { since: null, limit: 50 })).rejects.toThrow("offline");
  });
});
describe("testConnection", () => {
  it("checks the configured project's definitions", async () => {
    const fetch = vi.fn().mockResolvedValue(page([]));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.testConnection(config)).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith(`${projectPath}/process-definition?pageNo=1&pageSize=1`, {
      headers: { token: "secret" },
      signal: expect.any(AbortSignal),
    });
  });
  it.each([
    [401, 0, "token 无效"],
    [200, 30002, "没有该项目的权限"],
    [200, 10190, "项目不存在"],
    [500, 0, "DolphinScheduler 返回 HTTP 500"],
    [200, 123, "DolphinScheduler 123：other"],
  ])("reports HTTP %s / envelope %s", async (status, code, error) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code, msg: "other", data: null }), { status }),
        ),
    );
    expect(await plugin.testConnection(config)).toEqual({ success: false, error });
  });
  it("returns network errors as a failed connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await plugin.testConnection(config)).toEqual({
      success: false,
      error: "无法连接 DolphinScheduler：offline",
    });
  });
});
it("reports Chinese network errors from job and run listing", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
  const error = /^无法连接 DolphinScheduler：fetch failed$/;
  await expect(plugin.listJobs(config)).rejects.toThrow(error);
  await expect(plugin.listRuns(config, { since: null, limit: 1 })).rejects.toThrow(error);
});
