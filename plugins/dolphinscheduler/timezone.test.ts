import { afterEach, expect, test, vi } from "vitest";
import { configSchema, formatDate, parseDate } from "./api.ts";
import plugin from "./index.ts";

const input = { baseUrl: "http://ds", token: "secret", projectCode: "1" };
afterEach(() => vi.unstubAllGlobals());

test.each([
  ["Asia/Shanghai", "2026-10-14 01:35:00", "2026-10-13T17:35:00Z"],
  ["UTC", "2026-10-14 01:35:00", "2026-10-14T01:35:00Z"],
  ["America/New_York", "2026-03-08 01:30:00", "2026-03-08T06:30:00Z"],
  ["America/New_York", "2026-03-08 03:30:00", "2026-03-08T07:30:00Z"],
  ["America/New_York", "2026-11-01 00:30:00", "2026-11-01T04:30:00Z"],
  ["America/New_York", "2026-11-01 02:30:00", "2026-11-01T07:30:00Z"],
  ["Asia/Shanghai", "2026-10-14 00:00:00", "2026-10-13T16:00:00Z"],
])("converts %s local time %s in both directions", (timezone, local, utc) => {
  expect(parseDate(local, timezone)).toEqual(new Date(utc));
  expect(formatDate(new Date(utc), timezone)).toBe(local);
});

test("preserves absent dates", () => {
  expect(parseDate(null, "Asia/Shanghai")).toBeNull();
  expect(parseDate("", "Asia/Shanghai")).toBeNull();
});

test("defaults old configurations to Shanghai and rejects invalid zones", () => {
  expect(configSchema.parse(input).timezone).toBe("Asia/Shanghai");
  expect(configSchema.safeParse({ ...input, timezone: "Not/A_Zone" }).success).toBe(false);
  expect(configSchema.parse({ ...input, timezone: "UTC" }).timezone).toBe("UTC");
});

test.each([
  ["UTC", "2026-07-01 12:00:00", "2026-07-01T01:00:00Z"],
  ["America/New_York", "2026-07-01 08:00:00", "2026-07-01T05:00:00Z"],
])("uses configured %s for query and returned dates", async (timezone, startDate, startedAt) => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ code: 0, data: { code: 1, name: "Project" } }))
    .mockResolvedValueOnce(
      Response.json({
        code: 0,
        data: {
          totalList: [
            {
              id: 1,
              processDefinitionCode: 2,
              state: "SUCCESS",
              commandType: null,
              startTime: "2026-07-01 01:00:00",
              endTime: "2026-07-01 01:00:00",
            },
          ],
          currentPage: 1,
          totalPage: 1,
        },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  const runs = await plugin.listRuns(configSchema.parse({ ...input, timezone }), {
    since: new Date("2026-07-01T12:00:00Z"),
    limit: 50,
  });
  expect(new URL(fetch.mock.calls[1]?.[0]).searchParams.get("startDate")).toBe(startDate);
  expect(runs[0]).toMatchObject({
    startedAt: new Date(startedAt),
    finishedAt: new Date(startedAt),
  });
});
