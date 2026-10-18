import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clockAngles,
  daylightTime,
  parseBeijingTime,
  weightsForAltitude,
} from "./daylight-time.ts";

afterEach(() => vi.useRealTimers());

describe("solar scene weights", () => {
  it.each([
    [12, { day: 1, dusk: 0, night: 0 }],
    [10, { day: 1, dusk: 0, night: 0 }],
    [5, { day: 0.5, dusk: 0.5, night: 0 }],
    [0, { day: 0, dusk: 1, night: 0 }],
    [-4, { day: 0, dusk: 0.5, night: 0.5 }],
    [-8, { day: 0, dusk: 0, night: 1 }],
    [-12, { day: 0, dusk: 0, night: 1 }],
  ])("at %s degrees", (altitude, expected) => {
    expect(weightsForAltitude(altitude)).toEqual(expected);
  });
});

describe("Beijing scene time", () => {
  it("parses Beijing ISO independently of the host timezone", () => {
    const previous = process.env.TZ;
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Shanghai"]) {
      process.env.TZ = timezone;
      expect(parseBeijingTime("2026-10-18T19:30")?.toISOString()).toBe("2026-10-18T11:30:00.000Z");
    }
    process.env.TZ = previous;
    expect(parseBeijingTime("2026-02-30T19:30")).toBeNull();
  });

  it("fixes time and advances a timelapse from the chosen Beijing instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));
    const fixed = daylightTime("?time=2026-10-18T19:30", Date.now());
    const moving = daylightTime("?time=2026-10-18T19:30&timelapse=60", Date.now());
    vi.advanceTimersByTime(30_000);
    expect(fixed().toISOString()).toBe("2026-10-18T11:30:00.000Z");
    expect(moving().toISOString()).toBe("2026-10-18T12:00:00.000Z");
  });

  it("advances the live instant when only timelapse is provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));
    const moving = daylightTime("?timelapse=10", Date.now());
    vi.advanceTimersByTime(60_000);
    expect(moving().toISOString()).toBe("2026-10-18T10:10:00.000Z");
  });

  it("points the wall clock at Beijing minutes and hours", () => {
    const angles = clockAngles(new Date("2026-10-18T11:30:00Z"));
    expect(angles.minute).toBeCloseTo(Math.PI);
    expect(angles.hour).toBeCloseTo((7.5 * Math.PI) / 6);
  });
});
