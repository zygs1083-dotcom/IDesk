import { expect, test } from "vitest";
import { duration } from "./duration.ts";

const start = "2026-10-14T12:00:00Z";
const now = new Date(start).getTime();
test.each([
  [35, "35 秒"],
  [80, "1 分 20 秒"],
  [7380, "2 小时 3 分"],
])("formats %i seconds", (seconds, expected) => {
  expect(duration(start, new Date(now + seconds * 1000).toISOString(), now)).toBe(expected);
  expect(duration(start, null, now + seconds * 1000)).toBe(expected);
});
test("missing start has no duration", () => {
  expect(duration(null, null, now)).toBe("—");
});
