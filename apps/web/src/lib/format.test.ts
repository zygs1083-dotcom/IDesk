import { describe, expect, it } from "vitest";
import { relativeTime } from "./format.ts";

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
