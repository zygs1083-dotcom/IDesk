import { describe, expect, it } from "vitest";
import {
  axisTime,
  byteAxis,
  bytes,
  percent,
  rate,
  timeTicks,
  tooltipTime,
  uptime,
} from "./format.ts";

describe("server formatting", () => {
  it("uses binary units and one decimal", () => {
    expect(bytes(1024 ** 3 * 1.5)).toBe("1.5 GiB");
    expect(rate(1536)).toBe("1.5 KiB/s");
    expect(percent(9, 10)).toBe(90);
  });

  it("formats uptime", () => {
    expect(uptime(3 * 86400 + 4 * 3600, "zh")).toBe("3 天 4 小时");
  });

  it.each([
    [15.2 * 1024 ** 3, false, ["0", "4 GiB", "8 GiB", "12 GiB", "16 GiB"]],
    [3.7 * 1024 ** 3, false, ["0", "1 GiB", "2 GiB", "3 GiB", "4 GiB"]],
    [976.6 * 1024, true, ["0", "250 KiB/s", "500 KiB/s", "750 KiB/s", "1000 KiB/s"]],
    [1.9 * 1024 ** 2, true, ["0", "0.5 MiB/s", "1 MiB/s", "1.5 MiB/s", "2 MiB/s"]],
    [4.77 * 1024 ** 2, true, ["0", "2 MiB/s", "4 MiB/s", "6 MiB/s"]],
    [0, true, ["0", "1 B/s", "2 B/s", "3 B/s", "4 B/s"]],
  ])("keeps binary chart ticks readable for %s", (value, perSecond, labels) => {
    const axis = byteAxis(value, perSecond);
    expect(axis.ticks.map((tick) => tick.label)).toEqual(labels);
    expect(axis.max).toBeGreaterThan(0);
    expect(axis.ticks.at(-1)?.value).toBe(axis.max);
  });

  it("aligns time ticks to local clock boundaries and formats 24-hour labels", () => {
    const start = new Date(2026, 9, 19, 14, 3, 7).getTime();
    const end = start + 60 * 60 * 1000;
    expect(timeTicks(start, end, "1h", false).map((date) => axisTime(date, "1h"))).toEqual([
      "14:15",
      "14:30",
      "14:45",
      "15:00",
    ]);
    expect(timeTicks(start, end, "1h", true).map((date) => axisTime(date, "1h"))).toEqual([
      "14:30",
      "15:00",
    ]);
    expect(
      timeTicks(start, start + 6 * 3600_000, "6h", false).map((date) => axisTime(date, "6h")),
    ).toEqual(["15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]);
    expect(
      timeTicks(start, start + 24 * 3600_000, "24h", true).map((date) => axisTime(date, "24h")),
    ).toEqual(["16:00", "00:00", "08:00"]);
    expect(
      timeTicks(start, start + 7 * 86400_000, "7d", true).map((date) => axisTime(date, "7d")),
    ).toEqual(["10-20", "10-22", "10-24", "10-26"]);
    expect(axisTime(new Date(2026, 9, 19, 14, 5), "7d")).toBe("10-19");
    expect(tooltipTime(new Date(2026, 9, 19, 14, 5, 7), "1h")).toBe("14:05:07");
    expect(tooltipTime(new Date(2026, 9, 19, 14, 5), "24h")).toBe("10-19 14:05");
  });
});
