import { afterEach, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const config = plugin.configSchema.parse({
  baseUrl: "https://github.test///",
  token: "test-token",
  repo: "owner/repo",
  ref: "release",
});
const repoUrl = "https://github.test/repos/owner/repo";
const startTime = "2026-10-14T10:00:00.000Z";
const finishTime = "2026-10-14T10:01:00.000Z";
function run(status = "completed", conclusion: string | null = "success") {
  return {
    id: 123,
    workflow_id: 456,
    status,
    conclusion,
    event: "workflow_dispatch",
    run_started_at: startTime,
    created_at: "2026-10-14T09:59:00.000Z",
    updated_at: finishTime,
    html_url: "https://github.com/owner/repo/actions/runs/123",
  };
}
afterEach(() => vi.unstubAllGlobals());

it("follows workflow and execution next links using page numbers", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { workflows: [{ id: 1, name: "First", state: "active", html_url: "url" }] },
        { headers: { link: '<https://github.test/page2>; rel="next"' } },
      ),
    )
    .mockResolvedValueOnce(
      Response.json({ workflows: [{ id: 2, name: "Second", state: "active", html_url: "url" }] }),
    )
    .mockResolvedValueOnce(
      Response.json(
        { workflow_runs: [run()] },
        { headers: { link: '<https://github.test/page2>; rel="next"' } },
      ),
    )
    .mockResolvedValueOnce(Response.json({ workflow_runs: [{ ...run(), id: 124 }] }));
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.listJobs(config)).toHaveLength(2);
  expect(await plugin.listRuns(config, { since: new Date(startTime), limit: 50 })).toHaveLength(2);
  expect(fetch.mock.calls[1]?.[0]).toContain("&page=2");
  expect(fetch.mock.calls[3]?.[0]).toContain("&page=2");
});
it("refuses a truncated 1000-result window", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json({ total_count: 1001, workflow_runs: [run()] }))),
  );
  await expect(plugin.listRuns(config, { since: new Date(startTime), limit: 50 })).rejects.toThrow(
    "1000-result API limit",
  );
});
it("refreshes missing active runs by ID", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ workflow_runs: [] }))
    .mockResolvedValueOnce(Response.json(run()));
  vi.stubGlobal("fetch", fetch);
  expect(
    await plugin.listRuns(config, {
      since: new Date(startTime),
      limit: 50,
      activeRuns: [{ externalId: "123", jobExternalId: "456" }],
    }),
  ).toHaveLength(1);
  expect(fetch.mock.calls[1]?.[0]).toBe(`${repoUrl}/actions/runs/123`);
});
it.each([404, 503])("propagates active detail HTTP %i", async (status) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ workflow_runs: [] }))
      .mockResolvedValueOnce(new Response(null, { status })),
  );
  await expect(
    plugin.listRuns(config, {
      since: new Date(startTime),
      limit: 50,
      activeRuns: [{ externalId: "123", jobExternalId: "456" }],
    }),
  ).rejects.toThrow(`HTTP ${status}`);
});
it.each(["workflows", "runs"])("propagates failed second %s page", async (resource) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { workflows: [], workflow_runs: [] },
          { headers: { link: '<https://github.test/page2>; rel="next"' } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 })),
  );
  await expect(
    resource === "workflows"
      ? plugin.listJobs(config)
      : plugin.listRuns(config, { since: null, limit: 50 }),
  ).rejects.toThrow("HTTP 503");
});
it("accepts exactly 1000 results when total_count and the last page prove completeness", async () => {
  const fetch = vi.fn((url: string) => {
    const pageNo = Number(new URL(url).searchParams.get("page") ?? "1");
    return Promise.resolve(
      Response.json({
        total_count: 1000,
        workflow_runs: Array.from({ length: 100 }, (_, i) => ({ ...run(), id: pageNo * 100 + i })),
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  expect(await plugin.listRuns(config, { since: new Date(startTime), limit: 100 })).toHaveLength(
    1000,
  );
  expect(fetch).toHaveBeenCalledTimes(10);
});
it("rejects an incomplete workflow inventory to prevent deleting unseen jobs", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        total_count: 3,
        workflows: [{ id: 1, name: "First", state: "active", html_url: "url" }],
      }),
    ),
  );
  await expect(plugin.listJobs(config)).rejects.toThrow("before total_count unique results");
});
