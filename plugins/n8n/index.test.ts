import { afterEach, describe, expect, it, vi } from "vitest";
import plugin from "./index.ts";

const requestOptions = { headers: { "X-N8N-API-KEY": "test-key" } };
const config = plugin.configSchema.parse({ baseUrl: "https://n8n.test/", apiKey: "test-key" });

const startTime = "2026-10-14T10:00:00Z";
function execution(id: number, status = "success", startedAt: string | null = startTime) {
  return { id, workflowId: "workflow-1", status, startedAt, stoppedAt: "2026-10-14T10:01:00Z" };
}

afterEach(() => vi.unstubAllGlobals());

describe("n8n connector", () => {
  it("removes trailing slashes from the base URL", () => {
    const parsed = plugin.configSchema.parse({ baseUrl: "https://n8n.test///", apiKey: "key" });
    expect(parsed.baseUrl).toBe("https://n8n.test");
  });

  it("paginates workflows and maps archived/active versions", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            { id: "active", name: "Active", active: true },
            { id: "archived", name: "Archived", active: true, isArchived: true },
            { id: "version-id", name: "Version ID", active: false, activeVersionId: "v1" },
          ],
          nextCursor: "next+page",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            { id: "version", name: "Version", active: false, activeVersion: {} },
            {
              id: "inactive",
              name: "Inactive",
              active: false,
              activeVersionId: null,
              activeVersion: null,
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetch);

    const jobs = await plugin.listJobs(config);
    expect(jobs.map(({ externalId, enabled }) => [externalId, enabled])).toEqual([
      ["active", true],
      ["version-id", true],
      ["version", true],
      ["inactive", false],
    ]);
    expect(jobs.map(({ name }) => name)).toEqual(["Active", "Version ID", "Version", "Inactive"]);
    expect(jobs.map(({ url }) => url)).toEqual([
      "https://n8n.test/workflow/active",
      "https://n8n.test/workflow/version-id",
      "https://n8n.test/workflow/version",
      "https://n8n.test/workflow/inactive",
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://n8n.test/api/v1/workflows?limit=250",
      requestOptions,
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://n8n.test/api/v1/workflows?limit=250&cursor=next%2Bpage",
      requestOptions,
    );
  });

  it("maps all eight execution statuses, dates, IDs, URLs and errors", async () => {
    const statuses = "new waiting running success error crashed canceled unknown".split(" ");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: statuses.map((status, index) => execution(8 - index, status)),
        }),
      ),
    );

    const runs = await plugin.listRuns(config, { since: null, limit: 8 });
    expect(runs.map((run) => [run.status, run.error])).toEqual([
      ["waiting", null],
      ["waiting", null],
      ["running", null],
      ["success", null],
      ["failed", "n8n 执行失败（error）"],
      ["failed", "n8n 执行失败（crashed）"],
      ["canceled", null],
      ["failed", "n8n 状态未知"],
    ]);
    expect(runs[0]).toEqual({
      externalId: "8",
      jobExternalId: "workflow-1",
      status: "waiting",
      startedAt: new Date("2026-10-14T10:00:00Z"),
      finishedAt: new Date("2026-10-14T10:01:00Z"),
      url: "https://n8n.test/workflow/workflow-1/executions/8",
      error: null,
    });
  });

  it("paginates executions until limit", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ data: [execution(5), execution(4)], nextCursor: "second" }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: [execution(3), execution(2)], nextCursor: "third" }),
      );
    vi.stubGlobal("fetch", fetch);

    expect(
      (await plugin.listRuns(config, { since: null, limit: 3 })).map((run) => run.externalId),
    ).toEqual(["5", "4", "3"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://n8n.test/api/v1/executions?limit=3&includeData=false",
      requestOptions,
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://n8n.test/api/v1/executions?limit=1&includeData=false&cursor=second",
      requestOptions,
    );
  });

  it("truncates executions at since, retaining the boundary", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          execution(3, "success", "2026-10-14T10:00:00Z"),
          execution(2, "success", "2026-10-14T09:59:59Z"),
          execution(1, "success", "2026-10-14T09:00:00Z"),
        ],
        nextCursor: "older",
      }),
    );
    vi.stubGlobal("fetch", fetch);
    expect(
      (await plugin.listRuns(config, { since: new Date("2026-10-14T10:00:00Z"), limit: 10 })).map(
        (run) => run.externalId,
      ),
    ).toEqual(["3"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves null execution dates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: [{ ...execution(1, "new", null), stoppedAt: null }],
        }),
      ),
    );
    expect(await plugin.listRuns(config, { since: new Date(), limit: 1 })).toEqual([
      expect.objectContaining({ startedAt: null, finishedAt: null }),
    ]);
  });

  it("tests the connection with a single workflow request", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.testConnection(config)).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledWith("https://n8n.test/api/v1/workflows?limit=1", requestOptions);
  });

  it.each([401, 403, 500])("reports HTTP %i connection failures", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect(await plugin.testConnection(config)).toEqual({
      success: false,
      error: status === 500 ? "HTTP 500" : "API key 无效",
    });
  });

  it("reports network connection failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    expect(await plugin.testConnection(config)).toEqual({
      success: false,
      error: "connection refused",
    });
  });

  it("propagates HTTP errors from job and run listing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(plugin.listJobs(config)).rejects.toThrow("n8n 返回 HTTP 503");
    await expect(plugin.listRuns(config, { since: null, limit: 1 })).rejects.toThrow(
      "n8n 返回 HTTP 503",
    );
  });
});
