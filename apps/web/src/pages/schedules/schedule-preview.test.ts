import { expect, test } from "vitest";
import { formatScheduleTime, schedulePreview } from "./schedule-preview.tsx";

const now = new Date("2026-10-28T00:00:39Z");

test("daily runs use the selected time zone and trim the form input", () => {
  expect(schedulePreview(" 0 9 * * * ", " Asia/Shanghai ", "zh", now)).toEqual({
    times: "10-28 09:00、10-29 09:00、10-30 09:00",
    timezone: "Asia/Shanghai",
  });
  expect(schedulePreview("0 9 * * *", "Asia/Shanghai", "en", now)).toEqual({
    times: "10-28, 09:00; 10-29, 09:00; 10-30, 09:00",
    timezone: "Asia/Shanghai",
  });
});

test("a wildcard minute advances through consecutive minutes", () => {
  expect(schedulePreview("* 9 * * *", "Asia/Shanghai", "zh", now)).toEqual({
    times: "10-28 09:00、10-28 09:01、10-28 09:02",
    timezone: "Asia/Shanghai",
  });
});

test("nonzero seconds make every run include seconds, including the next minute", () => {
  expect(schedulePreview("*/10 * * * * *", "Asia/Shanghai", "zh", now)).toEqual({
    times: "10-28 08:00:40、10-28 08:00:50、10-28 08:01:00",
    timezone: "Asia/Shanghai",
  });
});

test("the shared list format keeps minutes and the existing locale punctuation", () => {
  expect(formatScheduleTime(now, "Asia/Shanghai", "zh")).toBe("10-28 08:00");
  expect(formatScheduleTime(now, "Asia/Shanghai", "en")).toBe("10-28, 08:00");
});

test("an impossible calendar date has no upcoming runs", () => {
  expect(schedulePreview("0 0 31 2 *", "Asia/Shanghai", "zh", now)).toBe("empty");
});

test.each([
  ["bad", "Asia/Shanghai"],
  ["0 9 * * *", "Asia/Shangha"],
])("invalid expression or time zone: %s, %s", (cron, timezone) => {
  expect(schedulePreview(cron, timezone, "zh", now)).toBe("invalid");
});

test.each([
  ["   ", "Asia/Shanghai"],
  ["0 9 * * *", "   "],
])("empty expression or time zone hides the preview: %s, %s", (cron, timezone) => {
  expect(schedulePreview(cron, timezone, "zh", now)).toBeNull();
});
