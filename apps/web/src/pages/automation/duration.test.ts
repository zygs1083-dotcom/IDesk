import { expect, test } from "vitest";
import { duration } from "./duration.ts";

const start = "2026-10-14T12:00:00Z";
const now = new Date(start).getTime();
test.each([
  [35, "35 秒"],
  [80, "1 分 20 秒"],
  [7380, "2 小时 3 分"],
])("formats %i seconds", (seconds, expected) => {
  expect(duration(start, new Date(now + seconds * 1000).toISOString(), now, "zh")).toBe(expected);
  expect(duration(start, null, now + seconds * 1000, "zh")).toBe(expected);
});
test("missing start has no duration", () => {
  expect(duration(null, null, now, "zh")).toBe("—");
});

test.each([
  [5, "5 s"],
  [339, "5 min 39 s"],
  [3780, "1 h 3 min"],
])("English duration %i", (seconds, expected) => {
  expect(duration(start, null, now + Number(seconds) * 1000, "en")).toBe(expected);
});
