import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("github-actions connector", () => {
  it("defaults the API URL and branch, normalizes URLs and validates repo shape", () => {
    expect(plugin.configSchema.parse({ token: "token", repo: "owner/repo" })).toEqual({
      baseUrl: "https://api.github.com",
      token: "token",
      repo: "owner/repo",
      ref: "main",
    });
    expect(config.baseUrl).toBe("https://github.test");
    for (const repo of ["owner", "/repo", "owner/", "owner/repo/extra", "owner/re po"]) {
      expect(plugin.configSchema.safeParse({ token: "token", repo }).success).toBe(false);
    }
  });

  it.each([
    ["queued", "waiting"],
    ["waiting", "waiting"],
    ["pending", "waiting"],
    ["requested", "waiting"],
    ["in_progress", "running"],
    ["completed", "success"],
  ])("maps status %s to %s", async (status, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ workflow_runs: [run(status)] })),
    );
    expect((await plugin.listRuns(config, { since: null, limit: 50 }))[0]?.status).toBe(expected);
  });

  it.each([
    ["success", "success"],
    ["failure", "failed"],
    ["timed_out", "failed"],
    ["startup_failure", "failed"],
    ["action_required", "failed"],
    ["cancelled", "canceled"],
    ["skipped", "canceled"],
    ["neutral", "canceled"],
    ["stale", "canceled"],
    ["unlisted", "canceled"],
    [null, "canceled"],
  ])("maps completed conclusion %s to %s", async (conclusion, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ workflow_runs: [run("completed", conclusion)] })),
    );
    expect((await plugin.listRuns(config, { since: null, limit: 50 }))[0]?.status).toBe(expected);
  });

  it("maps run fields and bounds initial collection to seven days", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ workflow_runs: [run()] }));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.listRuns(config, { since: null, limit: 50 })).toEqual([
      {
        externalId: "123",
        jobExternalId: "456",
        status: "success",
        trigger: "workflow_dispatch",
        startedAt: new Date(startTime),
        finishedAt: new Date(finishTime),
        url: "https://github.com/owner/repo/actions/runs/123",
        error: null,
      },
    ]);
    expect(new URL(fetch.mock.calls[0]?.[0]).searchParams.get("created")).toContain("..");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("encodes since and uses created_at for runs that have not started", async () => {
    const execution = { ...run("queued", null), run_started_at: null };
    const fetch = vi.fn().mockResolvedValue(Response.json({ workflow_runs: [execution] }));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.listRuns(config, { since: new Date(startTime), limit: 50 })).toEqual([
      expect.objectContaining({ startedAt: new Date(execution.created_at), finishedAt: null }),
    ]);
    expect(new URL(fetch.mock.calls[0]?.[0]).searchParams.get("created")).toMatch(
      /^2026-10-14T10:00:00.000Z\.\./,
    );
  });

  it("lists one page of workflows and maps IDs, state, names and URLs", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        total_count: 2,
        workflows: [
          { id: 1, name: "Build", state: "active", html_url: "https://github.com/build" },
          {
            id: 2,
            name: "Deploy",
            state: "disabled_manually",
            html_url: "https://github.com/deploy",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.listJobs(config)).toEqual([
      {
        externalId: "1",
        name: "Build",
        schedule: null,
        group: "owner/repo",
        enabled: true,
        url: "https://github.com/build",
      },
      {
        externalId: "2",
        name: "Deploy",
        schedule: null,
        group: "owner/repo",
        enabled: false,
        url: "https://github.com/deploy",
      },
    ]);
    expect(fetch.mock.calls[0]?.[0]).toBe(`${repoUrl}/actions/workflows?per_page=100`);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("dispatches the configured ref and returns no run ID on 204", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.trigger(config, "456")).toEqual({});
    expect(fetch).toHaveBeenCalledWith(`${repoUrl}/actions/workflows/456/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: "release" }),
      signal: expect.any(AbortSignal),
      headers: {
        Authorization: "Bearer test-token",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
    });
  });

  it.each([200, 422])("rejects dispatch response %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    await expect(plugin.trigger(config, "456")).rejects.toThrow(`GitHub 返回 HTTP ${status}`);
  });

  it("tests the repository connection", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 1 }));
    vi.stubGlobal("fetch", fetch);
    expect(await plugin.testConnection(config)).toEqual({ success: true });
    expect(fetch.mock.calls[0]?.[0]).toBe(repoUrl);
    expect(fetch.mock.calls[0]?.[1].headers).toEqual({
      Authorization: "Bearer test-token",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  });

  it.each([
    [401, "Token 无效"],
    [403, "Token 无效"],
    [404, "仓库不存在或无权访问"],
    [500, "HTTP 500"],
  ])("reports connection failure %i", async (status, error) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect(await plugin.testConnection(config)).toEqual({ success: false, error });
  });

  it("reports network errors and propagates listing failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")));
    expect(await plugin.testConnection(config)).toEqual({ success: false, error: "fetch failed" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(plugin.listJobs(config)).rejects.toThrow("GitHub 返回 HTTP 503");
    await expect(plugin.listRuns(config, { since: null, limit: 50 })).rejects.toThrow("HTTP 503");
  });
});
