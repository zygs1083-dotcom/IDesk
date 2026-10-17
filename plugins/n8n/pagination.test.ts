import { afterEach, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const config = plugin.configSchema.parse({ baseUrl: "https://n8n.test", apiKey: "test" });
const startTime = "2026-10-14T10:00:00Z";
const execution = (id: number, status = "success") => ({
  id,
  status,
  workflowId: "workflow-1",
  mode: "manual",
  startedAt: startTime,
  stoppedAt: startTime,
});
afterEach(() => vi.unstubAllGlobals());
it("fetches an active execution absent from the bounded window by ID", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: [] }))
    .mockResolvedValueOnce(Response.json(execution(42, "success")));
  vi.stubGlobal("fetch", fetch);
  const runs = await plugin.listRuns(config, {
    since: new Date(startTime),
    limit: 50,
    activeRuns: [{ externalId: "42", jobExternalId: "workflow-1" }],
  });
  expect(runs[0]?.status).toBe("success");
  expect(fetch.mock.calls[1]?.[0]).toBe("https://n8n.test/api/v1/executions/42?includeData=false");
});
it.each([404, 503])("does not hide active detail HTTP %i", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: [] }))
      .mockResolvedValueOnce(new Response(null, { status })),
  );
  await expect(
    plugin.listRuns(config, {
      since: new Date(startTime),
      limit: 50,
      activeRuns: [{ externalId: "42", jobExternalId: "workflow-1" }],
    }),
  ).rejects.toThrow(`HTTP ${status}`);
});
it("rejects a failed second cursor page", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: [execution(1)], nextCursor: "page2" }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })),
  );
  await expect(plugin.listRuns(config, { since: null, limit: 1 })).rejects.toThrow("HTTP 503");
});
