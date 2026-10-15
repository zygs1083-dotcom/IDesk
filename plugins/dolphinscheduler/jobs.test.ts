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
      .mockResolvedValueOnce(page([{ ...definition, code: "2", releaseState: "OFFLINE" }], 2, 2))
      .mockResolvedValueOnce(page([]));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.listJobs(config)).toEqual([
      {
        externalId: "9876543210987654321/1234567890123456789",
        name: "daily",
        group: "Alpha",
        schedule: null,
        enabled: true,
        url: `${baseUrl}/ui/projects/9876543210987654321/workflow/definitions/1234567890123456789`,
      },
      {
        externalId: "9876543210987654321/2",
        name: "daily",
        group: "Alpha",
        schedule: null,
        enabled: false,
        url: `${baseUrl}/ui/projects/9876543210987654321/workflow/definitions/2`,
      },
    ]);
    expect(fetch.mock.calls.slice(1, 3)).toEqual(
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
