import { Cron } from "croner";
import { expect, test } from "vitest";
import { quartzToCron } from "./schedules.ts";

test.each([
  ["0 0 9 ? * 2-6 *", "0 0 9 * * 1-5"],
  ["0 0 9 * * 1,7 *", "0 0 9 * * 0,6"],
  ["0 0 9 * * 1 *", "0 0 9 * * 0"],
  ["0 0 9 ? * MON-FRI *", "0 0 9 * * MON-FRI"],
  ["0 0 9 ? JUL WED *", "0 0 9 * JUL WED"],
  ["0 0 9 * * SUN *", "0 0 9 * * SUN"],
  ["0 0 9 * * * *", "0 0 9 * * *"],
  ["0 0 9 L * ? *", null],
  ["0 0 9 1W * ? *", null],
  ["0 0 9 ? * 2#1 *", null],
  ["0 0 9 ? * */2 *", null],
  ["0 0 9 ? * 1/2 *", null],
  ["0 0 9 * * *", null],
  ["0 0 9 * * * * *", null],
])("converts %s", (input, expected) => {
  expect(quartzToCron(input)).toBe(expected);
});

test("converted Quartz weekdays run Monday through Friday in standard Croner mode", () => {
  const cron = new Cron(quartzToCron("0 0 9 ? * 2-6 *") as string, {
    timezone: "UTC",
    paused: true,
  });
  const dates = cron.nextRuns(6, new Date("2026-10-16T10:00:00Z"));
  expect(dates.map((date) => date.getUTCDay())).toEqual([1, 2, 3, 4, 5, 1]);
});
