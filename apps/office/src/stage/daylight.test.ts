import { describe, expect, it } from "vitest";
import { phase } from "./daylight.ts";

describe("local daylight phase", () => {
  it.each([
    [5, 59, "night"],
    [6, 0, "dusk"],
    [7, 59, "dusk"],
    [8, 0, "day"],
    [17, 59, "day"],
    [18, 0, "dusk"],
    [20, 0, "night"],
    [23, 59, "night"],
  ] as const)("%i:%i is %s", (hour, minute, expected) => {
    expect(phase(new Date(2026, 9, 15, hour, minute))).toBe(expected);
  });
});
