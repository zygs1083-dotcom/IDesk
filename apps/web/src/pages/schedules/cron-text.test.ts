import { expect, test } from "vitest";
import { cronText } from "./cron-text.ts";

test.each([
  ["* * * * *", "每分钟"],
  ["*/5 * * * *", "每 5 分钟"],
  ["15 * * * *", "每小时第 15 分"],
  ["0 9 * * *", "每天 09:00"],
  ["30 8 * * 1", "每周一 08:30"],
  ["0 9 * * 1-5", "工作日 09:00"],
  ["0 9 * * 0", "每周日 09:00"],
  ["0 9 * * 7", "每周日 09:00"],
  ["0 9 15 * *", "每月 15 日 09:00"],
  ["0 9 * 2 *", "0 9 * 2 *"],
  ["0 * * * * *", "0 * * * * *"],
  ["99 9 * * *", "99 9 * * *"],
])("%s → %s", (cron, text) => expect(cronText(cron, "zh")).toBe(text));

test.each([
  ["* * * * *", "Every minute"],
  ["*/5 * * * *", "Every 5 minutes"],
  ["5 * * * *", "Hourly at :05"],
  ["0 9 * * *", "Daily 09:00"],
  ["0 9 * * 1-5", "Weekdays 09:00"],
  ["0 9 * * 1", "Every Monday 09:00"],
  ["0 9 1 * *", "Monthly on day 1 09:00"],
  ["0 9 * 2 *", "0 9 * 2 *"],
])("English %s → %s", (cron, text) => expect(cronText(cron, "en")).toBe(text));
