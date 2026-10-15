import { expect, test } from "vitest";
import { relativeTime } from "./relative-time.ts";
import { translator } from "./translate.ts";

test.each([
  [0, "刚刚", "Just now"],
  [1, "1 分钟前", "1 minute ago"],
  [25, "25 分钟前", "25 minutes ago"],
  [60, "1 小时前", "1 hour ago"],
  [125, "2 小时前", "2 hours ago"],
])("relative time at %s minutes", (minutes, zh, en) => {
  expect(relativeTime(minutes, "zh", translator("zh"))).toBe(zh);
  expect(relativeTime(minutes, "en", translator("en"))).toBe(en);
});
