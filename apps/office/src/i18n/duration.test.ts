import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration.ts";

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
  ])("formats Chinese %s as %s", (duration, expected) => {
    expect(formatDuration(duration, "zh")).toBe(expected);
  });
  it.each([
    [null, "—"],
    [0, "< 1 min"],
    [59_999, "< 1 min"],
    [5 * 60_000, "5 min"],
    [120 * 60_000, "2 h"],
    [125 * 60_000, "2 h 5 min"],
    [72 * 3600_000, "3 d"],
    [74 * 3600_000, "3 d 2 h"],
  ])("formats English %s as %s", (duration, expected) => {
    expect(formatDuration(duration, "en")).toBe(expected);
  });
});
