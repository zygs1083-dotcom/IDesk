import { afterEach, expect, it, vi } from "vitest";
import { configSchema } from "./api.ts";
import { listWindow } from "./runs.ts";

const config = configSchema.parse({ token: "fixture", repo: "owner/repo" });
afterEach(() => vi.unstubAllGlobals());
it("splits a saturated created window, paginates children and deduplicates boundaries", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ total_count: 1001, workflow_runs: [] }))
    .mockResolvedValueOnce(
      Response.json(
        { total_count: 2, workflow_runs: [{ id: 1 }] },
        { headers: { link: '<https://example.test/next>; rel="next"' } },
      ),
    )
    .mockResolvedValueOnce(Response.json({ total_count: 2, workflow_runs: [{ id: 2 }] }))
    .mockResolvedValueOnce(
      Response.json({ total_count: 2, workflow_runs: [{ id: 2 }, { id: 3 }] }),
    );
  vi.stubGlobal("fetch", fetch);
  expect((await listWindow(config, 0, 3, 50)).map((run) => run.id)).toEqual([1, 2, 3]);
  expect(fetch.mock.calls.map(([url]) => new URL(url).searchParams.get("created"))).toEqual([
    "1970-01-01T00:00:00.000Z..1970-01-01T00:00:03.000Z",
    "1970-01-01T00:00:00.000Z..1970-01-01T00:00:01.000Z",
    "1970-01-01T00:00:00.000Z..1970-01-01T00:00:01.000Z",
    "1970-01-01T00:00:02.000Z..1970-01-01T00:00:03.000Z",
  ]);
  expect(new URL(fetch.mock.calls[2]?.[0]).searchParams.get("page")).toBe("2");
});
it("rejects an unsplittable second and does not recurse", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ total_count: 1001, workflow_runs: [] }));
  vi.stubGlobal("fetch", fetch);
  await expect(listWindow(config, 0, 0, 50)).rejects.toThrow("single-second");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejects failure of a later split window instead of returning partial data", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ total_count: 1001, workflow_runs: [] }))
      .mockResolvedValueOnce(Response.json({ total_count: 1, workflow_runs: [{ id: 1 }] }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })),
  );
  await expect(listWindow(config, 0, 1, 50)).rejects.toThrow("HTTP 503");
});
it("collects more than 1000 executions across complete child windows", async () => {
  const fetch = vi.fn((url: string) => {
    const query = new URL(url).searchParams;
    const created = query.get("created") as string;
    if (created.endsWith("03.000Z") && created.startsWith("1970-01-01T00:00:00"))
      return Promise.resolve(Response.json({ total_count: 1100, workflow_runs: [] }));
    const left = created.startsWith("1970-01-01T00:00:00");
    const total = left ? 600 : 500;
    const offset = (Number(query.get("page") ?? "1") - 1) * 100;
    return Promise.resolve(
      Response.json({
        total_count: total,
        workflow_runs: Array.from({ length: Math.min(100, total - offset) }, (_, i) => ({
          id: (left ? 0 : 600) + offset + i,
        })),
      }),
    );
  });
  vi.stubGlobal("fetch", fetch);
  expect(await listWindow(config, 0, 3, 100)).toHaveLength(1100);
  expect(fetch).toHaveBeenCalledTimes(12);
});
it.each([{ workflow_runs: [{ id: 1 }] }, { workflow_runs: [{ id: 1 }, { id: 1 }, { id: 2 }] }])(
  "rejects an exhausted window with fewer unique runs than total_count: %j",
  async ({ workflow_runs }) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ total_count: 3, workflow_runs }));
    vi.stubGlobal("fetch", fetch);
    await expect(listWindow(config, 0, 3, 50)).rejects.toThrow("before total_count unique results");
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);
