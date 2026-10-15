import { describe, expect, it } from "vitest";
import { signScale } from "./zone-sign.ts";

describe("zone sign scale", () => {
  it.each([0.25, 0.5, 0.85, 1, 1.5, 2])("keeps text readable at %s", (scale) => {
    expect(signScale(scale)).toBe(Math.max(1, 1 / scale));
    expect(12 * scale * signScale(scale)).toBeGreaterThanOrEqual(12);
  });
});
