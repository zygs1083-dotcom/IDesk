import { expect, test } from "vitest";
import { beijingTime } from "./beijing-time.ts";

test("Beijing clock uses Shanghai time regardless of browser zone", () => {
  const before = process.env.TZ;
  process.env.TZ = "America/New_York";
  expect(beijingTime(new Date("2026-06-01T13:34:00Z")).time).toBe("21:34");
  process.env.TZ = before;
});

test("night clock points to the next sunrise", () => {
  const result = beijingTime(new Date("2026-06-01T13:34:00Z"));
  expect(result.event).toBe("sunrise");
  expect(result.sun).toMatch(/^\d{2}:\d{2}$/);
});
