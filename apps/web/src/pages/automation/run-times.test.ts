import { expect, test } from "vitest";
import { runTimes } from "./run-times.ts";

const now = new Date(2026, 9, 15, 12).getTime();
const start = new Date(2026, 9, 15, 9, 5, 3).toISOString();

test("formats today's start and finish with full timestamps in the title", () => {
  expect(runTimes(start, new Date(2026, 9, 15, 9, 7, 10).toISOString(), now)).toEqual({
    text: "09:05:03 → 09:07:10",
    title: "2026-10-15 09:05:03 → 2026-10-15 09:07:10",
  });
});

test("adds a date only to yesterday's start across midnight", () => {
  expect(
    runTimes(
      new Date(2026, 9, 14, 23, 59, 58).toISOString(),
      new Date(2026, 9, 15, 0, 0, 5).toISOString(),
      now,
    ),
  ).toEqual({
    text: "10-14 23:59:58 → 00:00:05",
    title: "2026-10-14 23:59:58 → 2026-10-15 00:00:05",
  });
});

test("adds dates to both timestamps outside today", () => {
  expect(
    runTimes(
      new Date(2026, 9, 12, 9, 5, 3).toISOString(),
      new Date(2026, 9, 13, 9, 7, 10).toISOString(),
      now,
    ),
  ).toEqual({
    text: "10-12 09:05:03 → 10-13 09:07:10",
    title: "2026-10-12 09:05:03 → 2026-10-13 09:07:10",
  });
});

test("shows an unfinished run with an ellipsis", () => {
  expect(runTimes(start, null, now)).toEqual({
    text: "09:05:03 → …",
    title: "2026-10-15 09:05:03 → …",
  });
});

test("has no timestamps without a start", () => {
  expect(runTimes(null, null, now)).toEqual({ text: "—", title: "" });
});

test("pads single-digit month, day, hours, minutes and seconds", () => {
  expect(
    runTimes(
      new Date(2026, 0, 2, 3, 4, 5).toISOString(),
      new Date(2026, 0, 2, 6, 7, 8).toISOString(),
      now,
    ),
  ).toEqual({
    text: "01-02 03:04:05 → 01-02 06:07:08",
    title: "2026-01-02 03:04:05 → 2026-01-02 06:07:08",
  });
});
