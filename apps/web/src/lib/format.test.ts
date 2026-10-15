import { describe, expect, it } from "vitest";
import { formatDuration, relativeTime } from "./format.ts";

describe("relativeTime", () => {
  const now = new Date(2026, 9, 14, 16, 30);
  it.each([
    [new Date(2026, 9, 14, 16, 29, 1), "刚刚"],
    [new Date(2026, 9, 14, 16, 27), "3 分钟前"],
    [new Date(2026, 9, 14, 14, 20), "14:20"],
    [new Date(2026, 9, 13, 14, 20), "昨天 14:20"],
    [new Date(2026, 9, 3), "10 月 3 日"],
    [new Date(2025, 9, 3), "2025 年 10 月 3 日"],
  ])("formats %s as %s", (date, expected) => {
    expect(relativeTime(date, now)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [null, "—"],
    [0, "不到 1 分"],
    [59_999, "不到 1 分"],
    [60_000, "1 分"],
    [3_599_999, "59 分"],
    [3_600_000, "1 小时"],
    [12_059_999, "3 小时 20 分"],
    [86_399_999, "23 小时 59 分"],
    [86_400_000, "1 天"],
    [180_059_999, "2 天 2 小时"],
  ])("formats %s as %s", (duration, expected) => {
    expect(formatDuration(duration)).toBe(expected);
  });
});
