import { describe, expect, it } from "vitest";
import { sunAltitude, sunTimes } from "./sun.ts";

const beijing = (iso: string) => new Date(`${iso}+08:00`);
const minutesApart = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 60_000;

describe("Beijing sun", () => {
  it.each([
    ["2026-06-21T12:00", "2026-06-21T04:46", "2026-06-21T19:46"],
    ["2026-12-21T12:00", "2026-12-21T07:33", "2026-12-21T16:53"],
  ])("sunrise and sunset on %s", (day, sunrise, sunset) => {
    const times = sunTimes(beijing(day));
    expect(minutesApart(times.sunrise, beijing(sunrise))).toBeLessThanOrEqual(3);
    expect(minutesApart(times.sunset, beijing(sunset))).toBeLessThanOrEqual(3);
  });

  it("uses the Beijing day even late at night", () => {
    expect(sunTimes(beijing("2026-12-21T23:59")).sunrise.getTime()).toBe(
      sunTimes(beijing("2026-12-21T00:01")).sunrise.getTime(),
    );
  });

  it("altitude crosses the horizon at sunrise", () => {
    const { sunrise } = sunTimes(beijing("2026-06-21T12:00"));
    expect(sunAltitude(sunrise)).toBeCloseTo(-0.833, 0);
    expect(sunAltitude(beijing("2026-06-21T12:10"))).toBeGreaterThan(70);
    expect(sunAltitude(beijing("2026-12-21T00:00"))).toBeLessThan(-60);
  });
});
