import { describe, expect, it } from "vitest";
import { signScale, signWidth } from "./zone-sign.ts";

describe("zone sign scale", () => {
  it.each([0.25, 0.5, 0.85, 1, 1.5, 2])("keeps text readable at %s", (scale) => {
    expect(signScale(scale)).toBe(Math.max(1, 1 / scale));
    expect(12 * scale * signScale(scale)).toBeGreaterThanOrEqual(12);
  });
});

describe("zone sign width", () => {
  it("covers the original wooden plaque and widens for long hosts", () => {
    expect(signWidth(24)).toBe(132);
    expect(signWidth(200)).toBe(212);
    expect(signWidth(80 * signScale(0.5))).toBe(172);
    expect(signWidth(80 * signScale(1))).toBe(132);
  });
});
