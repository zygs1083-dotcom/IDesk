import { afterEach, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const config = plugin.configSchema.parse({
  baseUrl: "http://ds:12345/dolphinscheduler/",
  token: "secret",
  projectCode: "9876543210987654321",
});
const baseUrl = "http://ds:12345/dolphinscheduler";
const projectPath = `${baseUrl}/projects/9876543210987654321`;
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
it("refreshes an active instance absent from the bounded window", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(project())
    .mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce(Response.json({ code: 0, data: instance }));
  vi.stubGlobal("fetch", fetch);
  const runs = await plugin.listRuns(config, {
    since: new Date(),
    limit: 50,
    activeRuns: [{ externalId: "1", jobExternalId: "9876543210987654321/1234567890123456789" }],
  });
  expect(runs[0]?.status).toBe("success");
  expect(fetch.mock.calls[2]?.[0]).toBe(`${projectPath}/process-instances/1`);
});
it.each([404, 503])("propagates active detail HTTP %i", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(new Response(null, { status })),
  );
  await expect(
    plugin.listRuns(config, {
      since: new Date(),
      limit: 50,
      activeRuns: [{ externalId: "1", jobExternalId: "9876543210987654321/1234567890123456789" }],
    }),
  ).rejects.toThrow(`HTTP ${status}`);
});
it("propagates failure on the second instance page", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(page([instance], 1, 2))
      .mockResolvedValueOnce(new Response(null, { status: 503 })),
  );
  await expect(plugin.listRuns(config, { since: new Date(), limit: 1 })).rejects.toThrow(
    "HTTP 503",
  );
});
